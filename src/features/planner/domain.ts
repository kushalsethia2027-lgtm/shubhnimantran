import { z } from "zod";
export const rsvp = z.enum(["pending", "confirmed", "declined"]);
const short = (max = 160) => z.string().trim().max(max);
export const familyInput = z.object({
  side: z.enum(["bride", "groom"]),
  family_name: short(120).min(1, "Family name is required"),
  contact_name: short(120),
  contact_phone: short(30),
  rsvp_status: rsvp,
  accommodation_required: z.boolean(),
  notes: short(2000),
});
export const memberInput = z.object({
  full_name: short(120).min(1, "Member name is required"),
  category: z.enum(["adult", "child"]),
  rsvp_status: rsvp,
});
const timestamp = z.string().datetime({ offset: true }).nullable();
export const travelInput = z
  .object({
    transport_mode: z.enum(["flight", "train", "bus", "car", "other"]),
    origin: short(),
    destination: short(),
    operator_name: short(120),
    transport_number: short(80),
    arrival_datetime: timestamp,
    departure_datetime: timestamp,
    terminal_or_station: short(),
    passenger_count: z.number().int().min(1).max(1000),
    luggage_count: z.number().int().min(0).max(1000),
    pickup_required: z.boolean(),
    notes: short(2000),
  })
  .refine(
    (v) =>
      !v.arrival_datetime || !v.departure_datetime || v.departure_datetime >= v.arrival_datetime,
    {
      message:
        "Departure must be on or after arrival (departure means leaving the wedding destination).",
    },
  );
export const assignmentInput = z
  .object({
    travel_group_id: z.string().uuid().nullable(),
    assignment_type: z.enum(["pickup", "accommodation"]),
    status: z.enum(["needed", "assigned", "completed"]),
    vehicle: short(120),
    driver_name: short(120),
    driver_phone: short(30),
    pickup_datetime: timestamp,
    hotel_name: short(),
    check_in: z.string().date().nullable(),
    check_out: z.string().date().nullable(),
    room_count: z.number().int().min(0).max(1000),
    notes: short(2000),
  })
  .superRefine((v, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: "custom", message });
    if (v.assignment_type === "pickup" && !v.travel_group_id)
      issue("Choose a travel group for pickup.");
    if (v.check_in && v.check_out && v.check_out < v.check_in)
      issue("Check-out must be on or after check-in.");
    if (v.status !== "needed") {
      if (v.assignment_type === "pickup" && (!v.vehicle || !v.driver_name || !v.pickup_datetime))
        issue("Assigned pickups need a vehicle, driver and pickup time.");
      if (
        v.assignment_type === "accommodation" &&
        (!v.hotel_name || !v.check_in || !v.check_out || v.room_count < 1)
      )
        issue("Assigned accommodation needs a hotel, dates and room count.");
    }
  });
export type Role = "owner" | "bride_planner" | "groom_planner";
export type Side = "bride" | "groom";
export type Workspace = {
  id: string;
  name: string;
  wedding_date: string;
  venue: string;
  role: Role;
};
export type Base = {
  id: string;
  wedding_id: string;
  created_at: string;
  updated_at: string;
  revision: number;
};
export type Family = Base & z.infer<typeof familyInput>;
export type Member = Base & z.infer<typeof memberInput> & { family_id: string };
export type Travel = Base & z.infer<typeof travelInput> & { family_id: string };
export type Assignment = Base & z.infer<typeof assignmentInput>;
export type Membership = { wedding_id: string; user_id: string; role: Role; created_at: string };
export type Invitation = {
  id: string;
  email: string;
  role: Role;
  expires_at: string;
  accepted_at: string | null;
};
export type Snapshot = {
  families: Family[];
  members: Member[];
  travels: Travel[];
  assignments: Assignment[];
  memberships: Membership[];
  invitations: Invitation[];
};
export const emptySnapshot = (): Snapshot => ({
  families: [],
  members: [],
  travels: [],
  assignments: [],
  memberships: [],
  invitations: [],
});
export type Filters = {
  side: "all" | Side;
  date: string;
  mode: string;
  pickup: string;
  search: string;
};
export const emptyFilters: Filters = {
  side: "all",
  date: "",
  mode: "all",
  pickup: "all",
  search: "",
};
export function writable(role: Role, side: Side) {
  return role === "owner" || role === `${side}_planner`;
}
export function localDay(value: string): string {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function filteredFamilies(data: Snapshot, filters: Filters): Family[] {
  const search = filters.search.trim().toLocaleLowerCase();
  return data.families.filter(
    (f) =>
      (filters.side === "all" || f.side === filters.side) &&
      (!search ||
        [
          f.family_name,
          f.contact_name,
          ...data.members.filter((m) => m.family_id === f.id).map((m) => m.full_name),
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(search)),
  );
}
export function pickupStatus(data: Snapshot, travel: Travel): string {
  if (!travel.pickup_required) return "not_needed";
  return (
    data.assignments.find((a) => a.travel_group_id === travel.id && a.assignment_type === "pickup")
      ?.status ?? "needed"
  );
}
export function filteredTravel(data: Snapshot, filters: Filters): Travel[] {
  const ids = new Set(filteredFamilies(data, filters).map((f) => f.id));
  return data.travels
    .filter(
      (t) =>
        ids.has(t.family_id) &&
        (!filters.date ||
          [t.arrival_datetime, t.departure_datetime].some(
            (d) => d && localDay(d) === filters.date,
          )) &&
        (filters.mode === "all" || t.transport_mode === filters.mode) &&
        (filters.pickup === "all" || pickupStatus(data, t) === filters.pickup),
    )
    .sort((a, b) =>
      (a.arrival_datetime ?? a.departure_datetime ?? "9999").localeCompare(
        b.arrival_datetime ?? b.departure_datetime ?? "9999",
      ),
    );
}
export function metrics(
  data: Snapshot,
  filters: Filters,
  today = localDay(new Date().toISOString()),
) {
  const families = filteredFamilies(data, filters);
  const ids = new Set(families.map((f) => f.id));
  const members = data.members.filter((m) => ids.has(m.family_id));
  const travels = filteredTravel(data, filters);
  const selectedDay = filters.date || today;
  const confirmed = members.filter((m) => m.rsvp_status === "confirmed");
  const accommodation = new Set(families.filter((f) => f.accommodation_required).map((f) => f.id));
  const assignments = visibleAssignments(data, filters);
  return {
    brideFamilies: families.filter((f) => f.side === "bride").length,
    groomFamilies: families.filter((f) => f.side === "groom").length,
    invited: members.length,
    confirmed: confirmed.length,
    pending: members.filter((m) => m.rsvp_status === "pending").length,
    declined: members.filter((m) => m.rsvp_status === "declined").length,
    arrivals: travels.filter(
      (t) => t.arrival_datetime && localDay(t.arrival_datetime) === selectedDay,
    ).length,
    pickupNeeded: travels.filter((t) => t.pickup_required && pickupStatus(data, t) !== "completed")
      .length,
    pickupUnassigned: travels.filter((t) => pickupStatus(data, t) === "needed").length,
    accommodationGuests: confirmed.filter((m) => accommodation.has(m.family_id)).length,
    assignedRooms: assignments
      .filter(
        (a) =>
          a.assignment_type === "accommodation" &&
          a.status !== "needed" &&
          (!filters.date ||
            (!!a.check_in &&
              !!a.check_out &&
              a.check_in <= filters.date &&
              a.check_out >= filters.date)),
      )
      .reduce((n, a) => n + a.room_count, 0),
    passengers: travels.reduce((n, t) => n + t.passenger_count, 0),
  };
}
export function missingTravel(t: Travel): string[] {
  return [
    !t.origin && "origin",
    !t.destination && "destination",
    !t.arrival_datetime && "arrival time",
    !t.departure_datetime && "departure time",
    !t.terminal_or_station && "terminal/station",
    ["flight", "train"].includes(t.transport_mode) && !t.transport_number && "flight/train number",
  ].filter((v): v is string => !!v);
}
export function toCsv(rows: Record<string, unknown>[], columns: string[]) {
  const cell = (value: unknown) => {
    const text = String(value ?? "");
    return '"' + (/^[\s]*[=+@-]/.test(text) ? "'" + text : text).replaceAll('"', '""') + '"';
  };
  return (
    "\uFEFF" +
    [columns, ...rows.map((r) => columns.map((c) => r[c]))]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}

export function visibleAssignments(data: Snapshot, filters: Filters): Assignment[] {
  const tids = new Set(filteredTravel(data, { ...filters, date: "" }).map((t) => t.id));
  return data.assignments.filter((a) => {
    if (a.travel_group_id && !tids.has(a.travel_group_id)) return false;
    if (
      !a.travel_group_id &&
      (filters.side !== "all" ||
        filters.search ||
        filters.mode !== "all" ||
        filters.pickup !== "all")
    )
      return false;
    if (filters.date) {
      if (a.assignment_type === "pickup")
        return !!a.pickup_datetime && localDay(a.pickup_datetime) === filters.date;
      return (
        !!a.check_in && !!a.check_out && a.check_in <= filters.date && a.check_out >= filters.date
      );
    }
    return true;
  });
}
