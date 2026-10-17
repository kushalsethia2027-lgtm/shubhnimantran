import { describe, test, expect } from "bun:test";
import {
  assignmentInput,
  travelInput,
  metrics,
  emptySnapshot,
  emptyFilters,
  filteredTravel,
  filteredFamilies,
  toCsv,
  writable,
  missingTravel,
  visibleAssignments,
  type Family,
  type Member,
  type Travel,
  type Assignment,
} from "../src/features/planner/domain";
const wid = "10000000-0000-4000-8000-000000000001";
const base = {
  id: "20000000-0000-4000-8000-000000000001",
  wedding_id: wid,
  revision: 1,
  created_at: "2026-10-17T00:00:00Z",
  updated_at: "2026-10-17T00:00:00Z",
};
function fixture() {
  const data = emptySnapshot();
  data.families = [
    {
      ...base,
      side: "bride",
      family_name: "Sethia",
      contact_name: "Contact",
      contact_phone: "+919999999999",
      rsvp_status: "confirmed",
      accommodation_required: true,
      notes: "",
    } as Family,
    {
      ...base,
      id: "20000000-0000-4000-8000-000000000002",
      side: "groom",
      family_name: "Jain",
      rsvp_status: "pending",
      accommodation_required: false,
      contact_name: "",
      contact_phone: "",
      notes: "",
    } as Family,
  ];
  data.members = [
    {
      ...base,
      id: "m1",
      family_id: base.id,
      full_name: "Asha",
      category: "adult",
      rsvp_status: "confirmed",
    },
    {
      ...base,
      id: "m2",
      family_id: base.id,
      full_name: "Dev",
      category: "child",
      rsvp_status: "pending",
    },
    {
      ...base,
      id: "m3",
      family_id: data.families[1]!.id,
      full_name: "Raj",
      category: "adult",
      rsvp_status: "declined",
    },
  ] as Member[];
  data.travels = [
    {
      ...base,
      id: "t1",
      family_id: base.id,
      transport_mode: "train",
      origin: "Delhi",
      destination: "Jaipur",
      operator_name: "Rail",
      transport_number: "123",
      arrival_datetime: "2027-02-09T10:00:00Z",
      departure_datetime: "2027-02-11T10:00:00Z",
      terminal_or_station: "Jaipur",
      passenger_count: 7,
      luggage_count: 2,
      pickup_required: true,
      notes: "",
    },
    {
      ...base,
      id: "t2",
      family_id: base.id,
      transport_mode: "flight",
      origin: "Mumbai",
      destination: "Jaipur",
      operator_name: "Air",
      transport_number: "ABC",
      arrival_datetime: "2027-02-09T12:00:00Z",
      departure_datetime: null,
      terminal_or_station: "T1",
      passenger_count: 3,
      luggage_count: 1,
      pickup_required: true,
      notes: "",
    },
  ] as Travel[];
  return data;
}
describe("Guest & Travel Planner domain", () => {
  test("counts each member once, ignoring family RSVP and repeated travel passengers", () => {
    const result = metrics(fixture(), emptyFilters, "2027-02-09");
    expect(result.invited).toBe(3);
    expect(result.confirmed).toBe(1);
    expect(result.pending).toBe(1);
    expect(result.declined).toBe(1);
    expect(result.passengers).toBe(10);
    expect(result.accommodationGuests).toBe(1);
    expect(result.arrivals).toBe(2);
    expect(result.pickupUnassigned).toBe(2);
  });
  test("shared pickup assignment changes outstanding count without altering guest counts", () => {
    const data = fixture();
    data.assignments = [
      {
        ...base,
        travel_group_id: "t1",
        assignment_type: "pickup",
        status: "completed",
      } as Assignment,
    ];
    const result = metrics(data, emptyFilters, "2027-02-09");
    expect(result.pickupNeeded).toBe(1);
    expect(result.pickupUnassigned).toBe(1);
    expect(result.invited).toBe(3);
  });
  test("family side and member-name searches filter without mixing weddings", () => {
    const data = fixture();
    expect(filteredFamilies(data, { ...emptyFilters, side: "groom" })).toHaveLength(1);
    expect(metrics(data, { ...emptyFilters, side: "groom" }).confirmed).toBe(0);
    expect(filteredFamilies(data, { ...emptyFilters, search: "asha" })[0]?.family_name).toBe(
      "Sethia",
    );
  });
  test("filters multiple groups by departure date, mode and pickup", () => {
    const data = fixture();
    expect(filteredTravel(data, { ...emptyFilters, date: "2027-02-11" }).map((t) => t.id)).toEqual([
      "t1",
    ]);
    expect(filteredTravel(data, { ...emptyFilters, mode: "flight" }).map((t) => t.id)).toEqual([
      "t2",
    ]);
    expect(filteredTravel(data, { ...emptyFilters, pickup: "not_needed" })).toHaveLength(0);
    expect(missingTravel(data.travels[1]!)).toContain("departure time");
  });
  test("hotel stays remain visible between arrival and departure dates", () => {
    const data = fixture();
    data.assignments = [
      {
        ...base,
        travel_group_id: "t1",
        assignment_type: "accommodation",
        status: "assigned",
        hotel_name: "Hotel",
        check_in: "2027-02-09",
        check_out: "2027-02-11",
        room_count: 2,
      } as Assignment,
    ];
    const filters = { ...emptyFilters, date: "2027-02-10" };
    expect(filteredTravel(data, filters)).toHaveLength(0);
    expect(visibleAssignments(data, filters)).toHaveLength(1);
    expect(metrics(data, filters).assignedRooms).toBe(2);
  });
  test("side controls follow authoritative workspace roles", () => {
    expect(writable("owner", "groom")).toBe(true);
    expect(writable("bride_planner", "bride")).toBe(true);
    expect(writable("bride_planner", "groom")).toBe(false);
    expect(writable("groom_planner", "bride")).toBe(false);
  });
  test("CSV preserves commas, quotes and multiline notes and escapes spreadsheet formulas", () => {
    const csv = toCsv(
      [{ name: '=HYPERLINK("bad")', notes: 'one, two\n"three"', phone: "+919999999999" }],
      ["name", "notes", "phone"],
    );
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
    expect(csv).toContain('"one, two\n""three"""');
    expect(csv).toContain('"\'+919999999999"');
  });
  test("travel rejects invalid passenger counts and reversed dates", () => {
    const data = fixture();
    const t = data.travels[0]!;
    expect(travelInput.safeParse({ ...t, passenger_count: 0 }).success).toBe(false);
    expect(
      travelInput.safeParse({ ...t, departure_datetime: "2027-02-08T00:00:00Z" }).success,
    ).toBe(false);
  });
  test("explicit assignment data required before marking assigned", () => {
    const values = {
      travel_group_id: base.id,
      assignment_type: "pickup",
      status: "assigned",
      vehicle: "",
      driver_name: "",
      driver_phone: "",
      pickup_datetime: null,
      hotel_name: "",
      check_in: null,
      check_out: null,
      room_count: 0,
      notes: "",
    };
    expect(assignmentInput.safeParse(values).success).toBe(false);
    expect(assignmentInput.safeParse({ ...values, status: "needed" }).success).toBe(true);
    expect(
      assignmentInput.safeParse({
        ...values,
        assignment_type: "accommodation",
        hotel_name: "Hotel",
        room_count: 2,
        check_in: "2027-02-10",
        check_out: "2027-02-09",
      }).success,
    ).toBe(false);
  });
});
