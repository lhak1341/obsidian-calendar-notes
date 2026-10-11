import type { Moment } from "moment";

import { granularities, type Granularity, type PeriodicNoteCachedMetadata } from "./types";

function compareGranularity(a: Granularity, b: Granularity) {
  return granularities.indexOf(a) - granularities.indexOf(b);
}

function periodKey(granularity: Granularity, date: Moment): string {
  return `${granularity}:${date.clone().startOf(granularity).valueOf()}`;
}

// What the plugin knows about which vault files are periodic notes, and every
// query over that. Pure data — no Obsidian imports — so the lookups are tested
// directly; PeriodicNotesCache only feeds it from vault events.
export class PeriodicNoteIndex {
  private byPath = new Map<string, PeriodicNoteCachedMetadata>();
  // Paths of exact matches per period, in insertion order. Keeps
  // pathForPeriod O(1): the calendar grid calls it once per cell per paint.
  private exactByPeriod = new Map<string, string[]>();

  // Returns whether the index changed (new entry, or a different match).
  set(entry: PeriodicNoteCachedMetadata): boolean {
    const prev = this.byPath.get(entry.filePath);
    if (
      prev &&
      prev.granularity === entry.granularity &&
      prev.canonicalDateStr === entry.canonicalDateStr &&
      prev.matchData.matchType === entry.matchData.matchType &&
      prev.matchData.exact === entry.matchData.exact
    ) {
      return false;
    }
    if (prev) this.remove(entry.filePath);

    this.byPath.set(entry.filePath, entry);
    if (entry.matchData.exact) {
      const key = periodKey(entry.granularity, entry.date);
      const paths = this.exactByPeriod.get(key);
      if (paths) paths.push(entry.filePath);
      else this.exactByPeriod.set(key, [entry.filePath]);
    }
    return true;
  }

  remove(path: string): void {
    const prev = this.byPath.get(path);
    if (!prev) return;
    this.byPath.delete(path);
    if (!prev.matchData.exact) return;

    const key = periodKey(prev.granularity, prev.date);
    const paths = this.exactByPeriod.get(key)?.filter((p) => p !== path);
    if (paths?.length) this.exactByPeriod.set(key, paths);
    else this.exactByPeriod.delete(key);
  }

  // A deleted folder takes its notes with it.
  removeUnder(folderPath: string): void {
    const prefix = `${folderPath}/`;
    for (const path of [...this.byPath.keys()]) {
      if (path.startsWith(prefix)) this.remove(path);
    }
  }

  clear(): void {
    this.byPath.clear();
    this.exactByPeriod.clear();
  }

  size(): number {
    return this.byPath.size;
  }

  find(path: string | undefined): PeriodicNoteCachedMetadata | null {
    if (!path) return null;
    return this.byPath.get(path) ?? null;
  }

  isPeriodic(path: string, granularity?: Granularity): boolean {
    const entry = this.byPath.get(path);
    if (!entry) return false;
    return !granularity || granularity === entry.granularity;
  }

  // Path of the first exact match for this period, or null.
  pathForPeriod(granularity: Granularity, date: Moment): string | null {
    return this.exactByPeriod.get(periodKey(granularity, date))?.[0] ?? null;
  }

  getPeriodicNotes(
    granularity: Granularity,
    date: Moment,
    includeFinerGranularities = false
  ): PeriodicNoteCachedMetadata[] {
    const matches: PeriodicNoteCachedMetadata[] = [];
    for (const entry of this.byPath.values()) {
      if (
        (granularity === entry.granularity ||
          (includeFinerGranularities && compareGranularity(entry.granularity, granularity) <= 0)) &&
        entry.date.isSame(date, granularity)
      ) {
        matches.push(entry);
      }
    }
    return matches;
  }

  findAdjacent(
    path: string,
    direction: "forwards" | "backwards"
  ): PeriodicNoteCachedMetadata | null {
    const current = this.byPath.get(path);
    if (!current) return null;

    const sorted = [...this.byPath.values()]
      .filter((m) => m.granularity === current.granularity)
      .sort((a, b) => (a.canonicalDateStr < b.canonicalDateStr ? -1 : a.canonicalDateStr > b.canonicalDateStr ? 1 : 0));
    const index = sorted.findIndex((m) => m.filePath === path);
    return sorted[index + (direction === "forwards" ? 1 : -1)] ?? null;
  }

  // Nearest existing note strictly before `date`, regardless of gaps.
  findNearestBefore(granularity: Granularity, date: Moment): PeriodicNoteCachedMetadata | null {
    let nearest: PeriodicNoteCachedMetadata | null = null;
    for (const entry of this.byPath.values()) {
      if (entry.granularity !== granularity || !entry.date.isBefore(date, granularity)) continue;
      if (!nearest || entry.canonicalDateStr >= nearest.canonicalDateStr) nearest = entry;
    }
    return nearest;
  }
}
