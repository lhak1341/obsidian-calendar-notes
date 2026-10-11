import moment from "moment";
import { describe, expect, it } from "vitest";

import { decide, shouldSeedEmptyNote, type MatchInput } from "./cacheDecision";
import { DEFAULT_SETTINGS } from "./settings/defaults";
import type { ISettings, PeriodicNoteCachedMetadata } from "./types";

function input(overrides: Partial<MatchInput> = {}): MatchInput {
  return { path: "", basename: "", extension: "md", size: 0, frontmatter: {}, ...overrides };
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
      ["day"]
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
      ["day", "week"]
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
      ["day"]
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
      ["day"]
    );

    expect(match).toBeNull();
  });

  const dayCfg = { enabled: true, openAtStartup: false, format: "YYYY-MM-DD", folder: "" };

  it("lets frontmatter outrank a strict filename match", () => {
    const match = decide(
      input({
        path: "2024-01-15.md",
        basename: "2024-01-15",
        frontmatter: { day: "2024-02-20" },
      }),
      settingsWith({ day: dayCfg }),
      ["day"]
    );

    expect(match?.matchData).toEqual({ exact: true, matchType: "frontmatter" });
    expect(match?.date.format("YYYY-MM-DD")).toBe("2024-02-20");
  });

  it("falls back to the filename when there is no frontmatter", () => {
    const match = decide(
      input({ path: "2024-01-15.md", basename: "2024-01-15", frontmatter: {} }),
      settingsWith({ day: dayCfg }),
      ["day"]
    );

    expect(match?.matchData).toEqual({ exact: true, matchType: "filename" });
  });

  it("reads frontmatter as ISO even when the filename format is different", () => {
    const match = decide(
      input({ path: "note.md", basename: "note", frontmatter: { day: "2024-01-15" } }),
      settingsWith({ day: { ...dayCfg, format: "YYMMDD" } }),
      ["day"]
    );

    expect(match?.date.format("YYYY-MM-DD")).toBe("2024-01-15");
  });

  it("skips an unparseable frontmatter value and uses the next valid one", () => {
    const match = decide(
      input({
        path: "note.md",
        basename: "note",
        frontmatter: { day: "not a date", week: "2024-W03" },
      }),
      settingsWith({
        day: dayCfg,
        week: { enabled: true, openAtStartup: false, format: "gggg-[W]ww", folder: "" },
      }),
      ["day", "week"]
    );

    expect(match?.granularity).toBe("week");
    expect(match?.matchData.matchType).toBe("frontmatter");
  });

  it("ignores frontmatter for a granularity whose folder does not contain the file", () => {
    const match = decide(
      input({ path: "elsewhere/note.md", basename: "note", frontmatter: { day: "2024-01-15" } }),
      settingsWith({ day: { ...dayCfg, folder: "daily" } }),
      ["day"]
    );

    expect(match).toBeNull();
  });

  it("is stateless: same input, same answer", () => {
    const run = () =>
      decide(
        input({
          path: "2024-01-15.md",
          basename: "2024-01-15",
          frontmatter: { day: "2024-02-20" },
        }),
        settingsWith({ day: dayCfg }),
        ["day"]
      );

    const first = run();
    const second = run();

    expect(second?.canonicalDateStr).toBe(first?.canonicalDateStr);
    expect(second?.matchData).toEqual(first?.matchData);
  });
});

describe("shouldSeedEmptyNote", () => {
  const strictMatch: PeriodicNoteCachedMetadata = {
    filePath: "2024-01-15.md",
    date: moment("2024-01-15", "YYYY-MM-DD"),
    granularity: "day",
    canonicalDateStr: moment("2024-01-15", "YYYY-MM-DD").toISOString(),
    matchData: { exact: true, matchType: "filename" },
  };

  it("seeds an empty file freshly created with a strict filename match", () => {
    expect(shouldSeedEmptyNote("create", { stat: { size: 0 } }, strictMatch)).toBe(true);
  });

  it("does not seed on rename, even if empty and strictly matched", () => {
    expect(shouldSeedEmptyNote("rename", { stat: { size: 0 } }, strictMatch)).toBe(false);
  });

  it("does not seed on startup indexing", () => {
    expect(shouldSeedEmptyNote("initialize", { stat: { size: 0 } }, strictMatch)).toBe(false);
  });

  it("does not seed a file that already has content", () => {
    expect(shouldSeedEmptyNote("create", { stat: { size: 42 } }, strictMatch)).toBe(false);
  });

  it("does not seed a loose (non-exact) filename match", () => {
    const looseMatch: PeriodicNoteCachedMetadata = {
      ...strictMatch,
      matchData: { exact: false, matchType: "filename" },
    };
    expect(shouldSeedEmptyNote("create", { stat: { size: 0 } }, looseMatch)).toBe(false);
  });

  it("does not seed a frontmatter match", () => {
    const frontmatterMatch: PeriodicNoteCachedMetadata = {
      ...strictMatch,
      matchData: { exact: true, matchType: "frontmatter" },
    };
    expect(shouldSeedEmptyNote("create", { stat: { size: 0 } }, frontmatterMatch)).toBe(false);
  });
});
