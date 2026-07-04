import { App, PluginSettingTab, type SettingDefinitionItem } from "obsidian";
import { mount, unmount } from "svelte";

import type WeeklyNotesPlugin from "../main";
import SettingsRouter from "./pages/Router.svelte";

export type { ISettings } from "src/types";
export { DEFAULT_SETTINGS, DEFAULT_PERIODIC_CONFIG } from "./defaults";

export class PeriodicNotesSettingsTab extends PluginSettingTab {
  private view: ReturnType<typeof mount> | null = null;

  constructor(readonly app: App, readonly plugin: WeeklyNotesPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [];
  }

  // eslint-disable-next-line obsidianmd/settings-tab/no-deprecated-display -- getSettingDefinitions returns [], so Obsidian still calls display() for rendering
  display(): void {
    this.containerEl.empty();

    this.view = mount(SettingsRouter, {
      target: this.containerEl,
      props: {
        app: this.app,
        settings: this.plugin.settings,
      },
    });
  }

  hide() {
    super.hide();
    if (this.view) {
      unmount(this.view);
      this.view = null;
    }
  }
}
