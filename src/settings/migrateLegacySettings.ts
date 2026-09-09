import { granularities, type ISettings, type PeriodicConfig } from "../types";
import { DEFAULT_PERIODIC_CONFIG, DEFAULT_SETTINGS } from "./defaults";

// Shape of the old calendarSets-based data.json (for migration)
export interface LegacyCalendarSetData {
  id: string;
  day?: PeriodicConfig;
  week?: PeriodicConfig;
  month?: PeriodicConfig;
  quarter?: PeriodicConfig;
  year?: PeriodicConfig;
}

export interface LegacyPeriodicitySettings {
  enabled: boolean;
  folder?: string;
  format?: string;
  template?: string;
}

export interface LegacyPluginData {
  daily?: LegacyPeriodicitySettings;
  weekly?: LegacyPeriodicitySettings;
  monthly?: LegacyPeriodicitySettings;
  quarterly?: LegacyPeriodicitySettings;
  yearly?: LegacyPeriodicitySettings;
  calendarSets?: LegacyCalendarSetData[];
}

export type LegacySavedData = (LegacyPluginData & Partial<ISettings>) | null;

// Merges a loaded data.json (whatever era it's from) onto DEFAULT_SETTINGS and
// migrates it to the current flat ISettings shape. Detects three legacy
// generations, oldest-format fields checked first so a file that happens to
// carry stray keys from more than one era still resolves to its true origin.
export function migrateLegacySettings(
  savedData: LegacySavedData,
  hasLegacyDailyNoteSettings: boolean
): ISettings {
  const settings: ISettings = Object.assign({}, DEFAULT_SETTINGS, savedData || {});

  // Migration 1: old calendarSets array → flat fields.
  if (savedData?.calendarSets?.length) {
    const set = savedData.calendarSets[0];
    for (const g of granularities) {
      if (set[g]) settings[g] = set[g];
    }
    // Remove the old keys to keep data.json clean on next save
    delete (settings as unknown as Record<string, unknown>).calendarSets;
    delete (settings as unknown as Record<string, unknown>).activeCalendarSet;
  }
  // Migration 2: very old daily/weekly/etc. format
  else if (
    savedData?.daily ||
    savedData?.weekly ||
    savedData?.monthly ||
    savedData?.quarterly ||
    savedData?.yearly
  ) {
    const migrateConfig = (src: LegacyPeriodicitySettings | undefined): PeriodicConfig => ({
      enabled: src?.enabled ?? false,
      format: src?.format || "",
      folder: src?.folder || "",
      openAtStartup: false,
      templatePath: src?.template,
    });
    if (savedData.daily) settings.day = migrateConfig(savedData.daily);
    if (savedData.weekly) settings.week = migrateConfig(savedData.weekly);
    if (savedData.monthly) settings.month = migrateConfig(savedData.monthly);
    if (savedData.quarterly) settings.quarter = migrateConfig(savedData.quarterly);
    if (savedData.yearly) settings.year = migrateConfig(savedData.yearly);
  }
  // Migration 3: very old Obsidian daily-notes plugin settings
  else if (!savedData?.day && hasLegacyDailyNoteSettings) {
    settings.day = {
      ...DEFAULT_PERIODIC_CONFIG,
      enabled: true,
    };
  }

  return settings;
}
