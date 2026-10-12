import moment from "moment";
import { describe, expect, it } from "vitest";

import { decide, resolveFile, shouldSeedEmptyNote, type MatchInput } from "./cacheDecision";
import { PeriodicNoteIndex } from "./periodicNoteIndex";
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

  it("does not match a filename in a sibling folder that shares the prefix", () => {
    const settings = settingsWith({
      day: { enabled: true, openAtStartup: false, format: "YYYY-MM-DD", folder: "Daily" },
    });

    expect(decide(input({ path: "Daily2/2024-01-15.md", basename: "2024-01-15" }), settings, ["day"])?.matchData.exact).not.toBe(true);
    expect(decide(input({ path: "Daily/2024-01-15.md", basename: "2024-01-15" }), settings, ["day"])?.matchData.exact).toBe(true);
  });

  it("treats '/' and a trailing slash as valid folder spellings", () => {
    const root = settingsWith({
      day: { enabled: true, openAtStartup: false, format: "YYYY-MM-DD", folder: "/" },
    });
    const slash = settingsWith({
      day: { enabled: true, openAtStartup: false, format: "YYYY-MM-DD", folder: "Daily/" },
    });

    expect(decide(input({ path: "2024-01-15.md", basename: "2024-01-15" }), root, ["day"])?.matchData.exact).toBe(true);
    expect(decide(input({ path: "Daily/2024-01-15.md", basename: "2024-01-15" }), slash, ["day"])?.matchData.exact).toBe(true);
  });

  it("ignores frontmatter in a sibling folder that shares the prefix", () => {
    const settings = settingsWith({
      day: { enabled: true, openAtStartup: false, format: "YYYY-MM-DD", folder: "daily" },
    });

    expect(
      decide(input({ path: "daily2/x.md", basename: "x", frontmatter: { day: "2024-01-15" } }), settings, ["day"])
    ).toBeNull();
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

describe("resolveFile", () => {
  const dayOn = {
    enabled: true,
    openAtStartup: false,
    format: "YYYY-MM-DD",
    folder: "",
  };
  const settings = settingsWith({ day: dayOn });
  const daily = (overrides: Partial<MatchInput> = {}) =>
    input({ path: "2024-01-15.md", basename: "2024-01-15", ...overrides });

  it("sets the entry for a match and reports the change", () => {
    const index = new PeriodicNoteIndex();
    const r = resolveFile(index, daily({ size: 5 }), settings, "initialize");

    expect(r.match?.filePath).toBe("2024-01-15.md");
    expect(r.changed).toBe(true);
    expect(index.find("2024-01-15.md")).not.toBeNull();
  });

  it("reports no change when the same entry is resolved again", () => {
    const index = new PeriodicNoteIndex();
    resolveFile(index, daily({ size: 5 }), settings, "initialize");

    expect(resolveFile(index, daily({ size: 5 }), settings, "metadata").changed).toBe(false);
  });

  it("drops the entry when the file no longer matches", () => {
    const index = new PeriodicNoteIndex();
    resolveFile(index, daily({ size: 5 }), settings, "initialize");

    const r = resolveFile(index, input({ path: "2024-01-15.md", basename: "notes" }), settings, "rename");

    expect(r.match).toBeNull();
    expect(index.find("2024-01-15.md")).toBeNull();
  });

  it("seeds a blank strict note on create, even when the entry was already indexed", () => {
    const index = new PeriodicNoteIndex();
    resolveFile(index, daily({ size: 0 }), settings, "initialize");

    const r = resolveFile(index, daily({ size: 0 }), settings, "create");

    expect(r.changed).toBe(false);
    expect(r.seed).toBe(true);
  });

  it("never seeds on rename, initialize or metadata, or a non-empty or loose file", () => {
    for (const reason of ["rename", "initialize", "metadata"] as const) {
      expect(resolveFile(new PeriodicNoteIndex(), daily({ size: 0 }), settings, reason).seed).toBe(false);
    }
    expect(resolveFile(new PeriodicNoteIndex(), daily({ size: 5 }), settings, "create").seed).toBe(false);
    const loose = input({ path: "Meeting 2024-01-15.md", basename: "Meeting 2024-01-15", size: 0 });
    expect(resolveFile(new PeriodicNoteIndex(), loose, settings, "create").seed).toBe(false);
  });

  it("leaves the index alone when no granularity is enabled", () => {
    const index = new PeriodicNoteIndex();
    resolveFile(index, daily({ size: 5 }), settings, "initialize");
    const allOff = settingsWith({ day: { ...dayOn, enabled: false } });

    const r = resolveFile(index, input({ path: "2024-01-15.md", basename: "notes" }), allOff, "rename");

    expect(r).toEqual({ match: null, changed: false, seed: false });
    expect(index.find("2024-01-15.md")).not.toBeNull();
  });
});
