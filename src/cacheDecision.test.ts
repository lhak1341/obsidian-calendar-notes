import moment from "moment";
import { beforeAll, describe, expect, it } from "vitest";

import { decide, type MatchInput } from "./cacheDecision";
import { DEFAULT_SETTINGS } from "./settings/defaults";
import type { ISettings, PeriodicNoteCachedMetadata } from "./types";

beforeAll(() => {
  window.moment = moment;
});

function input(overrides: Partial<MatchInput> = {}): MatchInput {
  return { path: "", basename: "", extension: "md", size: 0, ...overrides };
}

function settingsWith(overrides: Partial<ISettings>): ISettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

describe("decide", () => {
  it("matches a filename against the active granularity's format", () => {
    const settings = settingsWith({
      day: { enabled: true, openAtStartup: false, format: "YYYY-MM-DD", folder: "" },
    });

    const match = decide(
      input({ path: "2024-01-15.md", basename: "2024-01-15" }),
      settings,
      ["day"],
      undefined
    );

    expect(match?.granularity).toBe("day");
    expect(match?.matchData).toEqual({ exact: true, matchType: "filename" });
    expect(match?.date.isSame(moment("2024-01-15", "YYYY-MM-DD"), "day")).toBe(true);
  });

  it("tries granularities in order and returns the first that matches", () => {
    const settings = settingsWith({
      day: { enabled: true, openAtStartup: false, format: "YYYY-MM-DD", folder: "" },
      week: { enabled: true, openAtStartup: false, format: "gggg-[W]ww", folder: "" },
    });

    // fails strict day parse, succeeds strict week parse
    const match = decide(
      input({ path: "2024-W03.md", basename: "2024-W03" }),
      settings,
      ["day", "week"],
      undefined
    );

    expect(match?.granularity).toBe("week");
    expect(match?.matchData).toEqual({ exact: true, matchType: "filename" });
  });

  it("falls back to a loose date guess when no format matches", () => {
    const settings = settingsWith({
      day: { enabled: true, openAtStartup: false, format: "YYYY-MM-DD", folder: "" },
    });

    const match = decide(
      input({ path: "Notes about 20240115 stuff.md", basename: "Notes about 20240115 stuff" }),
      settings,
      ["day"],
      undefined
    );

    expect(match?.granularity).toBe("day");
    expect(match?.matchData).toEqual({ exact: false, matchType: "filename" });
  });

  it("returns null when neither a strict nor a loose match is found", () => {
    const settings = settingsWith({
      day: { enabled: true, openAtStartup: false, format: "YYYY-MM-DD", folder: "" },
    });

    const match = decide(
      input({ path: "todo-list.md", basename: "todo-list" }),
      settings,
      ["day"],
      undefined
    );

    expect(match).toBeNull();
  });

  it("refuses to override an existing frontmatter match", () => {
    const settings = settingsWith({
      day: { enabled: true, openAtStartup: false, format: "YYYY-MM-DD", folder: "" },
    });
    const existing: PeriodicNoteCachedMetadata = {
      filePath: "2024-01-15.md",
      date: moment("2024-01-15", "YYYY-MM-DD"),
      granularity: "day",
      canonicalDateStr: moment("2024-01-15", "YYYY-MM-DD").toISOString(),
      matchData: { exact: true, matchType: "frontmatter" },
    };

    const match = decide(
      input({ path: "2024-01-15.md", basename: "2024-01-15" }),
      settings,
      ["day"],
      existing
    );

    expect(match).toBeNull();
  });

  it("overrides an existing non-frontmatter match with a new filename match", () => {
    const settings = settingsWith({
      day: { enabled: true, openAtStartup: false, format: "YYYY-MM-DD", folder: "" },
    });
    const existing: PeriodicNoteCachedMetadata = {
      filePath: "2024-01-15.md",
      date: moment("2024-01-15"),
      granularity: "day",
      canonicalDateStr: moment("2024-01-15").toISOString(),
      matchData: { exact: false, matchType: "filename" },
    };

    const match = decide(
      input({ path: "2024-01-15.md", basename: "2024-01-15" }),
      settings,
      ["day"],
      existing
    );

    expect(match?.matchData).toEqual({ exact: true, matchType: "filename" });
  });
});
