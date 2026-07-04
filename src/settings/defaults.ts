import type { ISettings, PeriodicConfig } from "src/types";

export const DEFAULT_PERIODIC_CONFIG: PeriodicConfig = Object.freeze({
  enabled: false,
  openAtStartup: false,

  format: "",
  templatePath: "",
  folder: "",
});

export const DEFAULT_SETTINGS: ISettings = {
  // Onboarding
  installedVersion: "1.0.0-beta3",
  showGettingStartedBanner: false,
  hasMigratedDailyNoteSettings: false,
  hasMigratedWeeklyNoteSettings: false,

  enableTimelineComplication: true,

  // Per-granularity defaults (day enabled by default)
  day: { ...DEFAULT_PERIODIC_CONFIG, enabled: true },
  week: { ...DEFAULT_PERIODIC_CONFIG },
  month: { ...DEFAULT_PERIODIC_CONFIG },
  quarter: { ...DEFAULT_PERIODIC_CONFIG },
  year: { ...DEFAULT_PERIODIC_CONFIG },

  // Calendar view
  showWeekNums: false,
  wordsPerDot: 250,
  shouldConfirmBeforeCreate: true,
};
