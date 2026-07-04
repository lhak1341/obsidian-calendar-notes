import sortBy from "lodash/sortBy";
import type { Moment } from "moment";
import {
  App,
  Component,
  parseFrontMatterEntry,
  TAbstractFile,
  TFile,
  TFolder,
  type CachedMetadata,
} from "obsidian";

import { DEFAULT_FORMAT } from "./constants";
import type PeriodicNotesPlugin from "./main";
import { getLooselyMatchedDate } from "./parser";
import { getDateInput } from "./settings/validation";
import { granularities, type CalendarSet, type Granularity, type PeriodicConfig } from "./types";
import { applyPeriodicTemplateToFile, getPossibleFormats } from "./utils";

export type MatchType = "filename" | "frontmatter" | "date-prefixed";

export interface PeriodicNoteMatchMatchData {
  /* where was the date found */
  matchType: MatchType;
  /* XXX: keep ZK matches in the cache, should this be separate from formats with HH:mm in them? */
  /* just collect this for now, not 100% sure how it will be used. */
  exact: boolean;
}

function compareGranularity(a: Granularity, b: Granularity) {
  const idxA = granularities.indexOf(a);
  const idxB = granularities.indexOf(b);
  if (idxA === idxB) return 0;
  if (idxA < idxB) return -1;
  return 1;
}

export interface PeriodicNoteCachedMetadata {
  calendarSet: string;
  filePath: string;
  date: Moment;
  granularity: Granularity;
  canonicalDateStr: string;

  /* "how" the match was made */
  matchData: PeriodicNoteMatchMatchData;
}

function getCanonicalDateString(_granularity: Granularity, date: Moment): string {
  return date.toISOString();
}

export class PeriodicNotesCache extends Component {
  public cachedFiles: Map<string, Map<string, PeriodicNoteCachedMetadata>>;

  constructor(readonly app: App, readonly plugin: PeriodicNotesPlugin) {
    super();
    this.cachedFiles = new Map();

    this.app.workspace.onLayoutReady(() => {
      console.info("[Periodic Notes] initializing cache");
      this.initialize();
      this.registerEvent(
        this.app.vault.on("create", (file) => {
          if (file instanceof TFile) this.resolve(file, "create");
        })
      );
      this.registerEvent(this.app.vault.on("rename", this.resolveRename, this));
      this.registerEvent(
        this.app.metadataCache.on("changed", this.resolveChangedMetadata, this)
      );
      this.registerEvent(
        this.app.workspace.on("periodic-notes:settings-updated", this.reset, this)
      );
    });
  }

  public reset(): void {
    console.info("[Periodic Notes] resetting cache");
    this.cachedFiles.clear();
    this.initialize();
  }

  private recurseChildren(folder: TFolder, cb: (file: TFile) => void): void {
    for (const child of folder.children) {
      if (child instanceof TFile) {
        cb(child);
      } else if (child instanceof TFolder) {
        this.recurseChildren(child, cb);
      }
    }
  }

  public initialize(): void {
    for (const calendarSet of this.plugin.calendarSetManager.getCalendarSets()) {
      const activeGranularities = granularities.filter((g) => calendarSet[g]?.enabled);
      for (const granularity of activeGranularities) {
        const config = calendarSet[granularity] as PeriodicConfig;
        const rootFolder = this.app.vault.getAbstractFileByPath(config.folder || "/");
        if (!(rootFolder instanceof TFolder)) continue;

        this.recurseChildren(rootFolder, (file) => {
          this.resolve(file, "initialize");
          const metadata = this.app.metadataCache.getFileCache(file);
          if (metadata) {
            this.resolveChangedMetadata(file, "", metadata);
          }
        });
      }
    }
  }

  private resolveChangedMetadataForCalendarSet(
    file: TFile,
    cache: CachedMetadata,
    calendarSet: CalendarSet
  ): void {
    const activeGranularities = granularities.filter((g) => calendarSet[g]?.enabled);
    for (const granularity of activeGranularities) {
      const folder = calendarSet[granularity]?.folder || "";
      if (!file.path.startsWith(folder)) continue;

      const frontmatterEntry = parseFrontMatterEntry(cache.frontmatter, granularity);
      if (!frontmatterEntry) continue;

      if (typeof frontmatterEntry === "string") {
        const date = window.moment(frontmatterEntry, DEFAULT_FORMAT[granularity], true);
        if (date.isValid()) {
          this.set(calendarSet.id, file.path, {
            calendarSet: calendarSet.id,
            filePath: file.path,
            date,
            granularity,
            canonicalDateStr: getCanonicalDateString(granularity, date),
            matchData: { exact: true, matchType: "frontmatter" },
          });
        }
        return; // handled this calendarSet (even if date was invalid)
      }
    }
  }

  private resolveChangedMetadata(
    file: TFile,
    _data: string,
    cache: CachedMetadata
  ): void {
    const manager = this.plugin.calendarSetManager;
    for (const calendarSet of manager.getCalendarSets()) {
      this.resolveChangedMetadataForCalendarSet(file, cache, calendarSet);
    }
  }

  private resolveRename(file: TAbstractFile, oldPath: string): void {
    for (const [, cache] of this.cachedFiles) {
      if (file instanceof TFile) {
        cache.delete(oldPath);
        this.resolve(file, "rename");
      }
    }
  }

  private resolveByFilename(
    file: TFile,
    calendarSet: CalendarSet,
    granularity: Granularity,
    reason: "create" | "rename" | "initialize"
  ): boolean {
    const folder = calendarSet[granularity]?.folder || "";
    if (!file.path.startsWith(folder)) return false;

    const formats = getPossibleFormats(calendarSet, granularity);
    const dateInputStr = getDateInput(file, formats[0], granularity);
    const date = window.moment(dateInputStr, formats, true);
    if (!date.isValid()) return false;

    const metadata: PeriodicNoteCachedMetadata = {
      calendarSet: calendarSet.id,
      filePath: file.path,
      date,
      granularity,
      canonicalDateStr: getCanonicalDateString(granularity, date),
      matchData: { exact: true, matchType: "filename" },
    };
    this.set(calendarSet.id, file.path, metadata);

    if (reason === "create" && file.stat.size === 0) {
      applyPeriodicTemplateToFile(this.app, file, calendarSet, metadata);
    }

    this.app.workspace.trigger("periodic-notes:resolve", granularity, file);
    return true;
  }

  private resolveByLooseMatch(file: TFile, calendarSet: CalendarSet): boolean {
    const nonStrictDate = getLooselyMatchedDate(file.basename);
    if (!nonStrictDate) return false;

    this.set(calendarSet.id, file.path, {
      calendarSet: calendarSet.id,
      filePath: file.path,
      date: nonStrictDate.date,
      granularity: nonStrictDate.granularity,
      canonicalDateStr: getCanonicalDateString(
        nonStrictDate.granularity,
        nonStrictDate.date
      ),
      matchData: { exact: false, matchType: "filename" },
    });

    this.app.workspace.trigger(
      "periodic-notes:resolve",
      nonStrictDate.granularity,
      file
    );
    return true;
  }

  private resolveForCalendarSet(
    file: TFile,
    calendarSet: CalendarSet,
    reason: "create" | "rename" | "initialize"
  ): void {
    const activeGranularities = granularities.filter((g) => calendarSet[g]?.enabled);
    if (activeGranularities.length === 0) return;

    // frontmatter entries supercede filename matches
    const existingEntry = this.cachedFiles.get(calendarSet.id)?.get(file.path);
    if (existingEntry?.matchData.matchType === "frontmatter") return;

    for (const granularity of activeGranularities) {
      if (this.resolveByFilename(file, calendarSet, granularity, reason)) return;
    }

    this.resolveByLooseMatch(file, calendarSet);
  }

  private resolve(
    file: TFile,
    reason: "create" | "rename" | "initialize" = "create"
  ): void {
    const manager = this.plugin.calendarSetManager;
    for (const calendarSet of manager.getCalendarSets()) {
      this.resolveForCalendarSet(file, calendarSet, reason);
    }
  }

  public getPeriodicNote(
    calendarSet: string,
    granularity: Granularity,
    targetDate: Moment
  ): TFile | null {
    const metadata = this.cachedFiles.get(calendarSet);
    if (metadata) {
      for (const [filePath, cacheData] of metadata) {
        if (
          cacheData.granularity === granularity &&
          cacheData.matchData.exact === true &&
          cacheData.date.isSame(targetDate, granularity)
        ) {
          const file = this.app.vault.getAbstractFileByPath(filePath);
          return file instanceof TFile ? file : null;
        }
      }
    }

    return null;
  }

  public getPeriodicNotes(
    calendarSet: string,
    granularity: Granularity,
    targetDate: Moment,
    includeFinerGranularities = false
  ): PeriodicNoteCachedMetadata[] {
    const matches: PeriodicNoteCachedMetadata[] = [];
    const metadata = this.cachedFiles.get(calendarSet);
    if (metadata) {
      for (const [, cacheData] of metadata) {
        if (
          (granularity === cacheData.granularity ||
            (includeFinerGranularities &&
              compareGranularity(cacheData.granularity, granularity) <= 0)) &&
          cacheData.date.isSame(targetDate, granularity)
        ) {
          matches.push(cacheData);
        }
      }
    }

    return matches;
  }

  private set(
    calendarSet: string,
    filePath: string,
    metadata: PeriodicNoteCachedMetadata
  ) {
    let cache = this.cachedFiles.get(calendarSet);
    if (!cache) {
      cache = new Map();
      this.cachedFiles.set(calendarSet, cache);
    }

    cache.set(filePath, metadata);
  }

  public isPeriodic(targetPath: string, granularity?: Granularity): boolean {
    for (const [, calendarSetCache] of this.cachedFiles) {
      const metadata = calendarSetCache.get(targetPath);
      if (!metadata) continue;
      if (!granularity || granularity === metadata.granularity) return true;
    }
    return false;
  }

  public find(
    filePath: string | undefined,
    calendarSet?: string
  ): PeriodicNoteCachedMetadata | null {
    if (!filePath) return null;

    if (calendarSet) {
      const cache = this.cachedFiles.get(calendarSet);
      return cache?.get(filePath) ?? null;
    }

    // Check the active calendar set first
    const activeCache = this.cachedFiles.get(
      this.plugin.calendarSetManager.getActiveId()
    );
    const metadata = activeCache?.get(filePath);
    if (metadata) {
      return metadata;
    }

    for (const [, calendarSetCache] of this.cachedFiles) {
      const metadata = calendarSetCache.get(filePath);
      if (metadata) {
        return metadata;
      }
    }
    return null;
  }

  public findAdjacent(
    calendarSet: string,
    filePath: string,
    direction: "forwards" | "backwards"
  ): PeriodicNoteCachedMetadata | null {
    const currMetadata = this.find(filePath, calendarSet);
    if (!currMetadata) return null;

    const granularity = currMetadata.granularity;
    const cache = this.cachedFiles.get(calendarSet)?.values() ?? [];

    const sortedCache = sortBy(
      Array.from(cache).filter((m) => m.granularity === granularity),
      ["canonicalDateStr"]
    );
    const activeNoteIndex = sortedCache.findIndex((m) => m.filePath === filePath);

    const offset = direction === "forwards" ? 1 : -1;
    return sortedCache[activeNoteIndex + offset];
  }
}
