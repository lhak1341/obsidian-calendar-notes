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
import { get, type Readable } from "svelte/store";

import { getPossibleFormats } from "./calendarSet";
import { DEFAULT_CALENDARSET_ID } from "./constants";
import { DEFAULT_FORMAT } from "./constants";
import { getLooselyMatchedDate } from "./parser";
import { getDateInput } from "./settings/validation";
import {
  granularities,
  type Granularity,
  type ISettings,
  type PeriodicConfig,
  type PeriodicNoteCachedMetadata,
} from "./types";
import { applyPeriodicTemplateToFile } from "./utils";

function compareGranularity(a: Granularity, b: Granularity) {
  const idxA = granularities.indexOf(a);
  const idxB = granularities.indexOf(b);
  if (idxA === idxB) return 0;
  if (idxA < idxB) return -1;
  return 1;
}

function getCanonicalDateString(_granularity: Granularity, date: Moment): string {
  return date.toISOString();
}

export class PeriodicNotesCache extends Component {
  public cachedFiles: Map<string, PeriodicNoteCachedMetadata>;

  constructor(readonly app: App, readonly settingsStore: Readable<ISettings>) {
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
    const settings = get(this.settingsStore);
    const activeGranularities = granularities.filter((g) => settings[g]?.enabled);
    for (const granularity of activeGranularities) {
      const config = settings[granularity] as PeriodicConfig;
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

  private resolveChangedMetadata(
    file: TFile,
    _data: string,
    cache: CachedMetadata
  ): void {
    const settings = get(this.settingsStore);
    const activeGranularities = granularities.filter((g) => settings[g]?.enabled);
    for (const granularity of activeGranularities) {
      const folder = settings[granularity]?.folder || "";
      if (!file.path.startsWith(folder)) continue;

      const frontmatterEntry = parseFrontMatterEntry(cache.frontmatter, granularity);
      if (!frontmatterEntry) continue;

      if (typeof frontmatterEntry === "string") {
        const date = window.moment(frontmatterEntry, DEFAULT_FORMAT[granularity], true);
        if (date.isValid()) {
          this.cachedFiles.set(file.path, {
            filePath: file.path,
            date,
            granularity,
            canonicalDateStr: getCanonicalDateString(granularity, date),
            matchData: { exact: true, matchType: "frontmatter" },
          });
        }
        return;
      }
    }
  }

  private resolveRename(file: TAbstractFile, oldPath: string): void {
    if (file instanceof TFile) {
      this.cachedFiles.delete(oldPath);
      this.resolve(file, "rename");
    }
  }

  private resolveByFilename(
    file: TFile,
    settings: ISettings,
    granularity: Granularity,
    reason: "create" | "rename" | "initialize"
  ): boolean {
    const folder = settings[granularity]?.folder || "";
    if (!file.path.startsWith(folder)) return false;

    const formats = getPossibleFormats(settings, granularity);
    const dateInputStr = getDateInput(file, formats[0], granularity);
    const date = window.moment(dateInputStr, formats, true);
    if (!date.isValid()) return false;

    const metadata: PeriodicNoteCachedMetadata = {
      filePath: file.path,
      date,
      granularity,
      canonicalDateStr: getCanonicalDateString(granularity, date),
      matchData: { exact: true, matchType: "filename" },
    };
    this.cachedFiles.set(file.path, metadata);

    if (reason === "create" && file.stat.size === 0) {
      applyPeriodicTemplateToFile(this.app, file, settings, metadata);
    }

    this.app.workspace.trigger("periodic-notes:resolve", granularity, file);
    return true;
  }

  private resolveByLooseMatch(file: TFile): boolean {
    const nonStrictDate = getLooselyMatchedDate(file.basename);
    if (!nonStrictDate) return false;

    this.cachedFiles.set(file.path, {
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

  private resolve(
    file: TFile,
    reason: "create" | "rename" | "initialize" = "create"
  ): void {
    const settings = get(this.settingsStore);
    const activeGranularities = granularities.filter((g) => settings[g]?.enabled);
    if (activeGranularities.length === 0) return;

    // frontmatter entries supercede filename matches
    const existingEntry = this.cachedFiles.get(file.path);
    if (existingEntry?.matchData.matchType === "frontmatter") return;

    for (const granularity of activeGranularities) {
      if (this.resolveByFilename(file, settings, granularity, reason)) return;
    }

    this.resolveByLooseMatch(file);
  }

  public getPeriodicNote(
    granularity: Granularity,
    targetDate: Moment
  ): TFile | null {
    for (const [filePath, cacheData] of this.cachedFiles) {
      if (
        cacheData.granularity === granularity &&
        cacheData.matchData.exact === true &&
        cacheData.date.isSame(targetDate, granularity)
      ) {
        const file = this.app.vault.getAbstractFileByPath(filePath);
        return file instanceof TFile ? file : null;
      }
    }
    return null;
  }

  public getPeriodicNotes(
    granularity: Granularity,
    targetDate: Moment,
    includeFinerGranularities = false
  ): PeriodicNoteCachedMetadata[] {
    const matches: PeriodicNoteCachedMetadata[] = [];
    for (const [, cacheData] of this.cachedFiles) {
      if (
        (granularity === cacheData.granularity ||
          (includeFinerGranularities &&
            compareGranularity(cacheData.granularity, granularity) <= 0)) &&
        cacheData.date.isSame(targetDate, granularity)
      ) {
        matches.push(cacheData);
      }
    }
    return matches;
  }

  public isPeriodic(targetPath: string, granularity?: Granularity): boolean {
    const metadata = this.cachedFiles.get(targetPath);
    if (!metadata) return false;
    return !granularity || granularity === metadata.granularity;
  }

  public find(filePath: string | undefined): PeriodicNoteCachedMetadata | null {
    if (!filePath) return null;
    return this.cachedFiles.get(filePath) ?? null;
  }

  public findAdjacent(
    filePath: string,
    direction: "forwards" | "backwards"
  ): PeriodicNoteCachedMetadata | null {
    const currMetadata = this.find(filePath);
    if (!currMetadata) return null;

    const granularity = currMetadata.granularity;
    const sortedCache = sortBy(
      Array.from(this.cachedFiles.values()).filter((m) => m.granularity === granularity),
      ["canonicalDateStr"]
    );
    const activeNoteIndex = sortedCache.findIndex((m) => m.filePath === filePath);

    const offset = direction === "forwards" ? 1 : -1;
    return sortedCache[activeNoteIndex + offset];
  }
}

// Kept for backward-compat with any code still referencing it
export const CACHE_ID = DEFAULT_CALENDARSET_ID;
