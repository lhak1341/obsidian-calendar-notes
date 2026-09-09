import moment from "moment";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { createNoteFromTemplate, type NoteCreationPorts } from "./noteCreation";
import type { ResolvedPeriodicConfig } from "./types";

beforeAll(() => {
  window.moment = moment;
});

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

function makePorts(overrides: Partial<NoteCreationPorts> = {}): NoteCreationPorts {
  return {
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

    const file = await createNoteFromTemplate(ports, "day", date, makeCfg(), null);

    expect(ports.createNote).toHaveBeenCalledWith("2026-07-05.md", "hello 2026-07-05");
    expect(file).toEqual({ path: "created.md" });
  });

  it("skips rollover lookup entirely when rollover is disabled", async () => {
    const ports = makePorts();

    await createNoteFromTemplate(ports, "day", moment("2026-07-05"), makeCfg(), null);

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
      { heading: "# Plan" }
    );

    expect(ports.findNearestBeforePath).not.toHaveBeenCalled();
  });

  it("folds unfinished tasks from the nearest earlier note into the new note, then strips them from the source", async () => {
    const ports = makePorts({
      findNearestBeforePath: vi.fn().mockReturnValue("2026-07-04.md"),
      readSource: vi.fn().mockResolvedValue("# Plan\n- [ ] Carry me\n- [x] Done"),
      readTemplate: vi.fn().mockResolvedValue("# Plan\n"),
    });

    await createNoteFromTemplate(ports, "day", moment("2026-07-05"), makeCfg(), {
      heading: "# Plan",
    });

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

    await createNoteFromTemplate(ports, "day", moment("2026-07-05"), makeCfg(), {
      heading: "# Plan",
    });

    expect(ports.modifySource).not.toHaveBeenCalled();
  });

  it("does not touch the source note when there is no nearest earlier note", async () => {
    const ports = makePorts({ findNearestBeforePath: vi.fn().mockReturnValue(null) });

    await createNoteFromTemplate(ports, "day", moment("2026-07-05"), makeCfg(), {
      heading: "# Plan",
    });

    expect(ports.readSource).not.toHaveBeenCalled();
    expect(ports.modifySource).not.toHaveBeenCalled();
  });

  it("does not touch the source note when the resolved path can't be read", async () => {
    const ports = makePorts({
      findNearestBeforePath: vi.fn().mockReturnValue("2026-07-04.md"),
      readSource: vi.fn().mockResolvedValue(null),
    });

    await createNoteFromTemplate(ports, "day", moment("2026-07-05"), makeCfg(), {
      heading: "# Plan",
    });

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

    await createNoteFromTemplate(ports, "day", moment("2026-07-05"), makeCfg(), {
      heading: "# Plan",
    });

    expect(calls).toEqual(["createNote", "modifySource"]);
  });
});
