import { DEFAULT_CALENDARSET_ID } from "src/constants";
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
  showGettingStartedBanner: true,
  hasMigratedDailyNoteSettings: false,
  hasMigratedWeeklyNoteSettings: false,

  // Configuration / Preferences
  activeCalendarSet: DEFAULT_CALENDARSET_ID,
  calendarSets: [],
  enableTimelineComplication: true,
};
