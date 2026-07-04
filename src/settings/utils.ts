import { App, DailyNotesPlugin, type DailyNotesSettings } from "obsidian";
import { get, type Readable } from "svelte/store";

import type { Granularity, ISettings } from "src/types";
import { granularities } from "src/types";

export const wrapAround = (value: number, size: number): number => {
  return ((value % size) + size) % size;
};

export function isDailyNotesPluginEnabled(app: App): boolean {
  return app.internalPlugins.getPluginById("daily-notes").enabled;
}

function getDailyNotesPlugin(app: App): DailyNotesPlugin | null {
  const installedPlugin = app.internalPlugins.getPluginById("daily-notes");
  if (installedPlugin) {
    return installedPlugin.instance as DailyNotesPlugin;
  }
  return null;
}

export function hasLegacyDailyNoteSettings(app: App): boolean {
  const options = getDailyNotesPlugin(app)?.options || {};
  return !!(options.format || options.folder || options.template);
}

export function getLegacyDailyNoteSettings(app: App): DailyNotesSettings {
  const dailyNotesInstalledPlugin = app.internalPlugins.plugins["daily-notes"];
  if (!dailyNotesInstalledPlugin) {
    return {
      folder: "",
      template: "",
      format: "",
    };
  }

  const options = {
    format: "",
    folder: "",
    template: "",
    ...getDailyNotesPlugin(app)?.options,
  };
  return {
    format: options.format,
    folder: options.folder?.trim(),
    template: options.template?.trim(),
  };
}

export function disableDailyNotesPlugin(app: App): void {
  app.internalPlugins.getPluginById("daily-notes").disable(true);
}

export function getLocaleOptions() {
  const sysLocale = navigator.language?.toLowerCase();
  return [
    { label: `Same as system (${sysLocale})`, value: "system-default" },
    ...window.moment.locales().map((locale) => ({
      label: locale,
      value: locale,
    })),
  ];
}

export function getWeekStartOptions() {
  const weekdays = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const localizedWeekdays = window.moment.weekdays();
  const localeWeekStartNum = window._bundledLocaleWeekSpec.dow;
  const localeWeekStart = localizedWeekdays[localeWeekStartNum];
  return [
    { label: `Locale default (${localeWeekStart})`, value: "locale" },
    ...localizedWeekdays.map((day, i) => ({ value: weekdays[i], label: day })),
  ];
}

export function findStartupNoteConfig(
  settings: Readable<ISettings>
): { granularity: Granularity } | null {
  const s = get(settings);
  for (const granularity of granularities) {
    if (s[granularity]?.openAtStartup) {
      return { granularity };
    }
  }
  return null;
}

export function clearStartupNote(settings: ISettings): ISettings {
  for (const granularity of granularities) {
    const config = settings[granularity];
    if (config?.openAtStartup) {
      config.openAtStartup = false;
    }
  }
  return settings;
}
