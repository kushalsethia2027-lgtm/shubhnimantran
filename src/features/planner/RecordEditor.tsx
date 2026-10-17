import { useState } from "react";
import type { Base, Family, Travel } from "./domain";
import { assignmentInput, familyInput, memberInput, travelInput } from "./domain";
import { saveRow, readableError, type PlannerTable } from "./backend";
export type EditorKind = "family" | "member" | "travel" | "assignment";
export type EditorTarget = {
  kind: EditorKind;
  row?: Base;
  familyId?: string;
  travelId?: string;
  assignmentType?: string;
};
type Field = {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  required?: boolean;
  min?: number;
  max?: number;
};
const status = ["pending", "confirmed", "declined"];
const fields: Record<EditorKind, Field[]> = {
  family: [
    { key: "side", label: "Family side", options: ["bride", "groom"] },
    { key: "family_name", label: "Family name", required: true, max: 120 },
    { key: "contact_name", label: "Contact name", max: 120 },
    { key: "contact_phone", label: "Contact phone", type: "tel", max: 30 },
    { key: "rsvp_status", label: "Family RSVP note", options: status },
    { key: "accommodation_required", label: "This family needs accommodation", type: "checkbox" },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
  member: [
    { key: "full_name", label: "Full name", required: true, max: 120 },
    { key: "category", label: "Category", options: ["adult", "child"] },
    { key: "rsvp_status", label: "Member RSVP status", options: status },
  ],
  travel: [
    {
      key: "transport_mode",
      label: "Transport mode",
      options: ["flight", "train", "bus", "car", "other"],
    },
    { key: "origin", label: "Origin" },
    { key: "destination", label: "Destination" },
    { key: "operator_name", label: "Airline / train / bus operator", max: 120 },
    { key: "transport_number", label: "Flight / train / bus number", max: 80 },
    { key: "arrival_datetime", label: "Arrival at wedding destination", type: "datetime-local" },
    {
      key: "departure_datetime",
      label: "Departure from wedding destination",
      type: "datetime-local",
    },
    { key: "terminal_or_station", label: "Terminal / station" },
    {
      key: "passenger_count",
      label: "Passengers in this travel group",
      type: "number",
      required: true,
      min: 1,
      max: 1000,
    },
    {
      key: "luggage_count",
      label: "Luggage pieces",
      type: "number",
      required: true,
      min: 0,
      max: 1000,
    },
    { key: "pickup_required", label: "Pickup required", type: "checkbox" },
    { key: "notes", label: "Travel notes", type: "textarea" },
  ],
  assignment: [
    { key: "assignment_type", label: "Assignment type", options: ["pickup", "accommodation"] },
    { key: "status", label: "Assignment status", options: ["needed", "assigned", "completed"] },
    { key: "vehicle", label: "Vehicle", max: 120 },
    { key: "driver_name", label: "Driver name", max: 120 },
    { key: "driver_phone", label: "Driver phone", type: "tel", max: 30 },
    { key: "pickup_datetime", label: "Pickup time", type: "datetime-local" },
    { key: "hotel_name", label: "Hotel name" },
    { key: "check_in", label: "Check-in", type: "date" },
    { key: "check_out", label: "Check-out", type: "date" },
    { key: "room_count", label: "Rooms", type: "number", required: true, min: 0, max: 1000 },
    { key: "notes", label: "Assignment notes", type: "textarea" },
  ],
};
const tables: Record<EditorKind, PlannerTable> = {
  family: "families",
  member: "family_members",
  travel: "travel_groups",
  assignment: "logistics_assignments",
};
function localInput(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export function RecordEditor({
  target,
  wid,
  families,
  travels,
  defaultSide,
  onSaved,
  onCancel,
}: {
  target: EditorTarget;
  wid: string;
  families: Family[];
  travels: Travel[];
  defaultSide: string;
  onSaved: () => Promise<void>;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const row = (target.row ?? {}) as unknown as Record<string, unknown>;
  const [assignmentType, setAssignmentType] = useState(
    String(row["assignment_type"] ?? target.assignmentType ?? "pickup"),
  );
  const familyId = String(row["family_id"] ?? target.familyId ?? "");
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <form
      className="workspace-card workspace-form space-y-5 border-gold"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        const form = new FormData(event.currentTarget);
        const values: Record<string, unknown> = {};
        for (const field of fields[target.kind]) {
          // Read immutable select values from the original row because disabled fields are not submitted.
          let value = String(form.get(field.key) ?? row[field.key] ?? "");
          if (field.key === "assignment_type") value = assignmentType;
          if (field.type === "checkbox") values[field.key] = form.has(field.key);
          else if (field.type === "number") values[field.key] = Number(value);
          else if (field.type === "datetime-local")
            values[field.key] = value ? new Date(value).toISOString() : null;
          else if (field.type === "date") values[field.key] = value || null;
          else values[field.key] = value;
        }
        if (target.kind === "assignment")
          values["travel_group_id"] =
            String(form.get("travel_group_id") ?? row["travel_group_id"] ?? "") || null;
        const schema = {
          family: familyInput,
          member: memberInput,
          travel: travelInput,
          assignment: assignmentInput,
        }[target.kind];
        const parsed = schema.safeParse(values);
        if (!parsed.success) {
          setError(parsed.error.issues.map((i) => i.message).join(" "));
          return;
        }
        const body: Record<string, unknown> = { ...parsed.data };
        if (target.kind === "member" || target.kind === "travel") {
          const parent = familyId || String(form.get("family_id") ?? "");
          if (!families.some((f) => f.id === parent)) {
            setError("Choose a family you are allowed to edit.");
            return;
          }
          body["family_id"] = parent;
        }
        setBusy(true);
        try {
          await saveRow(tables[target.kind], wid, body, target.row);
          await onSaved();
        } catch (e) {
          setError(readableError(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="text-2xl text-maroon">
        {target.row ? "Edit" : "Add"}{" "}
        {target.kind === "assignment"
          ? "logistics assignment"
          : target.kind === "travel"
            ? "travel group"
            : target.kind}
      </h2>
      <p className="text-xs text-muted-foreground">
        Times use {timezone}. A departure is when guests leave the wedding destination. Guest totals
        come from individual members, not travel passenger counts.
      </p>
      {(target.kind === "member" || target.kind === "travel") && (
        <label>
          Family
          <select name="family_id" required defaultValue={familyId} disabled={!!familyId || busy}>
            <option value="">Choose family</option>
            {families.map((f) => (
              <option key={f.id} value={f.id}>
                {f.family_name} · {f.side}
              </option>
            ))}
          </select>
        </label>
      )}
      {target.kind === "assignment" && (
        <label>
          Related travel group
          <select
            name="travel_group_id"
            disabled={!!target.row || busy}
            defaultValue={String(row["travel_group_id"] ?? target.travelId ?? "")}
          >
            <option value="">Wedding-wide accommodation (no travel group)</option>
            {travels.map((t) => (
              <option key={t.id} value={t.id}>
                {families.find((f) => f.id === t.family_id)?.family_name ?? "Family"} ·{" "}
                {t.transport_mode} ·{" "}
                {t.arrival_datetime
                  ? new Date(t.arrival_datetime).toLocaleString()
                  : "arrival unknown"}
              </option>
            ))}
          </select>
        </label>
      )}
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        {fields[target.kind]
          .filter(
            (f) =>
              target.kind !== "assignment" ||
              ["assignment_type", "status", "notes"].includes(f.key) ||
              (assignmentType === "pickup"
                ? ["vehicle", "driver_name", "driver_phone", "pickup_datetime"].includes(f.key)
                : ["hotel_name", "check_in", "check_out", "room_count"].includes(f.key)),
          )
          .map((field) => {
            const value =
              row[field.key] ??
              (field.key === "side"
                ? defaultSide
                : field.key === "passenger_count"
                  ? 1
                  : field.type === "number"
                    ? 0
                    : field.key === "assignment_type"
                      ? assignmentType
                      : (field.options?.[0] ?? ""));
            return (
              <label
                key={field.key}
                className={
                  field.type === "checkbox"
                    ? "check"
                    : field.type === "textarea"
                      ? "sm:col-span-2"
                      : ""
                }
              >
                {field.type === "checkbox" ? (
                  <>
                    <input
                      type="checkbox"
                      aria-label={field.label}
                      name={field.key}
                      defaultChecked={!!row[field.key]}
                    />
                    {field.label}
                  </>
                ) : (
                  <>
                    {field.label}
                    {field.options ? (
                      <select
                        aria-label={field.label}
                        name={field.key}
                        defaultValue={String(value)}
                        disabled={!!target.row && ["side", "assignment_type"].includes(field.key)}
                        onChange={
                          field.key === "assignment_type"
                            ? (e) => setAssignmentType(e.target.value)
                            : undefined
                        }
                      >
                        {field.options.map((o) => (
                          <option key={o} value={o}>
                            {o.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "textarea" ? (
                      <textarea
                        rows={3}
                        aria-label={field.label}
                        name={field.key}
                        maxLength={2000}
                        defaultValue={String(value)}
                      />
                    ) : (
                      <input
                        aria-label={field.label}
                        name={field.key}
                        type={field.type ?? "text"}
                        required={field.required ?? false}
                        min={field.type === "number" ? field.min : undefined}
                        max={field.type === "number" ? field.max : undefined}
                        maxLength={field.type === "number" ? undefined : (field.max ?? 160)}
                        defaultValue={
                          field.type === "datetime-local" ? localInput(value) : String(value)
                        }
                      />
                    )}
                  </>
                )}
              </label>
            );
          })}
      </fieldset>
      {target.kind === "assignment" && (
        <p className="text-xs text-muted-foreground">
          Choose “needed” while details are incomplete. Assigned pickups require vehicle, driver and
          time. Assigned accommodation requires hotel, dates and at least one room. Nothing is
          auto-assigned.
        </p>
      )}
      {target.kind === "family" && (
        <p className="text-xs text-muted-foreground">
          The family RSVP is a coordination note. Set each person’s RSVP separately for accurate
          totals.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button className="workspace-primary" disabled={busy}>
          {busy ? "Saving to database…" : "Save " + target.kind}
        </button>
        <button type="button" className="workspace-secondary" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
