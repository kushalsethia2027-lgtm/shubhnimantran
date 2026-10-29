import { describe, test, expect } from "bun:test";
import { filterScenes, sampleScenes, categoryFor, inr } from "../src/features/social/domain";
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
