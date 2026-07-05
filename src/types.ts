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

// --- Settings shape ---

export interface ISettings {
  showGettingStartedBanner: boolean;
  hasMigratedDailyNoteSettings: boolean;
  hasMigratedWeeklyNoteSettings: boolean;
  installedVersion: string;

  enableTimelineComplication: boolean;

  // Per-granularity note configs (flat)
  day?: PeriodicConfig;
  week?: PeriodicConfig;
  month?: PeriodicConfig;
  quarter?: PeriodicConfig;
  year?: PeriodicConfig;

  // Calendar view settings
  showWeekNums: boolean;
  useJapaneseWeekdays: boolean;
  wordsPerDot: number;
  shouldConfirmBeforeCreate: boolean;
}

// --- Cache data types ---

export type MatchType = "filename" | "frontmatter" | "date-prefixed";

export interface PeriodicNoteMatchMatchData {
  matchType: MatchType;
  exact: boolean;
}

export interface PeriodicNoteCachedMetadata {
  filePath: string;
  date: Moment;
  granularity: Granularity;
  canonicalDateStr: string;
  matchData: PeriodicNoteMatchMatchData;
}

// --- Options types ---

export interface IOpenOpts {
  inNewSplit?: boolean;
}

// --- Narrow interfaces replacing the plugin service-locator ---

export interface INoteOps {
  settings: Readable<ISettings>;

  openPeriodicNote(granularity: Granularity, date: Moment, opts?: IOpenOpts): Promise<void>;
  getPeriodicNote(granularity: Granularity, date: Moment): TFile | null;
  createPeriodicNote(granularity: Granularity, date: Moment): Promise<TFile>;
  getActiveGranularities(): Granularity[];
  getActiveConfig(granularity: Granularity): PeriodicConfig;
  getFormat(granularity: Granularity): string;
}

export interface INoteIndex {
  findInCache(filePath: string): PeriodicNoteCachedMetadata | null;
  findAdjacent(
    filePath: string,
    direction: "forwards" | "backwards"
  ): PeriodicNoteCachedMetadata | null;
  isPeriodic(filePath: string, granularity?: Granularity): boolean;
  getPeriodicNotes(
    granularity: Granularity,
    date: Moment,
    includeFinerGranularities?: boolean
  ): PeriodicNoteCachedMetadata[];
}

export interface IPeriodicNoteController extends INoteOps, INoteIndex {
  app: App;
  registerEvent(eventRef: EventRef): void;
}
