import {
  resolveServiceUrl,
  NIMANTRAN_SUPABASE_URL,
  eventTimes,
} from "../src/features/social/auth-config";
import { describe, test, expect } from "bun:test";
import { filterScenes, categoryFor, inr } from "../src/features/social/domain";
import { sampleScenes } from "./social-fixtures";
const base = {
  search: "",
  category: "",
  area: "Gurgaon",
  price: 50000,
  age: "",
  date: "",
  vibe: "",
  solo: false,
  sober: false,
};
describe("social discovery", () => {
  test("all six concept categories have distinct identities and are explicitly samples", () => {
    expect(new Set(sampleScenes.map((e) => e.category)).size).toBe(6);
    expect(sampleScenes.every((e) => e.sample)).toBe(true);
    expect(categoryFor("games").name).toBe("Khel Khel Mein");
  });
  test("search covers neighbourhood and host without case sensitivity", () => {
    expect(filterScenes(sampleScenes, { ...base, search: "CYBER HUB" })).toHaveLength(1);
    expect(filterScenes(sampleScenes, { ...base, search: "riya" })).toHaveLength(1);
  });
  test("budget, category and atmosphere combine", () => {
    expect(
      filterScenes(sampleScenes, { ...base, category: "games", price: 500, vibe: "Playful" }),
    ).toHaveLength(1);
    expect(filterScenes(sampleScenes, { ...base, category: "games", price: 400 })).toHaveLength(0);
  });
  test("sober filter excludes alcohol listings, and age must meet both bounds", () => {
    const e = { ...sampleScenes[0]!, sample: false, alcohol_free: false, min_age: 25, max_age: 35 };
    expect(filterScenes([e], { ...base, sober: true })).toHaveLength(0);
    expect(filterScenes([e], { ...base, age: "24" })).toHaveLength(0);
    expect(filterScenes([e], { ...base, age: "36" })).toHaveLength(0);
    expect(filterScenes([e], { ...base, age: "25" })).toHaveLength(1);
  });
  test("cancelled listings never appear in discovery", () => {
    expect(filterScenes([{ ...sampleScenes[0]!, status: "cancelled" }], base)).toHaveLength(0);
  });
  test("free is explicit and rupees use Indian formatting", () => {
    expect(inr(0)).toBe("Free");
    expect(inr(2499)).toContain("2,499");
  });
});

describe("auth configuration and single-date schedule", () => {
  test("repairs the reported DNS typo using the existing project URL", () => {
    expect(resolveServiceUrl("https://ozwurus.shopabase.co")).toBe(NIMANTRAN_SUPABASE_URL);
    expect(resolveServiceUrl("https://social-fixture.supabase.co/")).toBe(
      "https://social-fixture.supabase.co",
    );
    expect(() => resolveServiceUrl("http://untrusted.example")).toThrow("HTTPS");
  });
  test("one date produces IST start/end instants and supports overnight gatherings", () => {
    expect(eventTimes("2026-12-01", "18:00", "21:00")).toEqual({
      starts_at: "2026-12-01T12:30:00.000Z",
      ends_at: "2026-12-01T15:30:00.000Z",
    });
    expect(eventTimes("2026-12-01", "22:00", "02:00").ends_at).toBe("2026-12-01T20:30:00.000Z");
    expect(() => eventTimes("2026-12-01", "18:00", "18:00")).toThrow();
  });
  test("real sorting and additional filters compose", () => {
    const pool = sampleScenes.map((e, i) => ({
      ...e,
      sample: false,
      rating: i === 0 ? 4.8 : null,
      confirmed_count: i === 1 ? e.capacity : 0,
    }));
    expect(filterScenes(pool, { ...base, openOnly: true }).some((e) => e.id === pool[1]?.id)).toBe(
      false,
    );
    expect(filterScenes(pool, { ...base, minRating: 4 })).toHaveLength(1);
    expect(filterScenes(pool, { ...base, language: "Punjabi" })).toHaveLength(0);
    const prices = filterScenes(pool, { ...base, sort: "price" }).map((e) => e.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });
});
