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

import { decide, getCanonicalDateString } from "./cacheDecision";
import { DEFAULT_CALENDARSET_ID } from "./constants";
import { DEFAULT_FORMAT } from "./constants";
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
            canonicalDateStr: getCanonicalDateString(date),
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

  private resolve(
    file: TFile,
    reason: "create" | "rename" | "initialize" = "create"
  ): void {
    const settings = get(this.settingsStore);
    const activeGranularities = granularities.filter((g) => settings[g]?.enabled);
    if (activeGranularities.length === 0) return;

    const existingEntry = this.cachedFiles.get(file.path);
    const match = decide(
      {
        path: file.path,
        basename: file.basename,
        extension: file.extension,
        size: file.stat.size,
      },
      settings,
      activeGranularities,
      existingEntry
    );
    if (!match) return;

    this.cachedFiles.set(file.path, match);
    this.app.workspace.trigger("periodic-notes:resolve", match.granularity, file);

    const isStrictFilenameMatch =
      match.matchData.matchType === "filename" && match.matchData.exact;
    if (reason === "create" && file.stat.size === 0 && isStrictFilenameMatch) {
      applyPeriodicTemplateToFile(this.app, file, settings, match);
    }
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

  // Nearest existing note strictly before `targetDate`, regardless of gaps.
  public findNearestBefore(
    granularity: Granularity,
    targetDate: Moment
  ): PeriodicNoteCachedMetadata | null {
    const candidates = Array.from(this.cachedFiles.values()).filter(
      (m) => m.granularity === granularity && m.date.isBefore(targetDate, granularity)
    );
    if (!candidates.length) return null;

    return sortBy(candidates, ["canonicalDateStr"]).pop() ?? null;
  }
}

// Kept for backward-compat with any code still referencing it
export const CACHE_ID = DEFAULT_CALENDARSET_ID;
