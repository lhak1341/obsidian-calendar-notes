import moment from "moment";
import type { App, Command } from "obsidian";
import { describe, expect, it, vi } from "vitest";

import { commandIds, getCommands } from "./commands";
import { granularities, type Granularity, type PeriodicNoteCachedMetadata } from "./types";

function makeApp(activePath: string | null): App {
  return {
    workspace: { getActiveFile: () => (activePath ? { path: activePath } : null) },
  } as unknown as App;
}

function meta(granularity: Granularity, date: string): PeriodicNoteCachedMetadata {
  const m = moment(date, "YYYY-MM-DD");
  return {
    filePath: "active.md",
    date: m,
    granularity,
    canonicalDateStr: m.toISOString(),
    matchData: { exact: true, matchType: "filename" },
  };
}

function makePlugin(overrides: { isPeriodic?: boolean; found?: PeriodicNoteCachedMetadata | null } = {}) {
  return {
    cache: {
      isPeriodic: vi.fn().mockReturnValue(overrides.isPeriodic ?? true),
      find: vi.fn().mockReturnValue(overrides.found ?? null),
      findAdjacent: vi.fn().mockReturnValue(null),
    },
    openPeriodicNote: vi.fn().mockResolvedValue(undefined),
  };
}

const commandsFor = (app: App, plugin: ReturnType<typeof makePlugin>, g: Granularity) =>
  getCommands(app, plugin as never, g);
const byId = (commands: Command[], id: string) => commands.find((c) => c.id === id) as Command;

describe("commandIds", () => {
  it.each(granularities)("matches the ids getCommands registers (%s)", (g) => {
    const ids = commandsFor(makeApp(null), makePlugin(), g).map((c) => c.id);

    expect(commandIds(g)).toEqual(ids);
  });
});

describe("gated commands", () => {
  const gatedIds = ["next-daily-note", "prev-daily-note", "open-next-daily-note", "open-prev-daily-note"];

  it.each(gatedIds)("%s is unavailable with no active file", (id) => {
    const plugin = makePlugin();
    const command = byId(commandsFor(makeApp(null), plugin, "day"), id);

    expect(command.checkCallback?.(true)).toBe(false);
    expect(plugin.cache.isPeriodic).not.toHaveBeenCalled();
  });

  it.each(gatedIds)("%s is unavailable when the active file is not a periodic note", (id) => {
    const plugin = makePlugin({ isPeriodic: false });
    const command = byId(commandsFor(makeApp("x.md"), plugin, "day"), id);

    expect(command.checkCallback?.(true)).toBe(false);
  });

  it.each(gatedIds)("%s is available for a periodic note, asking about its own granularity", (id) => {
    const plugin = makePlugin({ isPeriodic: true });
    const command = byId(commandsFor(makeApp("2024-03-15.md"), plugin, "day"), id);

    expect(command.checkCallback?.(true)).toBe(true);
    expect(plugin.cache.isPeriodic).toHaveBeenCalledWith("2024-03-15.md", "day");
  });

  it("asks about the granularity the command belongs to", () => {
    const plugin = makePlugin();
    const command = byId(commandsFor(makeApp("w.md"), plugin, "week"), "next-weekly-note");

    command.checkCallback?.(true);

    expect(plugin.cache.isPeriodic).toHaveBeenCalledWith("w.md", "week");
  });
});

describe("open next / previous", () => {
  it("opens the note one unit of its own granularity after the active one", () => {
    const plugin = makePlugin({ found: meta("week", "2024-03-15") });
    const command = byId(commandsFor(makeApp("w.md"), plugin, "week"), "open-next-weekly-note");

    command.checkCallback?.(false);

    const [granularity, date] = plugin.openPeriodicNote.mock.calls[0];
    expect(granularity).toBe("week");
    expect(date.format("YYYY-MM-DD")).toBe("2024-03-22");
  });

  it("opens the note one unit before for previous", () => {
    const plugin = makePlugin({ found: meta("month", "2024-03-15") });
    const command = byId(commandsFor(makeApp("m.md"), plugin, "month"), "open-prev-monthly-note");

    command.checkCallback?.(false);

    const [granularity, date] = plugin.openPeriodicNote.mock.calls[0];
    expect(granularity).toBe("month");
    expect(date.format("YYYY-MM-DD")).toBe("2024-02-15");
  });

  it("does not mutate the cached date", () => {
    const found = meta("day", "2024-03-15");
    const plugin = makePlugin({ found });
    const command = byId(commandsFor(makeApp("d.md"), plugin, "day"), "open-next-daily-note");

    command.checkCallback?.(false);

    expect(found.date.format("YYYY-MM-DD")).toBe("2024-03-15");
  });

  it("does nothing when the active file is not in the index", () => {
    const plugin = makePlugin({ found: null });
    const command = byId(commandsFor(makeApp("x.md"), plugin, "day"), "open-next-daily-note");

    command.checkCallback?.(false);

    expect(plugin.openPeriodicNote).not.toHaveBeenCalled();
  });
});

describe("jump to closest", () => {
  it("does nothing when the active file is not in the index", async () => {
    const plugin = makePlugin({ found: null });
    const command = byId(commandsFor(makeApp("x.md"), plugin, "day"), "next-daily-note");

    command.checkCallback?.(false);
    await Promise.resolve();

    expect(plugin.cache.findAdjacent).not.toHaveBeenCalled();
  });

  it("does nothing when the active file is only a loose match", async () => {
    const loose = { ...meta("day", "2024-03-15"), matchData: { exact: false, matchType: "filename" as const } };
    const plugin = makePlugin({ found: loose });
    const command = byId(commandsFor(makeApp("Meeting 2024-03-15.md"), plugin, "day"), "next-daily-note");

    command.checkCallback?.(false);
    await Promise.resolve();

    expect(plugin.cache.findAdjacent).not.toHaveBeenCalled();
  });

  it("looks up the adjacent note in the requested direction", async () => {
    const plugin = makePlugin({ found: meta("day", "2024-03-15") });
    const app = {
      workspace: { getActiveFile: () => ({ path: "d.md" }) },
      vault: { getAbstractFileByPath: () => null },
    } as unknown as App;
    plugin.cache.findAdjacent.mockReturnValue(meta("day", "2024-03-14"));
    const command = byId(commandsFor(app, plugin, "day"), "prev-daily-note");

    command.checkCallback?.(false);
    await Promise.resolve();

    expect(plugin.cache.findAdjacent).toHaveBeenCalledWith("d.md", "backwards");
  });
});

describe("open command", () => {
  it("opens today's note of its granularity", () => {
    const plugin = makePlugin();
    const command = byId(commandsFor(makeApp(null), plugin, "quarter"), "open-quarterly-note");

    command.callback?.();

    const [granularity, date] = plugin.openPeriodicNote.mock.calls[0];
    expect(granularity).toBe("quarter");
    expect(date.isSame(moment(), "day")).toBe(true);
  });
});
