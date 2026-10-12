import { Menu, type Point } from "obsidian";
import { get } from "svelte/store";

import { activeGranularities, displayConfigs, iconId } from "./granularity";
import type { INoteOps } from "./types";

export function showFileMenu(
  plugin: INoteOps,
  position: Point
): void {
  const contextMenu = new Menu();

  activeGranularities(get(plugin.settings)).forEach((granularity) => {
    const config = displayConfigs[granularity];
    contextMenu.addItem((item) =>
      item
        .setTitle(config.labelOpenPresent)
        .setIcon(iconId(granularity))
        .onClick(() => {
          plugin.openPeriodicNote(granularity, window.moment());
        })
    );
  });

  contextMenu.showAtPosition(position);
}
