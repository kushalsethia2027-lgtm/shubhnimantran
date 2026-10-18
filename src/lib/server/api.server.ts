import { z } from "zod";
import {
  consentText,
  consentVersion,
  guestSchema,
  waitlistSchema,
  weddingSchema,
  type Guest,
  type Wedding,
  type WeddingEvent,
} from "../../features/workspace/domain";
import {
  ApiError,
  authCookies,
  boundedBody,
  config,
  cookies,
  rateLimit,
  requireWedding,
  rpc,
  session,
  storage,
  supa,
} from "./supabase.server";
import { capabilities, elevenLabs, generateScript, verifyTwilio } from "./providers.server";
const uuid = z.string().uuid();
const reply = (data: unknown, status = 200, setCookies: string[] = []) => {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  setCookies.forEach((c) => headers.append("Set-Cookie", c));
  return new Response(JSON.stringify(data), { status, headers });
};
async function body(request: Request) {
  try {
    return JSON.parse(new TextDecoder().decode(await boundedBody(request)));
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(400, "Invalid JSON request.");
  }
}
async function rows<T>(table: string, wid: string, token: string, select = "*") {
  return supa<T[]>(
    `/rest/v1/${table}?wedding_id=eq.${wid}&select=${select}&order=created_at.asc`,
    token,
  );
}
export async function handleApi(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const path = url.pathname.slice("/api/nimantran".length).split("/").filter(Boolean);
    const method = request.method;
    // Cookie-authenticated mutation endpoints require a same-origin browser request.
    const webhook = path[0] === "webhooks";
    if (!["GET", "HEAD"].includes(method) && !webhook) {
      const origin = request.headers.get("origin");
      const expected = process.env["APP_ORIGIN"] ?? url.origin;
      if (!origin || origin !== expected) throw new ApiError(403, "Request origin is not allowed.");
      if (request.headers.get("sec-fetch-site") === "cross-site")
        throw new ApiError(403, "Cross-site requests are blocked.");
    }
    if (path.join("/") === "status" && method === "GET") return reply(capabilities());
    if (path[0] === "auth") {
      if (path[1] === "google-session" && method === "POST") {
        const { refresh_token } = z
          .object({ refresh_token: z.string().min(1).max(8192) })
          .parse(await body(request));
        // Exchange with Supabase; never accept a client-supplied identity or expiry.
        const result = await supa<{
          access_token: string;
          refresh_token: string;
          expires_in: number;
        }>("/auth/v1/token?grant_type=refresh_token", undefined, "POST", { refresh_token });
        await supa("/auth/v1/user", result.access_token);
        return reply(
          {
            ok: true,
            session: { access_token: result.access_token, refresh_token: result.refresh_token },
          },
          200,
          authCookies(request, result.access_token, result.refresh_token, result.expires_in),
        );
      }
      if (path[1] === "request" && method === "POST") {
        const { email } = z
          .object({ email: z.string().trim().email().max(200) })
          .parse(await body(request));
        await rateLimit("otp:global", 100, 900);
        await rateLimit(`otp:${email.toLowerCase()}`, 4, 900);
        await supa("/auth/v1/otp", undefined, "POST", { email, create_user: true });
        return reply({ message: "Check your email for the sign-in code." });
      }
      if (path[1] === "verify" && method === "POST") {
        const { email, code } = z
          .object({ email: z.string().email().max(200), code: z.string().regex(/^\d{6,10}$/) })
          .parse(await body(request));
        await rateLimit("verify:global", 300, 900);
        await rateLimit(`verify:${email.toLowerCase()}`, 8, 900);
        const result = await supa<{
          access_token: string;
          refresh_token: string;
          expires_in: number;
        }>("/auth/v1/verify", undefined, "POST", { email, token: code, type: "email" });
        return reply(
          { ok: true },
          200,
          authCookies(request, result.access_token, result.refresh_token, result.expires_in),
        );
      }
      if (path[1] === "refresh" && method === "POST") {
        const refresh = cookies(request)["nim_refresh"];
        if (!refresh) throw new ApiError(401, "Sign in again.");
        const result = await supa<{
          access_token: string;
          refresh_token: string;
          expires_in: number;
        }>("/auth/v1/token?grant_type=refresh_token", undefined, "POST", {
          refresh_token: refresh,
        });
        return reply(
          { ok: true },
          200,
          authCookies(request, result.access_token, result.refresh_token, result.expires_in),
        );
      }
      if (path[1] === "logout" && method === "POST") {
        const token = cookies(request)["nim_access"];
        if (token) {
          try {
            await supa("/auth/v1/logout?scope=local", token, "POST");
          } catch {
            /* Still clear browser cookies; tokens have bounded lifetime. */
          }
        }
        return reply({ ok: true }, 200, authCookies(request, "", "", 0));
      }
    }
    if (path[0] === "waitlist" && method === "POST") {
      const input = waitlistSchema.parse(await body(request));
      await rateLimit("waitlist:global", 100, 3600);
      await rateLimit(`waitlist:${input.email.toLowerCase()}`, 3, 3600);
      const eligible = await rpc<boolean>("join_waitlist", { payload: input }, undefined, true);
      return reply({ saved: true, eligible }, 201);
    }
    if (webhook && path[1] === "twilio" && method === "POST") {
      const token = process.env["TWILIO_AUTH_TOKEN"];
      const origin = process.env["APP_ORIGIN"];
      if (!token || !origin) throw new ApiError(503, "Webhook integration is not configured.");
      const fields = Object.fromEntries(
        new URLSearchParams(new TextDecoder().decode(await boundedBody(request, 16_000))),
      );
      if (
        !(await verifyTwilio(
          `${origin}${url.pathname}`,
          fields,
          request.headers.get("x-twilio-signature") ?? "",
          token,
        ))
      )
        throw new ApiError(403, "Invalid webhook signature.");
      // Delivery is intentionally not activated until sandbox acceptance. Never invent status.
      throw new ApiError(503, "Delivery webhook processing is not yet activated.");
    }
    const { token, user } = await session(request);
    if (path[0] === "me" && method === "GET") return reply({ id: user.id, email: user.email });
    if (path[0] !== "weddings") throw new ApiError(404, "Endpoint not found.");
    if (!path[1]) {
      if (method === "GET")
        return reply(await supa("/rest/v1/weddings?select=*&order=created_at.desc", token));
      if (method === "POST") {
        await rateLimit(`weddings:${user.id}`, 10, 3600);
        const input = weddingSchema.parse(await body(request));
        const id = await rpc("save_wedding", { payload: input }, token);
        return reply({ id }, 201);
      }
    }
    const wid = uuid.parse(path[1]);
    await requireWedding(wid, token);
    if (path.length === 2) {
      if (method === "PATCH") {
        const input = weddingSchema.parse(await body(request));
        await rpc("save_wedding", { payload: input, wid }, token);
        return reply({ id: wid });
      }
      if (method === "GET") {
        const [weddings, events, guests, assignments, scripts, voices, jobs] = await Promise.all([
          supa<Wedding[]>(`/rest/v1/weddings?id=eq.${wid}&select=*`, token),
          supa<WeddingEvent[]>(
            `/rest/v1/wedding_events?wedding_id=eq.${wid}&select=*&order=date.asc`,
            token,
          ),
          rows<Guest>("guests", wid, token),
          supa<Array<{ guest_id: string; event_id: string }>>(
            `/rest/v1/guest_event_assignments?wedding_id=eq.${wid}&select=guest_id,event_id`,
            token,
          ),
          supa(`/rest/v1/invitation_scripts?wedding_id=eq.${wid}&select=*`, token),
          rows(
            "voice_recordings",
            wid,
            token,
            "id,speaker,relationship,status,duration,consent_status,provider_verified,created_at",
          ),
          rows("jobs", wid, token, "id,guest_id,kind,status,error,created_at,scheduled_at"),
        ]);
        return reply({
          wedding: weddings[0],
          events,
          guests: guests.map((g) => ({
            ...g,
            invited_events: assignments.filter((a) => a.guest_id === g.id).map((a) => a.event_id),
          })),
          scripts,
          voices,
          jobs,
        });
      }
    }
    if (path[2] === "guests") {
      if (method === "POST" && !path[3]) {
        const input = z
          .array(guestSchema)
          .min(1)
          .max(400)
          .parse(await body(request));
        await rpc("save_guests", { wid, items: input }, token);
        return reply({ saved: input.length });
      }
      if (method === "DELETE" && path[3]) {
        await rpc("remove_guest", { wid, gid: uuid.parse(path[3]) }, token);
        return reply({ deleted: true });
      }
    }
    if (path[2] === "scripts" && method === "POST") {
      const input = z
        .object({
          guest_id: uuid,
          body: z.string().trim().min(1).max(4000),
          pronunciation: z.string().trim().max(240),
          action: z.enum(["edited", "approved", "rejected"]),
          sample: z.boolean(),
          revision: z.number().int().min(0),
        })
        .parse(await body(request));
      await rpc(
        "save_script",
        {
          wid,
          gid: input.guest_id,
          wording: input.body,
          phonetics: input.pronunciation,
          action: input.action,
          is_sample: input.sample,
          expected_revision: input.revision,
        },
        token,
      );
      return reply({ saved: true });
    }
    if (path[2] === "generate-script" && method === "POST") {
      const { guest_id, approved } = z
        .object({ guest_id: uuid, approved: z.literal(true) })
        .parse(await body(request));
      await rateLimit(`scripts:${user.id}`, 30, 3600);
      const guests = await supa<Guest[]>(
        `/rest/v1/guests?id=eq.${guest_id}&wedding_id=eq.${wid}&select=*`,
        token,
      );
      const guest = guests[0];
      if (!guest) throw new ApiError(404, "Guest not found.");
      const [weddings, events] = await Promise.all([
        supa<Wedding[]>(`/rest/v1/weddings?id=eq.${wid}&select=bride,groom,tone,notes`, token),
        supa<Array<{ wedding_events: WeddingEvent }>>(
          `/rest/v1/guest_event_assignments?guest_id=eq.${guest_id}&wedding_id=eq.${wid}&select=wedding_events(name,date,venue)`,
          token,
        ),
      ]);
      const savedNotes = await supa<Array<{ pronunciation: string }>>(
        `/rest/v1/invitation_scripts?wedding_id=eq.${wid}&guest_id=eq.${guest_id}&select=pronunciation`,
        token,
      );
      const wording = await generateScript({
        wedding: weddings[0],
        guest: {
          guest_name: guest.guest_name,
          relation: guest.relation,
          language: guest.language,
          pronunciation: savedNotes[0]?.pronunciation ?? guest.pronunciation,
          notes: guest.notes,
        },
        events: events.map((e) => e.wedding_events),
      });
      return reply({ body: wording, source: "anthropic", reviewRequired: true });
    }
    if (path[2] === "voices") {
      if (method === "POST" && !path[3]) {
        await rateLimit(`voice:${user.id}`, 10, 3600);
        const bytes = await boundedBody(request, 13_000_000);
        const form = await new Request(request.url, {
          method: "POST",
          headers: { "Content-Type": request.headers.get("content-type") ?? "" },
          body: bytes,
        }).formData();
        const input = z
          .object({
            speaker: z.string().trim().min(1).max(100),
            relationship: z.enum(["Dadi", "Papa", "Mummy", "Bride", "Groom", "Other"]),
            duration: z.coerce.number().int().min(30).max(60),
            consent: z.literal("true"),
          })
          .parse(Object.fromEntries(form));
        const file = form.get("recording");
        if (!(file instanceof File) || !file.size || file.size > 12_582_912)
          throw new ApiError(400, "Upload a 30–60 second audio recording under 12 MB.");
        const mime = file.type.split(";")[0]!;
        if (!["audio/webm", "audio/ogg", "audio/mp4"].includes(mime))
          throw new ApiError(400, "Unsupported recording type.");
        const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
        if (!(
          (mime === "audio/webm" && header[0] === 0x1a && header[1] === 0x45) ||
          (mime === "audio/ogg" && new TextDecoder().decode(header.slice(0, 4)) === "OggS") ||
          (mime === "audio/mp4" && new TextDecoder().decode(header.slice(4, 8)) === "ftyp")
        ))
          throw new ApiError(400, "Audio file signature does not match its type.");
        const id = crypto.randomUUID();
        const objectPath = `${wid}/${id}`;
        await storage(`object/voices/${objectPath}`, "POST", file, mime);
        try {
          await rpc(
            "register_voice",
            {
              wid,
              vid: id,
              speaker_name: input.speaker,
              speaker_relation: input.relationship,
              object_path: objectPath,
              media_type: mime,
              seconds: input.duration,
            },
            token,
          );
        } catch (e) {
          try {
            await storage(
              "object/voices",
              "DELETE",
              JSON.stringify({ prefixes: [objectPath] }),
              "application/json",
            );
          } catch {
            console.error(
              JSON.stringify({ event: "voice.orphan_cleanup_required", recording_id: id }),
            );
          }
          throw e;
        }
        return reply({ id, consent: "active", providerVerified: false }, 201);
      }
      const vid = uuid.parse(path[3]);
      const recordings = await supa<
        Array<{
          id: string;
          storage_path: string;
          provider_voice_id: string | null;
          status: string;
        }>
      >(
        `/rest/v1/voice_recordings?wedding_id=eq.${wid}&id=eq.${vid}&select=id,storage_path,provider_voice_id,status`,
        token,
      );
      const recording = recordings[0];
      if (!recording) throw new ApiError(404, "Voice not found.");
      if (method === "GET") {
        if (recording.status !== "stored")
          throw new ApiError(409, "This voice is no longer available.");
        const signed = (await storage(
          `object/sign/voices/${recording.storage_path}`,
          "POST",
          JSON.stringify({ expiresIn: 120 }),
          "application/json",
        )) as { signedURL: string };
        return reply({ url: `${config().url}/storage/v1${signed.signedURL}` });
      }
      if (method === "DELETE") {
        const deletionId = await rpc<string>(
          "revoke_voice",
          { wid, vid, consent_copy: consentText, consent_version: consentVersion },
          token,
        );
        try {
          await storage(
            "object/voices",
            "DELETE",
            JSON.stringify({ prefixes: [recording.storage_path] }),
            "application/json",
          );
          if (recording.provider_voice_id)
            await elevenLabs.deleteVoice(recording.provider_voice_id);
          // Rendered assets need provider-side removal and expiring URL verification.
          const assets = await supa<unknown[]>(
            `/rest/v1/jobs?wedding_id=eq.${wid}&voice_id=eq.${vid}&select=id`,
            undefined,
            "GET",
            undefined,
            true,
          );
          if (assets.length)
            throw new ApiError(
              409,
              "Recording access is revoked. Derived/provider asset deletion requires operator confirmation.",
            );
          await supa(
            `/rest/v1/voice_recordings?id=eq.${vid}`,
            undefined,
            "PATCH",
            { status: "deleted", provider_voice_id: null },
            true,
          );
          await supa(
            `/rest/v1/deletion_requests?id=eq.${deletionId}`,
            undefined,
            "PATCH",
            { status: "completed", completed_at: new Date().toISOString() },
            true,
          );
          await supa(
            "/rest/v1/audit_events",
            undefined,
            "POST",
            {
              wedding_id: wid,
              actor_id: user.id,
              action: "voice.deletion_confirmed",
              entity_id: vid,
            },
            true,
          );
          return reply({
            deleted: true,
            message:
              "Stored recording and any registered provider voice have been deleted. Minimal consent audit history is retained.",
          });
        } catch (e) {
          await supa(
            `/rest/v1/voice_recordings?id=eq.${vid}`,
            undefined,
            "PATCH",
            { status: "deletion_failed" },
            true,
          );
          await supa(
            `/rest/v1/deletion_requests?id=eq.${deletionId}`,
            undefined,
            "PATCH",
            { status: "failed", error: (e as Error).message },
            true,
          );
          return reply(
            {
              deleted: false,
              message:
                "Consent is revoked and new use is blocked. Deletion is not fully confirmed; retry or contact support.",
            },
            202,
          );
        }
      }
    }
    if (path[2] === "jobs" && path[3] && method === "DELETE") {
      await rpc("cancel_job", { wid, jid: uuid.parse(path[3]) }, token);
      return reply({ cancelled: true });
    }
    if (["production", "delivery", "review-links"].includes(path[2] ?? "") && method === "POST")
      throw new ApiError(
        503,
        "Unavailable: provider verification, sandbox acceptance and the production worker must be configured before this operation can be enabled. No media or messages were created.",
      );
    throw new ApiError(404, "Endpoint not found.");
  } catch (error) {
    if (error instanceof z.ZodError)
      return reply(
        { error: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") },
        400,
      );
    if (error instanceof ApiError) return reply({ error: error.message }, error.status);
    console.error(
      JSON.stringify({ event: "api.error", type: error instanceof Error ? error.name : "unknown" }),
    );
    return reply(
      { error: "Something went wrong. Reload to check saved progress before retrying." },
      500,
    );
  }
}
