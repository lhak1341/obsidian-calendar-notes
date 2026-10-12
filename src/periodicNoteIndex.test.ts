import moment from "moment";
import { describe, expect, it } from "vitest";

import { PeriodicNoteIndex } from "./periodicNoteIndex";
import type { Granularity, PeriodicNoteCachedMetadata } from "./types";

function entry(
  filePath: string,
  date: string,
  overrides: Partial<PeriodicNoteCachedMetadata> = {}
): PeriodicNoteCachedMetadata {
  const m = moment(date, "YYYY-MM-DD");
  return {
    filePath,
    date: m,
    granularity: "day" as Granularity,
    canonicalDateStr: m.toISOString(),
    matchData: { exact: true, matchType: "filename" },
    ...overrides,
  };
}

describe("PeriodicNoteIndex", () => {
  it("finds the exact match for a period", () => {
    const index = new PeriodicNoteIndex();
    index.set(entry("a.md", "2024-01-15"));

    expect(index.pathForPeriod("day", moment("2024-01-15T13:00:00"))).toBe("a.md");
    expect(index.pathForPeriod("day", moment("2024-01-16"))).toBeNull();
  });

  it("does not return loose (non-exact) matches as the period's note", () => {
    const index = new PeriodicNoteIndex();
    index.set(entry("loose.md", "2024-01-15", { matchData: { exact: false, matchType: "filename" } }));

    expect(index.pathForPeriod("day", moment("2024-01-15"))).toBeNull();
    expect(index.isPeriodic("loose.md")).toBe(true);
  });

  it("reports whether set changed anything", () => {
    const index = new PeriodicNoteIndex();

    expect(index.set(entry("a.md", "2024-01-15"))).toBe(true);
    expect(index.set(entry("a.md", "2024-01-15"))).toBe(false);
    expect(index.set(entry("a.md", "2024-01-15", { matchData: { exact: true, matchType: "frontmatter" } }))).toBe(true);
    expect(index.set(entry("a.md", "2024-01-16"))).toBe(true);
  });

  it("moves a note to its new period when its date changes", () => {
    const index = new PeriodicNoteIndex();
    index.set(entry("a.md", "2024-01-15"));
    index.set(entry("a.md", "2024-01-16"));

    expect(index.pathForPeriod("day", moment("2024-01-15"))).toBeNull();
    expect(index.pathForPeriod("day", moment("2024-01-16"))).toBe("a.md");
  });

  it("forgets a removed note everywhere", () => {
    const index = new PeriodicNoteIndex();
    index.set(entry("a.md", "2024-01-15"));
    index.remove("a.md");

    expect(index.pathForPeriod("day", moment("2024-01-15"))).toBeNull();
    expect(index.find("a.md")).toBeNull();
    expect(index.size()).toBe(0);
  });

  it("falls back to another note for the same period after one is removed", () => {
    const index = new PeriodicNoteIndex();
    index.set(entry("a.md", "2024-01-15"));
    index.set(entry("b.md", "2024-01-15"));
    index.remove("a.md");

    expect(index.pathForPeriod("day", moment("2024-01-15"))).toBe("b.md");
  });

  it("removes every note under a deleted folder, and only those", () => {
    const index = new PeriodicNoteIndex();
    index.set(entry("daily/a.md", "2024-01-15"));
    index.set(entry("daily/b.md", "2024-01-16"));
    index.set(entry("daily-old/c.md", "2024-01-17"));
    index.removeUnder("daily");

    expect(index.size()).toBe(1);
    expect(index.find("daily-old/c.md")).not.toBeNull();
  });

  it("findNearestBefore skips removed notes and gaps", () => {
    const index = new PeriodicNoteIndex();
    index.set(entry("jan10.md", "2024-01-10"));
    index.set(entry("jan12.md", "2024-01-12"));
    index.set(entry("jan20.md", "2024-01-20"));
    index.remove("jan12.md");

    expect(index.findNearestBefore("day", moment("2024-01-15"))?.filePath).toBe("jan10.md");
    expect(index.findNearestBefore("day", moment("2024-01-10"))).toBeNull();
  });

  it("findAdjacent walks notes of one granularity in date order", () => {
    const index = new PeriodicNoteIndex();
    index.set(entry("c.md", "2024-01-20"));
    index.set(entry("a.md", "2024-01-10"));
    index.set(entry("b.md", "2024-01-12"));
    index.set(entry("w.md", "2024-01-11", { granularity: "week" }));

    expect(index.findAdjacent("b.md", "forwards")?.filePath).toBe("c.md");
    expect(index.findAdjacent("b.md", "backwards")?.filePath).toBe("a.md");
    expect(index.findAdjacent("a.md", "backwards")).toBeNull();
    expect(index.findAdjacent("missing.md", "forwards")).toBeNull();
  });

  it("getPeriodicNotes includes finer granularities only when asked", () => {
    const index = new PeriodicNoteIndex();
    index.set(entry("day.md", "2024-01-15"));
    index.set(entry("week.md", "2024-01-15", { granularity: "week" }));

    expect(index.getPeriodicNotes("week", moment("2024-01-15")).map((m) => m.filePath)).toEqual(["week.md"]);
    expect(
      index.getPeriodicNotes("week", moment("2024-01-15"), true).map((m) => m.filePath).sort()
    ).toEqual(["day.md", "week.md"]);
  });

  it("findNearestBefore and findAdjacent ignore loose matches, getPeriodicNotes keeps them", () => {
    const index = new PeriodicNoteIndex();
    const loose = { matchData: { exact: false, matchType: "filename" as const } };
    index.set(entry("a.md", "2024-01-10"));
    index.set(entry("Meeting 2024-01-12.md", "2024-01-12", loose));
    index.set(entry("c.md", "2024-01-20"));

    expect(index.findNearestBefore("day", moment("2024-01-15"))?.filePath).toBe("a.md");
    expect(index.findAdjacent("a.md", "forwards")?.filePath).toBe("c.md");
    expect(index.findAdjacent("Meeting 2024-01-12.md", "forwards")).toBeNull();
    expect(index.getPeriodicNotes("day", moment("2024-01-12")).map((m) => m.filePath)).toEqual([
      "Meeting 2024-01-12.md",
    ]);
  });
});
