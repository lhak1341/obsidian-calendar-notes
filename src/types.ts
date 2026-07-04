import type { Moment } from "moment";
import type { App, EventRef, TFile } from "obsidian";
import type { Readable } from "svelte/store";

export type IPeriodicity = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
export type Granularity =
  | "day"
  | "week"
  | "month"
  | "quarter"
  | "year"; /*| "fiscal-year" */

export const granularities: Granularity[] = [
  "day",
  "week",
  "month",
  "quarter",
  "year" /*", fiscal-year" */,
];

export interface PeriodicConfig {
  enabled: boolean;
  openAtStartup: boolean;

  format: string;
  folder: string;
  templatePath?: string;
}

export interface CalendarSet {
  id: string;
  ctime: string;

  day?: PeriodicConfig;
  week?: PeriodicConfig;
  month?: PeriodicConfig;
  quarter?: PeriodicConfig;
  year?: PeriodicConfig;
  fiscalYear?: PeriodicConfig;
}

// --- Settings shape (moved here so calendarSetManager and types can import without cycles) ---

export interface ISettings {
  showGettingStartedBanner: boolean;
  hasMigratedDailyNoteSettings: boolean;
  hasMigratedWeeklyNoteSettings: boolean;
  installedVersion: string;

  activeCalendarSet: string;
  calendarSets: CalendarSet[];

  enableTimelineComplication: boolean;
}

// --- Cache data types (moved here so IPeriodicNoteController can reference them without cycles) ---

export type MatchType = "filename" | "frontmatter" | "date-prefixed";

export interface PeriodicNoteMatchMatchData {
  matchType: MatchType;
  exact: boolean;
}

export interface PeriodicNoteCachedMetadata {
  calendarSet: string;
  filePath: string;
  date: Moment;
  granularity: Granularity;
  canonicalDateStr: string;
  matchData: PeriodicNoteMatchMatchData;
}

// --- Options types ---

export interface IOpenOpts {
  inNewSplit?: boolean;
  calendarSet?: string;
}

// --- Narrow interfaces replacing the plugin service-locator ---

export interface ICalendarSetSource {
  getCalendarSets(): CalendarSet[];
  getActiveId(): string;
}

export interface IPeriodicNoteController {
  app: App;
  registerEvent(eventRef: EventRef): void;
  settings: Readable<ISettings>;

  // note operations
  openPeriodicNote(granularity: Granularity, date: Moment, opts?: IOpenOpts): Promise<void>;
  getPeriodicNote(granularity: Granularity, date: Moment): TFile | null;
  getPeriodicNotes(
    granularity: Granularity,
    date: Moment,
    includeFinerGranularities?: boolean
  ): PeriodicNoteCachedMetadata[];
  createPeriodicNote(granularity: Granularity, date: Moment): Promise<TFile>;

  // cache queries
  findInCache(filePath: string): PeriodicNoteCachedMetadata | null;
  findAdjacent(
    calendarSet: string,
    filePath: string,
    direction: "forwards" | "backwards"
  ): PeriodicNoteCachedMetadata | null;
  isPeriodic(filePath: string, granularity?: Granularity): boolean;

  // calendar-set queries (delegated from CalendarSetManager)
  getActiveId(): string;
  getActiveGranularities(): Granularity[];
  getActiveConfig(granularity: Granularity): PeriodicConfig;
  getActiveSet(): CalendarSet;
  getCalendarSets(): CalendarSet[];
  getFormat(granularity: Granularity): string;
  setActiveSet(id: string): void;
}
