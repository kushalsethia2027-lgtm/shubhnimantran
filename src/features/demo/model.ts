import { z } from "zod";
import { parseCsv } from "../workspace/domain";
export const demoEventSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(60),
  date: z.string().date(),
  venue: z.string().trim().min(1).max(160),
});
export const demoGuestSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  relation: z.string().trim().min(1).max(80),
  language: z.enum(["Hindi", "Hinglish"]),
  events: z.array(z.string()).min(1),
  phonetics: z.string().max(160).default(""),
  script: z.string().max(1200).default(""),
  approved: z.boolean().default(false),
});
export const demoSchema = z.object({
  version: z.literal(1),
  bride: z.string().trim().min(1).max(80),
  groom: z.string().trim().min(1).max(80),
  city: z.string().trim().min(1).max(80),
  events: z.array(demoEventSchema).min(1).max(6),
  guests: z.array(demoGuestSchema).max(50),
  template: z.enum(["maroon", "floral", "royal", "minimal"]),
});
export type DemoData = z.infer<typeof demoSchema>;
export type DemoGuest = z.infer<typeof demoGuestSchema>;
export const storageKey = "nimantran-browser-demo-v1";
export function exampleData(): DemoData {
  return {
    version: 1,
    bride: "Meera",
    groom: "Aarav",
    city: "Jaipur",
    template: "maroon",
    events: [
      { id: "wedding", name: "Wedding", date: "2027-02-10", venue: "Gulab Bagh, Jaipur" },
      { id: "mehndi", name: "Mehndi", date: "2027-02-09", venue: "Family courtyard, Jaipur" },
    ],
    guests: [
      {
        id: "mama",
        name: "Rajesh",
        relation: "Mama ji",
        language: "Hinglish",
        events: ["wedding"],
        phonetics: "Raa-jesh",
        script: "",
        approved: false,
      },
      {
        id: "mausi",
        name: "Sunita",
        relation: "Mausi ji",
        language: "Hindi",
        events: ["mehndi", "wedding"],
        phonetics: "",
        script: "",
        approved: false,
      },
      {
        id: "friend",
        name: "Rohan",
        relation: "College friend",
        language: "Hinglish",
        events: ["wedding"],
        phonetics: "",
        script: "",
        approved: false,
      },
    ],
  };
}
export function buildInvitation(data: DemoData, guest: DemoGuest): string {
  const events = data.events.filter((e) => guest.events.includes(e.id));
  if (!events.length) throw new Error("Select an existing event for this guest.");
  const facts = events.map((e) => `${e.name}: ${e.date}, ${e.venue}`).join("; ");
  return guest.language === "Hindi"
    ? `नमस्ते ${guest.name} ${guest.relation}! ${data.bride} और ${data.groom} की शादी की खुशी में आपका सादर निमंत्रण है। आपके लिए निमंत्रित कार्यक्रम: ${facts}। आपका साथ और आशीर्वाद हमारे लिए बहुत खास है। कृपया ज़रूर आइए।`
    : `Namaste ${guest.name} ${guest.relation}! ${data.bride} aur ${data.groom} ki shaadi ki khushi mein aapka dil se swagat hai. Aapke liye nimantrit events: ${facts}. Aapka saath aur aashirwad hamare liye bahut khaas hai. Zaroor aaiyega!`;
}
export function invalidateApprovals(data: DemoData): DemoData {
  return { ...data, guests: data.guests.map((g) => ({ ...g, script: "", approved: false })) };
}
export function representatives(guests: DemoGuest[]): DemoGuest[] {
  const seen = new Set<string>();
  return guests
    .filter((g) => {
      const k = g.relation.trim().toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 3);
}
export function canRender(
  data: DemoData,
  guestId: string,
  audioReady: boolean,
  consent: boolean,
): string | null {
  const valid = demoSchema.safeParse(data);
  if (!valid.success) return "Complete the wedding details and guest information first.";
  const guest = data.guests.find((g) => g.id === guestId);
  if (!guest) return "Choose a guest.";
  if (guest.events.some((id) => !data.events.some((e) => e.id === id)))
    return "This guest has an event that no longer exists. Update their events first.";
  const samples = representatives(data.guests);
  if (samples.length < 3 || samples.some((g) => !g.approved || !g.script.trim()))
    return "Review and approve scripts from three different relationship groups first.";
  if (!guest.approved || !guest.script.trim())
    return "Approve this guest’s script before rendering.";
  if (!audioReady)
    return "Record your voice, upload audio, or select the clearly labelled example narration.";
  if (!consent) return "Confirm permission to use this audio before rendering.";
  return null;
}
export function importDemoCsv(
  input: string,
  data: DemoData,
): { line: number; guest: DemoGuest | null; errors: string[] }[] {
  const [header, ...rows] = parseCsv(input);
  const required = ["guest_name", "relation", "language", "invited_events"];
  if (
    !header ||
    required.some((k) => !header.includes(k)) ||
    new Set(header).size !== header.length
  )
    throw new Error(
      "Use columns: guest_name,relation,language,invited_events. Separate event names with |.",
    );
  if (rows.length > 50) throw new Error("The browser demo supports 50 guests.");
  const seen = new Set(
    data.guests.map((g) => `${g.name.toLowerCase()}|${g.relation.toLowerCase()}`),
  );
  return rows.map((row, i) => {
    const r = Object.fromEntries(header.map((h, j) => [h, row[j] ?? ""]));
    const errors: string[] = [];
    if (row.length !== header.length) errors.push("Column count does not match header.");
    const names = (r["invited_events"] ?? "")
      .split("|")
      .map((v) => v.trim())
      .filter(Boolean);
    const ids = names.map(
      (name) => data.events.find((e) => e.name.toLowerCase() === name.toLowerCase())?.id,
    );
    if (ids.some((id) => !id) || new Set(ids).size !== ids.length)
      errors.push("Unknown or repeated event name.");
    const result = demoGuestSchema.safeParse({
      id: `import-${i}`,
      name: r["guest_name"],
      relation: r["relation"],
      language: r["language"],
      events: ids.filter(Boolean),
    });
    if (!result.success)
      errors.push(...result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`));
    if (result.success) {
      const key = `${result.data.name.toLowerCase()}|${result.data.relation.toLowerCase()}`;
      if (seen.has(key)) errors.push("Duplicate guest and relation.");
      seen.add(key);
    }
    return { line: i + 2, guest: result.success ? result.data : null, errors };
  });
}
