import { type Command, App, TFile, Notice } from "obsidian";

import type { Granularity, IHasNoteIndex, INoteOps } from "./types";

type CommandPlugin = INoteOps & IHasNoteIndex;

interface IDisplayConfig {
  periodicity: string;
  relativeUnit: string;
  labelOpenPresent: string;
}

export const displayConfigs: Record<Granularity, IDisplayConfig> = {
  day: {
    periodicity: "daily",
    relativeUnit: "today",
    labelOpenPresent: "Open today's daily note",
  },
  week: {
    periodicity: "weekly",
    relativeUnit: "this week",
    labelOpenPresent: "Open this week's note",
  },
  month: {
    periodicity: "monthly",
    relativeUnit: "this month",
    labelOpenPresent: "Open this month's note",
  },
  quarter: {
    periodicity: "quarterly",
    relativeUnit: "this quarter",
    labelOpenPresent: "Open this quarter's note",
  },
  year: {
    periodicity: "yearly",
    relativeUnit: "this year",
    labelOpenPresent: "Open this year's note",
  },
};

function commandIdsFor(granularity: Granularity) {
  const { periodicity } = displayConfigs[granularity];
  return {
    open: `open-${periodicity}-note`,
    next: `next-${periodicity}-note`,
    prev: `prev-${periodicity}-note`,
    openNext: `open-next-${periodicity}-note`,
    openPrev: `open-prev-${periodicity}-note`,
  };
}

// Ids of every command getCommands registers for a granularity, without
// building the commands.
export function commandIds(granularity: Granularity): string[] {
  return Object.values(commandIdsFor(granularity));
}

async function jumpToAdjacentNote(
  app: App,
  plugin: CommandPlugin,
  direction: "forwards" | "backwards"
): Promise<void> {
  const activeFile = app.workspace.getActiveFile();
  if (!activeFile) return;
  const activeFileMeta = plugin.cache.find(activeFile.path);
  if (!activeFileMeta) return;

  const adjacentNoteMeta = plugin.cache.findAdjacent(activeFile.path, direction);

  if (adjacentNoteMeta) {
    const file = app.vault.getAbstractFileByPath(adjacentNoteMeta.filePath);
    if (file && file instanceof TFile) {
      const leaf = app.workspace.getLeaf(false);
      await leaf.openFile(file, { active: true });
    }
  } else {
    const qualifier = direction === "forwards" ? "after" : "before";
    new Notice(
      `There's no ${
        displayConfigs[activeFileMeta.granularity].periodicity
      } note ${qualifier} this`
    );
  }
}

async function openAdjacentNote(
  app: App,
  plugin: CommandPlugin,
  direction: "forwards" | "backwards"
): Promise<void> {
  const activeFile = app.workspace.getActiveFile();
  if (!activeFile) return;
  const activeFileMeta = plugin.cache.find(activeFile.path);
  if (!activeFileMeta) return;

  const offset = direction === "forwards" ? 1 : -1;
  const adjacentDate = activeFileMeta.date
    .clone()
    .add(offset, activeFileMeta.granularity);

  plugin.openPeriodicNote(activeFileMeta.granularity, adjacentDate);
}

// A command that is available only while the active file is a periodic note of
// this granularity.
function whenActiveIsPeriodic(
  app: App,
  plugin: CommandPlugin,
  granularity: Granularity,
  run: () => void
) {
  return (checking: boolean) => {
    const activeFile = app.workspace.getActiveFile();
    if (checking) {
      if (!activeFile) return false;
      return plugin.cache.isPeriodic(activeFile.path, granularity);
    }
    run();
  };
}

export function getCommands(
  app: App,
  plugin: CommandPlugin,
  granularity: Granularity
): Command[] {
  const config = displayConfigs[granularity];
  const ids = commandIdsFor(granularity);

  return [
    {
      id: ids.open,
      name: config.labelOpenPresent,
      callback: () => plugin.openPeriodicNote(granularity, window.moment()),
    },
    {
      id: ids.next,
      name: `Jump forwards to closest ${config.periodicity} note`,
      checkCallback: whenActiveIsPeriodic(app, plugin, granularity, () =>
        jumpToAdjacentNote(app, plugin, "forwards")
      ),
    },
    {
      id: ids.prev,
      name: `Jump backwards to closest ${config.periodicity} note`,
      checkCallback: whenActiveIsPeriodic(app, plugin, granularity, () =>
        jumpToAdjacentNote(app, plugin, "backwards")
      ),
    },
    {
      id: ids.openNext,
      name: `Open next ${config.periodicity} note`,
      checkCallback: whenActiveIsPeriodic(app, plugin, granularity, () =>
        openAdjacentNote(app, plugin, "forwards")
      ),
    },
    {
      id: ids.openPrev,
      name: `Open previous ${config.periodicity} note`,
      checkCallback: whenActiveIsPeriodic(app, plugin, granularity, () =>
        openAdjacentNote(app, plugin, "backwards")
      ),
    },
  ];
}
