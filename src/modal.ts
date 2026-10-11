import { Menu, type Point } from "obsidian";

import { displayConfigs } from "./commands";
import type { INoteOps } from "./types";

export function showFileMenu(
  plugin: INoteOps,
  position: Point
): void {
  const contextMenu = new Menu();

  plugin.getActiveGranularities().forEach((granularity) => {
    const config = displayConfigs[granularity];
    contextMenu.addItem((item) =>
      item
        .setTitle(config.labelOpenPresent)
        .setIcon(`calendar-${granularity}`)
        .onClick(() => {
          plugin.openPeriodicNote(granularity, window.moment());
        })
    );
  });

  contextMenu.showAtPosition(position);
}
