import { App, PluginSettingTab, Setting, type SettingDefinitionItem } from "obsidian";
import { mount, unmount } from "svelte";
import { get } from "svelte/store";

import type WeeklyNotesPlugin from "../main";
import {
  configureGlobalMomentLocale,
  getLocalizationSettings,
  type IWeekStartOption,
} from "./localization";
import GranularitySection from "./pages/GranularitySection.svelte";
import { getLocaleOptions, getWeekStartOptions } from "./utils";

export type { ISettings } from "src/types";
export { DEFAULT_SETTINGS, DEFAULT_PERIODIC_CONFIG } from "./defaults";

export class PeriodicNotesSettingsTab extends PluginSettingTab {
  private view: ReturnType<typeof mount> | null = null;

  constructor(readonly app: App, readonly plugin: WeeklyNotesPlugin) {
    super(app, plugin);
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [];
  }

  // eslint-disable-next-line obsidianmd/settings-tab/no-deprecated-display -- getSettingDefinitions returns [], Obsidian calls display() for rendering
  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // Granularity section: tab bar + per-granularity config (custom Svelte UI)
    this.view = mount(GranularitySection, {
      target: containerEl.createDiv("periodic-notes-granularity-section"),
      props: { app: this.app, settings: this.plugin.settings },
    });

    // Calendar section
    new Setting(containerEl).setHeading().setName("Calendar");
    const calendarItems = containerEl.createDiv("setting-group").createDiv("setting-items");

    new Setting(calendarItems)
      // eslint-disable-next-line obsidianmd/ui/sentence-case -- "Timeline" is a proper feature name
      .setName('Show "Timeline" complication on periodic notes')
      .setDesc("Adds a collapsible timeline to the top-right of all periodic notes")
      .addToggle((t) =>
        t
          .setValue(get(this.plugin.settings).enableTimelineComplication)
          .onChange((val) => {
            this.plugin.settings.update((s) => ({ ...s, enableTimelineComplication: val }));
          })
      );

    new Setting(calendarItems)
      .setName("Show week numbers")
      // eslint-disable-next-line obsidianmd/ui/sentence-case -- ISO is an acronym
      .setDesc("Display ISO week numbers in the left column of the calendar")
      .addToggle((t) =>
        t
          .setValue(get(this.plugin.settings).showWeekNums)
          .onChange((val) => {
            this.plugin.settings.update((s) => ({ ...s, showWeekNums: val }));
          })
      );

    new Setting(calendarItems)
      .setName("Japanese weekday labels")
      .setDesc("Show weekdays as single kanji characters (日/月/火/水/木/金/土)")
      .addToggle((t) =>
        t
          .setValue(get(this.plugin.settings).useJapaneseWeekdays ?? false)
          .onChange((val) => {
            this.plugin.settings.update((s) => ({ ...s, useJapaneseWeekdays: val }));
          })
      );

    new Setting(calendarItems)
      .setName("Confirm before creating note")
      .setDesc("Show a confirmation prompt before creating a new periodic note from the calendar")
      .addToggle((t) =>
        t
          .setValue(get(this.plugin.settings).shouldConfirmBeforeCreate)
          .onChange((val) => {
            this.plugin.settings.update((s) => ({ ...s, shouldConfirmBeforeCreate: val }));
          })
      );

    new Setting(calendarItems)
      .setName("Words per dot")
      .setDesc("Number of words in a daily note required to add one dot (0 to disable)")
      .addText((t) => {
        t.inputEl.type = "number";
        t.inputEl.min = "0";
        t.inputEl.step = "50";
        t.setValue(String(get(this.plugin.settings).wordsPerDot)).onChange((val) => {
          const num = parseInt(val, 10);
          if (!isNaN(num) && num >= 0) {
            this.plugin.settings.update((s) => ({ ...s, wordsPerDot: num }));
          }
        });
      });

    // Localization section
    new Setting(containerEl)
      .setHeading()
      .setName("Localization")
      .setDesc(
        "These settings are applied to your entire vault, meaning the values you specify here may impact other plugins as well."
      );
    const localizationItems = containerEl.createDiv("setting-group").createDiv("setting-items");

    const localization = getLocalizationSettings(this.app);

    new Setting(localizationItems)
      .setName("Start week on")
      .setDesc(
        "Choose what day of the week to start. Select 'locale default' to use the default specified by moment.js"
      )
      .addDropdown((d) => {
        for (const { label, value } of getWeekStartOptions()) {
          d.addOption(value, label);
        }
        d.setValue(localization.weekStart).onChange((val) => {
          this.app.vault.setConfig("weekStart", val as IWeekStartOption);
          configureGlobalMomentLocale(
            getLocalizationSettings(this.app).localeOverride,
            val as IWeekStartOption
          );
        });
      });

    new Setting(localizationItems)
      .setName("Locale")
      .setDesc("Override the locale used by the calendar and other plugins")
      .addDropdown((d) => {
        for (const { label, value } of getLocaleOptions()) {
          d.addOption(value, label);
        }
        d.setValue(localization.localeOverride).onChange((val) => {
          this.app.vault.setConfig("localeOverride", val);
          configureGlobalMomentLocale(val, getLocalizationSettings(this.app).weekStart);
        });
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
