import { App, Menu, Modal, type Point } from "obsidian";

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
export class PeriodicNoteCreateModal extends Modal {
  constructor(app: App, readonly plugin: INoteOps) {
    super(app);

    this.contentEl.addClass("periodic-modal");
    this.contentEl.createEl("h2", { text: "Open periodic note" });

    plugin.getActiveGranularities().forEach((granularity) => {
      const displayConfig = displayConfigs[granularity];
      const config = plugin.getActiveConfig(granularity);

      const noteExists = plugin.getPeriodicNote(granularity, window.moment());
      const template = config.templatePath;

      this.contentEl.createDiv("setting-item", (rowEl) => {
        rowEl.createDiv("setting-item-info", (descEl) => {
          descEl.createDiv({
            text: `Create ${displayConfig.periodicity} note`,
            cls: "setting-item-name",
          });
          descEl.createDiv({
            cls: "setting-item-description",
            text: template ? `Using template from ${template}` : "No template found",
          });
        });

        rowEl.createDiv("setting-item-control", (controlEl) => {
          let button: HTMLButtonElement;
          if (noteExists) {
            button = controlEl.createEl("button", {
              text: `View ${displayConfig.relativeUnit}`,
              cls: "mod-cta",
            });
          } else {
            button = controlEl.createEl("button", {
              text: `Create ${displayConfig.relativeUnit}`,
            });
          }

          button.addEventListener("click", () => {
            plugin.openPeriodicNote(granularity, window.moment());
            this.close();
          });
        });
      });
    });
  }
}
