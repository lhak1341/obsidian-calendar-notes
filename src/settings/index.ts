import { App, PluginSettingTab, type SettingDefinitionItem } from "obsidian";
import { DEFAULT_CALENDARSET_ID } from "src/constants";
import type { ISettings, PeriodicConfig } from "src/types";
import { mount, unmount } from "svelte";

import type WeeklyNotesPlugin from "../main";
import SettingsRouter from "./pages/Router.svelte";

export type { ISettings } from "src/types";

export const DEFAULT_SETTINGS: ISettings = {
  // Onboarding
  installedVersion: "1.0.0-beta3",
  showGettingStartedBanner: true,
  hasMigratedDailyNoteSettings: false,
  hasMigratedWeeklyNoteSettings: false,

  // Configuration / Preferences
  activeCalendarSet: DEFAULT_CALENDARSET_ID,
  calendarSets: [],
  enableTimelineComplication: true,
};

export const DEFAULT_PERIODIC_CONFIG: PeriodicConfig = Object.freeze({
  enabled: false,
  openAtStartup: false,

  format: "",
  templatePath: "",
  folder: "",
});

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
        manager: this.plugin.calendarSetManager,
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
