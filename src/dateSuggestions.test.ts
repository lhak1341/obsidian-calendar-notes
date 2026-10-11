import moment from "moment";
import type { NLDResult } from "obsidian";
import { describe, expect, it, vi } from "vitest";

import { generateDateSuggestions } from "./dateSuggestions";

type Moment = ReturnType<typeof moment>;

function invalidResult(): NLDResult {
  return { formattedString: "", date: new Date(NaN), moment: moment(NaN) };
}

function makeParseDate(overrides: Record<string, Moment> = {}) {
  return vi.fn((dateStr: string): NLDResult => {
    const m = overrides[dateStr];
    if (!m) return invalidResult();
    return { formattedString: dateStr, date: m.toDate(), moment: m };
  });
}

describe("generateDateSuggestions", () => {
  it("returns the default quick suggestions for an empty query, filtered to active granularities", () => {
    const parseDate = makeParseDate({
      today: moment("2026-07-05"),
      yesterday: moment("2026-07-04"),
      tomorrow: moment("2026-07-06"),
    });

    const result = generateDateSuggestions("", ["day"], parseDate, "GGGG-[W]ww");

    expect(result.map((r) => r.label)).toEqual(["today", "yesterday", "tomorrow"]);
    expect(result.every((r) => r.granularity === "day")).toBe(true);
  });

  it("matches the 'next/last/this' branch and filters by active granularities", () => {
    const parseDate = makeParseDate({ "next week": moment("2026-07-12") });

    const result = generateDateSuggestions("next week", ["week"], parseDate, "GGGG-[W]ww");

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ label: "next week", granularity: "week" });
  });

  it("matches the relative-number branch (e.g. 'in 3 days')", () => {
    const parseDate = makeParseDate({ "in 3 days": moment("2026-07-08") });

    const result = generateDateSuggestions("in 3", ["day"], parseDate, "GGGG-[W]ww");

    expect(result.map((r) => r.label)).toContain("in 3 days");
  });

  it("does not re-parse the query as a freeform date once quick suggestions already matched", () => {
    const parseDate = makeParseDate({ today: moment("2026-07-05") });

    generateDateSuggestions("today", ["day"], parseDate, "GGGG-[W]ww");

    // "today" is both a quick-suggestion candidate and the literal query — if the
    // freeform fallback ran unconditionally (the old behavior), it would be parsed twice.
    const todayCalls = parseDate.mock.calls.filter(([arg]) => arg === "today");
    expect(todayCalls).toHaveLength(1);
  });

  it("falls back to the freeform NLP parse when no quick suggestion matches", () => {
    const parsed = moment("2026-08-01");
    const parseDate = makeParseDate({ "August 1st": parsed });

    const result = generateDateSuggestions("August 1st", ["day"], parseDate, "GGGG-[W]ww");

    expect(parseDate).toHaveBeenCalledWith("August 1st");
    expect(result[0].granularity).toBe("day");
    expect(result[0].date.isSame(parsed, "day")).toBe(true);
  });

  it("labels a week-granularity freeform match using the ISO week token when the format is ISO", () => {
    const parsed = moment("2026-07-06"); // a Monday
    const parseDate = makeParseDate({ "next week thing": parsed });

    const result = generateDateSuggestions("next week thing", ["week", "day"], parseDate, "GGGG-[W]WW");

    const weekItem = result.find((r) => r.granularity === "week");
    expect(weekItem?.label).toMatch(/^\d{4} Week \d{2}$/);
  });

  it("adds a same-day companion suggestion for non-day freeform matches", () => {
    const parsed = moment("2026-09-01");
    const parseDate = makeParseDate({ "month thing": parsed });

    const result = generateDateSuggestions("month thing", ["month", "day"], parseDate, "GGGG-[W]ww");

    expect(result).toHaveLength(2);
    expect(result[0].granularity).toBe("month");
    expect(result[1].granularity).toBe("day");
    expect(result[1].date.isSame(parsed, "day")).toBe(true);
  });

  it("returns an empty array when nothing matches and the freeform parse is invalid", () => {
    const parseDate = makeParseDate();

    const result = generateDateSuggestions("gibberish", ["day"], parseDate, "GGGG-[W]ww");

    expect(result).toEqual([]);
  });
});
