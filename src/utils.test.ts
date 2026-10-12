import moment from "moment";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getRelativeDate, join } from "./utils";

describe("join", () => {
  it("joins segments with single slashes", () => {
    expect(join("a", "b", "c.md")).toBe("a/b/c.md");
  });

  it("drops empty inner segments, dots and repeated slashes", () => {
    expect(join("a", "", "b//c", ".", "d")).toBe("a/b/c/d");
  });

  it("reads an empty first segment as the root, like path.js", () => {
    expect(join("", "a", "b")).toBe("/a/b");
  });

  it("keeps a leading slash", () => {
    expect(join("/a", "b")).toBe("/a/b");
  });

  it("is empty when nothing is left", () => {
    expect(join("", ".")).toBe("");
  });
});

describe("getRelativeDate", () => {
  // Wednesday 2026-10-14, noon. Weeks start on Sunday in the "en" locale.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 14, 12, 0, 0));
    moment.locale("en");
  });
  afterEach(() => vi.useRealTimers());

  const rel = (g: Parameters<typeof getRelativeDate>[0], date: string) =>
    getRelativeDate(g, moment(date, "YYYY-MM-DD"));

  it("names today, yesterday and tomorrow for days", () => {
    expect(rel("day", "2026-10-14")).toBe("Today");
    expect(rel("day", "2026-10-13")).toBe("Yesterday");
    expect(rel("day", "2026-10-15")).toBe("Tomorrow");
  });

  it("uses the weekday name within a week of today", () => {
    expect(rel("day", "2026-10-17")).toBe("Saturday");
    expect(rel("day", "2026-10-11")).toBe("Last Sunday");
  });

  it("falls back to a moment-relative phrase for further days", () => {
    expect(rel("day", "2026-09-24")).toBe("20 days ago");
  });

  it("names this, last and next week for week starts", () => {
    expect(rel("week", "2026-10-11")).toBe("This week");
    expect(rel("week", "2026-10-04")).toBe("Last week");
    expect(rel("week", "2026-10-18")).toBe("Next week");
  });

  it("falls back to a duration phrase for other weeks", () => {
    expect(rel("week", "2026-09-27")).toBe("14 days ago");
  });

  it("formats months, quarters and years with the humanize format", () => {
    expect(rel("month", "2026-10-01")).toBe("October 2026");
    expect(rel("quarter", "2026-10-01")).toBe("2026 4Q");
    expect(rel("year", "2026-01-01")).toBe("2026");
  });
});
