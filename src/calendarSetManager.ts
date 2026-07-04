import type { DailyNotesSettings } from "obsidian";
import { get, type Writable } from "svelte/store";

import { getConfig, getFormat } from "./calendarSet";
import { DEFAULT_CALENDARSET_ID } from "./constants";
import {
  granularities,
  type CalendarSet,
  type Granularity,
  type ISettings,
  type PeriodicConfig,
} from "./types";

interface IPerioditySettings {
  enabled: boolean;
  folder?: string;
  format?: string;
  template?: string;
}

interface ILegacySettings {
  showGettingStartedBanner: boolean;
  hasMigratedDailyNoteSettings: boolean;
  hasMigratedWeeklyNoteSettings: boolean;

  daily: IPerioditySettings;
  weekly: IPerioditySettings;
  monthly: IPerioditySettings;
  quarterly: IPerioditySettings;
  yearly: IPerioditySettings;
}

export function isLegacySettings(settings: unknown): settings is ILegacySettings {
  const maybeLegacySettings = settings as ILegacySettings;
  return !!(
    maybeLegacySettings.daily ||
    maybeLegacySettings.weekly ||
    maybeLegacySettings.monthly ||
    maybeLegacySettings.yearly ||
    maybeLegacySettings.quarterly
  );
}

export function migrateDailyNoteSettings(settings: ILegacySettings): CalendarSet {
  const migrateConfig = (settings: DailyNotesSettings) => {
    return {
      enabled: true,
      format: settings.format || "",
      folder: settings.folder || "",
      openAtStartup: settings.autorun,
      templatePath: settings.template,
    } as PeriodicConfig;
  };

  return {
    id: DEFAULT_CALENDARSET_ID,
    ctime: window.moment().format(),
    day: migrateConfig(settings.daily),
  };
}

export function migrateLegacySettingsToCalendarSet(
  settings: ILegacySettings
): CalendarSet {
  const migrateConfig = (settings: ILegacySettings["daily"]) => {
    return {
      enabled: settings.enabled,
      format: settings.format || "",
      folder: settings.folder || "",
      openAtStartup: false,
      templatePath: settings.template,
    } as PeriodicConfig;
  };

  return {
    id: DEFAULT_CALENDARSET_ID,
    ctime: window.moment().format(),
    day: migrateConfig(settings.daily),
    week: migrateConfig(settings.weekly),
    month: migrateConfig(settings.monthly),
    quarter: migrateConfig(settings.quarterly),
    year: migrateConfig(settings.yearly),
  };
}

export default class CalendarSetManager {
  constructor(readonly settings: Writable<ISettings>) {}

  public getActiveId(): string {
    return get(this.settings).activeCalendarSet;
  }

  public getActiveSet(): CalendarSet {
    const settings = get(this.settings);
    const activeSet = settings.calendarSets.find(
      (set) => set.id === settings.activeCalendarSet
    );
    if (!activeSet) {
      throw new Error("No active calendar set found");
    }
    return activeSet;
  }

  public getFormat(granularity: Granularity): string {
    const activeSet = this.getActiveSet();
    return getFormat(activeSet, granularity);
  }

  public getActiveConfig(granularity: Granularity): PeriodicConfig {
    const activeSet = this.getActiveSet();
    return getConfig(activeSet, granularity);
  }

  public getCalendarSets(): CalendarSet[] {
    return get(this.settings).calendarSets;
  }

  public getActiveGranularities(): Granularity[] {
    const activeSet = this.getActiveSet();
    return granularities.filter((granularity) => activeSet[granularity]?.enabled);
  }

  public setActiveSet(id: string): void {
    this.settings.update((s) => {
      s.activeCalendarSet = id;
      return s;
    });
  }

  public renameCalendarset(calendarSetId: string, proposedName: string): void {
    if (calendarSetId === proposedName.trim()) {
      return;
    }

    if (proposedName.trim() === "") {
      throw new Error("Name required");
    }

    this.settings.update((settings) => {
      const existingSetWithName = settings.calendarSets.find(
        (c) => c.id === proposedName
      );

      if (existingSetWithName) {
        throw new Error(`A calendar set with the name '${proposedName}' already exists`);
      }

      const calendarSet = settings.calendarSets.find((c) => c.id === calendarSetId);
      if (calendarSet) {
        calendarSet.id = proposedName;
        if (settings.activeCalendarSet === calendarSetId) {
          settings.activeCalendarSet = proposedName;
        }
      }

      return settings;
    });
  }
}
