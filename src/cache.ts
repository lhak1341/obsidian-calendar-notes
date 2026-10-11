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

import { decide, shouldSeedEmptyNote, type MatchInput, type ResolveReason } from "./cacheDecision";
import { PeriodicNoteIndex } from "./periodicNoteIndex";
import {
  granularities,
  type Granularity,
  type INoteIndex,
  type ISettings,
  type PeriodicConfig,
  type PeriodicNoteCachedMetadata,
} from "./types";

// Feeds the PeriodicNoteIndex from vault and metadata events. The decision of
// what a file is lives in cacheDecision.decide; the queries live in the index.
export class PeriodicNotesCache extends Component implements INoteIndex {
  private index = new PeriodicNoteIndex();

  constructor(readonly app: App, readonly settingsStore: Readable<ISettings>) {
    super();

    this.app.workspace.onLayoutReady(() => {
      console.info("[Periodic Notes] initializing cache");
      this.initialize();
      this.registerEvent(
        this.app.vault.on("create", (file) => {
          if (file instanceof TFile) this.update(file, "create");
        })
      );
      this.registerEvent(this.app.vault.on("rename", this.resolveRename, this));
      this.registerEvent(this.app.vault.on("delete", this.resolveDelete, this));
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
    this.index.clear();
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

      this.recurseChildren(rootFolder, (file) => this.update(file, "initialize"));
    }
  }

  private frontmatterOf(file: TFile, cache?: CachedMetadata | null): MatchInput["frontmatter"] {
    const frontmatter = (cache ?? this.app.metadataCache.getFileCache(file))?.frontmatter;
    const out: MatchInput["frontmatter"] = {};
    for (const granularity of granularities) {
      const value: unknown = parseFrontMatterEntry(frontmatter, granularity);
      if (typeof value === "string") out[granularity] = value;
    }
    return out;
  }

  // Every metadata change in the vault lands here; only files that are already
  // indexed or carry a periodic frontmatter key can change the answer, so skip
  // the rest instead of loosely filename-matching every edited note.
  private resolveChangedMetadata(file: TFile, _data: string, cache: CachedMetadata): void {
    const frontmatter = this.frontmatterOf(file, cache);
    if (!this.index.find(file.path) && Object.keys(frontmatter).length === 0) return;
    this.update(file, "metadata", frontmatter);
  }

  private resolveRename(file: TAbstractFile, oldPath: string): void {
    if (file instanceof TFile) {
      this.index.remove(oldPath);
      this.update(file, "rename");
    }
  }

  private resolveDelete(file: TAbstractFile): void {
    if (file instanceof TFile) this.index.remove(file.path);
    else this.index.removeUnder(file.path);
  }

  // Re-decide what this file is and bring the index in line, whatever event
  // got us here. Fires `periodic-notes:resolve` only when the entry changed.
  private update(
    file: TFile,
    reason: ResolveReason,
    frontmatter: MatchInput["frontmatter"] = this.frontmatterOf(file)
  ): void {
    const settings = get(this.settingsStore);
    const activeGranularities = granularities.filter((g) => settings[g]?.enabled);
    if (activeGranularities.length === 0) return;

    const match = decide(
      {
        path: file.path,
        basename: file.basename,
        extension: file.extension,
        size: file.stat.size,
        frontmatter,
      },
      settings,
      activeGranularities
    );
    if (!match) {
      this.index.remove(file.path);
      return;
    }

    if (this.index.set(match)) {
      this.app.workspace.trigger("periodic-notes:resolve", match.granularity, file);
    }

    if (shouldSeedEmptyNote(reason, file, match)) {
      this.app.workspace.trigger("periodic-notes:empty-note-created", file, match);
    }
  }

  public getPeriodicNote(granularity: Granularity, targetDate: Moment): TFile | null {
    const path = this.index.pathForPeriod(granularity, targetDate);
    if (!path) return null;
    const file = this.app.vault.getAbstractFileByPath(path);
    return file instanceof TFile ? file : null;
  }

  public getPeriodicNotes(
    granularity: Granularity,
    targetDate: Moment,
    includeFinerGranularities = false
  ): PeriodicNoteCachedMetadata[] {
    return this.index.getPeriodicNotes(granularity, targetDate, includeFinerGranularities);
  }

  public isPeriodic(targetPath: string, granularity?: Granularity): boolean {
    return this.index.isPeriodic(targetPath, granularity);
  }

  public find(filePath: string | undefined): PeriodicNoteCachedMetadata | null {
    return this.index.find(filePath);
  }

  public findAdjacent(
    filePath: string,
    direction: "forwards" | "backwards"
  ): PeriodicNoteCachedMetadata | null {
    return this.index.findAdjacent(filePath, direction);
  }

  // Nearest existing note strictly before `targetDate`, regardless of gaps.
  public findNearestBefore(
    granularity: Granularity,
    targetDate: Moment
  ): PeriodicNoteCachedMetadata | null {
    return this.index.findNearestBefore(granularity, targetDate);
  }
}
