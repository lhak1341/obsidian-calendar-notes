import moment from "moment";
import { describe, expect, it, vi } from "vitest";

import {
  createNoteFromTemplate,
  getOrCreateNote,
  seedNoteFromTemplate,
  type NoteCreationPorts,
  type RolloverSettings,
} from "./noteCreation";
import type { ResolvedPeriodicConfig } from "./types";

function makeCfg(overrides: Partial<ResolvedPeriodicConfig> = {}): ResolvedPeriodicConfig {
  return {
    enabled: true,
    openAtStartup: false,
    format: "YYYY-MM-DD",
    folder: "",
    possibleFormats: ["YYYY-MM-DD"],
    isIso: false,
    ...overrides,
  };
}

const NO_ROLLOVER: RolloverSettings = { rolloverUnfinishedTasks: false, rolloverHeading: "# Plan" };
const ROLLOVER: RolloverSettings = { rolloverUnfinishedTasks: true, rolloverHeading: "# Plan" };

function makePorts(overrides: Partial<NoteCreationPorts> = {}): NoteCreationPorts {
  return {
    findExisting: vi.fn().mockReturnValue(null),
    seedIfEmpty: vi.fn().mockResolvedValue(true),
    readTemplate: vi.fn().mockResolvedValue(""),
    resolvePath: vi.fn().mockImplementation(async (filename: string) => `${filename}.md`),
    createNote: vi.fn().mockResolvedValue({ path: "created.md" }),
    findNearestBeforePath: vi.fn().mockReturnValue(null),
    readSource: vi.fn().mockResolvedValue(null),
    modifySource: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("createNoteFromTemplate", () => {
  it("creates a note at the resolved path with rendered template contents", async () => {
    const ports = makePorts({ readTemplate: vi.fn().mockResolvedValue("hello {{title}}") });
    const date = moment("2026-07-05");

    const file = await createNoteFromTemplate(ports, "day", date, makeCfg(), NO_ROLLOVER);

    expect(ports.createNote).toHaveBeenCalledWith("2026-07-05.md", "hello 2026-07-05");
    expect(file).toEqual({ path: "created.md" });
  });

  it("skips rollover lookup entirely when rollover is disabled", async () => {
    const ports = makePorts();

    await createNoteFromTemplate(ports, "day", moment("2026-07-05"), makeCfg(), NO_ROLLOVER);

    expect(ports.findNearestBeforePath).not.toHaveBeenCalled();
    expect(ports.modifySource).not.toHaveBeenCalled();
  });

  it("skips rollover for non-day granularities even when enabled", async () => {
    const ports = makePorts();

    await createNoteFromTemplate(
      ports,
      "week",
      moment("2026-07-05"),
      makeCfg({ format: "GGGG-[W]WW" }),
      ROLLOVER
    );

    expect(ports.findNearestBeforePath).not.toHaveBeenCalled();
  });

  it("folds unfinished tasks from the nearest earlier note into the new note, then strips them from the source", async () => {
    const ports = makePorts({
      findNearestBeforePath: vi.fn().mockReturnValue("2026-07-04.md"),
      readSource: vi.fn().mockResolvedValue("# Plan\n- [ ] Carry me\n- [x] Done"),
      readTemplate: vi.fn().mockResolvedValue("# Plan\n"),
    });

    await createNoteFromTemplate(ports, "day", moment("2026-07-05"), makeCfg(), ROLLOVER);

    const [createdPath, createdContents] = vi.mocked(ports.createNote).mock.calls[0];
    expect(createdPath).toBe("2026-07-05.md");
    expect(createdContents).toContain("- [ ] Carry me");

    expect(ports.modifySource).toHaveBeenCalledWith("2026-07-04.md", "# Plan\n- [x] Done");
  });

  it("does not touch the source note when there is nothing unfinished to roll over", async () => {
    const ports = makePorts({
      findNearestBeforePath: vi.fn().mockReturnValue("2026-07-04.md"),
      readSource: vi.fn().mockResolvedValue("# Plan\n- [x] Done"),
    });

    await createNoteFromTemplate(ports, "day", moment("2026-07-05"), makeCfg(), ROLLOVER);

    expect(ports.modifySource).not.toHaveBeenCalled();
  });

  it("does not touch the source note when there is no nearest earlier note", async () => {
    const ports = makePorts({ findNearestBeforePath: vi.fn().mockReturnValue(null) });

    await createNoteFromTemplate(ports, "day", moment("2026-07-05"), makeCfg(), ROLLOVER);

    expect(ports.readSource).not.toHaveBeenCalled();
    expect(ports.modifySource).not.toHaveBeenCalled();
  });

  it("does not touch the source note when the resolved path can't be read", async () => {
    const ports = makePorts({
      findNearestBeforePath: vi.fn().mockReturnValue("2026-07-04.md"),
      readSource: vi.fn().mockResolvedValue(null),
    });

    await createNoteFromTemplate(ports, "day", moment("2026-07-05"), makeCfg(), ROLLOVER);

    expect(ports.modifySource).not.toHaveBeenCalled();
  });

  it("creates the note even when the source has nothing to roll over, in the same call order", async () => {
    const calls: string[] = [];
    const ports = makePorts({
      findNearestBeforePath: vi.fn().mockReturnValue("2026-07-04.md"),
      readSource: vi.fn().mockResolvedValue("# Plan\n- [ ] Carry me"),
      createNote: vi.fn().mockImplementation(async (path: string) => {
        calls.push("createNote");
        return { path };
      }),
      modifySource: vi.fn().mockImplementation(async () => {
        calls.push("modifySource");
      }),
    });

    await createNoteFromTemplate(ports, "day", moment("2026-07-05"), makeCfg(), ROLLOVER);

    expect(calls).toEqual(["createNote", "modifySource"]);
  });
});

describe("createNoteFromTemplate rollover settings", () => {
  it("skips rollover when enabled but the heading is empty", async () => {
    const ports = makePorts();

    await createNoteFromTemplate(ports, "day", moment("2026-07-05"), makeCfg(), {
      rolloverUnfinishedTasks: true,
      rolloverHeading: "",
    });

    expect(ports.findNearestBeforePath).not.toHaveBeenCalled();
  });

  it("does not mutate the caller's date while rendering", async () => {
    const ports = makePorts({ readTemplate: vi.fn().mockResolvedValue("{{monday:YYYY-MM-DD}}") });
    const date = moment("2026-07-05"); // a Sunday

    await createNoteFromTemplate(ports, "week", date, makeCfg({ format: "GGGG-[W]WW" }), NO_ROLLOVER);

    expect(date.format("YYYY-MM-DD")).toBe("2026-07-05");
  });
});

describe("getOrCreateNote", () => {
  it("returns the existing note without creating one", async () => {
    const existing = { path: "2026-07-05.md" };
    const ports = makePorts({ findExisting: vi.fn().mockReturnValue(existing) });

    const file = await getOrCreateNote(ports, "day", moment("2026-07-05"), makeCfg(), ROLLOVER);

    expect(file).toBe(existing);
    expect(ports.createNote).not.toHaveBeenCalled();
  });

  it("creates the note when none is indexed", async () => {
    const ports = makePorts();

    await getOrCreateNote(ports, "day", moment("2026-07-05"), makeCfg(), NO_ROLLOVER);

    expect(ports.createNote).toHaveBeenCalledWith("2026-07-05.md", "");
  });
});

describe("seedNoteFromTemplate", () => {
  const seed = (ports: NoteCreationPorts, overrides: { granularity?: "day" | "week" } = {}) =>
    seedNoteFromTemplate(
      ports,
      "2026-07-05.md",
      "2026-07-05",
      overrides.granularity ?? "day",
      moment("2026-07-05"),
      makeCfg(),
      ROLLOVER
    );

  it("writes the rendered template into the existing file, using the given filename for {{title}}", async () => {
    const ports = makePorts({ readTemplate: vi.fn().mockResolvedValue("hello {{title}}") });

    const seeded = await seedNoteFromTemplate(
      ports,
      "07-05.md",
      "07-05",
      "day",
      moment("2026-07-05"),
      makeCfg(),
      NO_ROLLOVER
    );

    expect(seeded).toBe(true);
    expect(ports.seedIfEmpty).toHaveBeenCalledWith("07-05.md", "hello 07-05");
    expect(ports.createNote).not.toHaveBeenCalled();
  });

  it("rolls unfinished tasks into the seeded day note, then strips the source", async () => {
    const ports = makePorts({
      findNearestBeforePath: vi.fn().mockReturnValue("2026-07-04.md"),
      readSource: vi.fn().mockResolvedValue("# Plan\n- [ ] Carry me\n- [x] Done"),
      readTemplate: vi.fn().mockResolvedValue("# Plan\n"),
    });

    await seed(ports);

    const [, contents] = vi.mocked(ports.seedIfEmpty).mock.calls[0];
    expect(contents).toContain("- [ ] Carry me");
    expect(ports.modifySource).toHaveBeenCalledWith("2026-07-04.md", "# Plan\n- [x] Done");
  });

  it("leaves the source untouched when the file was no longer empty", async () => {
    const ports = makePorts({
      seedIfEmpty: vi.fn().mockResolvedValue(false),
      findNearestBeforePath: vi.fn().mockReturnValue("2026-07-04.md"),
      readSource: vi.fn().mockResolvedValue("# Plan\n- [ ] Carry me"),
    });

    const seeded = await seed(ports);

    expect(seeded).toBe(false);
    expect(ports.modifySource).not.toHaveBeenCalled();
  });

  it("skips rollover for non-day granularities", async () => {
    const ports = makePorts();

    await seed(ports, { granularity: "week" });

    expect(ports.findNearestBeforePath).not.toHaveBeenCalled();
  });

  it("does not mutate the cache entry's date", async () => {
    const ports = makePorts({ readTemplate: vi.fn().mockResolvedValue("{{monday:YYYY-MM-DD}}") });
    const date = moment("2026-07-05");

    await seedNoteFromTemplate(ports, "w.md", "w", "week", date, makeCfg(), NO_ROLLOVER);

    expect(date.format("YYYY-MM-DD")).toBe("2026-07-05");
  });
});
