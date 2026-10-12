import type { Moment } from "moment";

import { configFor } from "./calendarSet";
import { DEFAULT_FORMAT } from "./constants";
import { isInFolder } from "./folderRule";
import { dateStringFor } from "./formatRules";
import { activeGranularities } from "./granularity";
import { getLooselyMatchedDate } from "./parser";
import type { PeriodicNoteIndex } from "./periodicNoteIndex";
import type { Granularity, ISettings, PeriodicNoteCachedMetadata } from "./types";

export interface MatchInput {
  path: string;
  basename: string;
  extension: string;
  size: number;
  // Raw string frontmatter values keyed by granularity (`day: 2024-01-15`).
  // Extracting them from Obsidian's metadata cache is the caller's job.
  frontmatter: Partial<Record<Granularity, string>>;
}

function getCanonicalDateString(date: Moment): string {
  return date.toISOString();
}

function matchByFilename(
  input: MatchInput,
  settings: ISettings,
  granularity: Granularity
): PeriodicNoteCachedMetadata | null {
  const cfg = configFor(settings, granularity);
  if (!isInFolder(input.path, cfg.folder)) return null;

  const dateInputStr = dateStringFor(input, cfg.possibleFormats[0], granularity);
  const date = window.moment(dateInputStr, cfg.possibleFormats, true);
  if (!date.isValid()) return null;

  return {
    filePath: input.path,
    date,
    granularity,
    canonicalDateStr: getCanonicalDateString(date),
    matchData: { exact: true, matchType: "filename" },
  };
}

// Frontmatter dates are always ISO-style (DEFAULT_FORMAT), whatever the
// filename format is. An unparseable value is skipped, not fatal.
function matchByFrontmatter(
  input: MatchInput,
  settings: ISettings,
  activeGranularities: Granularity[]
): PeriodicNoteCachedMetadata | null {
  for (const granularity of activeGranularities) {
    const value = input.frontmatter[granularity];
    if (value === undefined) continue;
    if (!isInFolder(input.path, configFor(settings, granularity).folder)) continue;

    const date = window.moment(value, DEFAULT_FORMAT[granularity], true);
    if (!date.isValid()) continue;

    return {
      filePath: input.path,
      date,
      granularity,
      canonicalDateStr: getCanonicalDateString(date),
      matchData: { exact: true, matchType: "frontmatter" },
    };
  }
  return null;
}

function matchByLooseGuess(input: MatchInput): PeriodicNoteCachedMetadata | null {
  const nonStrictDate = getLooselyMatchedDate(input.basename);
  if (!nonStrictDate) return null;

  return {
    filePath: input.path,
    date: nonStrictDate.date,
    granularity: nonStrictDate.granularity,
    canonicalDateStr: getCanonicalDateString(nonStrictDate.date),
    matchData: { exact: false, matchType: "filename" },
  };
}

/**
 * Given a file and the active granularities, decide which periodic note (if
 * any) it matches. Stateless: the same input always gives the same answer,
 * whatever events led here. Precedence: frontmatter, then strict filename
 * (granularities in order), then a loose guess from the filename.
 */
export function decide(
  input: MatchInput,
  settings: ISettings,
  activeGranularities: Granularity[]
): PeriodicNoteCachedMetadata | null {
  const frontmatterMatch = matchByFrontmatter(input, settings, activeGranularities);
  if (frontmatterMatch) return frontmatterMatch;

  for (const granularity of activeGranularities) {
    const match = matchByFilename(input, settings, granularity);
    if (match) return match;
  }

  return matchByLooseGuess(input);
}

export type ResolveReason = "create" | "rename" | "initialize" | "metadata";

/**
 * A freshly-created, empty file that strictly matches a periodic format is a
 * blank note the user just made from the calendar/ribbon/command — seed it
 * from its template. Renames, startup indexing, and loose/frontmatter
 * matches never qualify.
 */
export function shouldSeedEmptyNote(
  reason: ResolveReason,
  file: { stat: { size: number } },
  match: PeriodicNoteCachedMetadata
): boolean {
  const isStrictFilenameMatch =
    match.matchData.matchType === "filename" && match.matchData.exact;
  return reason === "create" && file.stat.size === 0 && isStrictFilenameMatch;
}

export interface Resolution {
  match: PeriodicNoteCachedMetadata | null;
  // The entry was added or differs from what the index held. Listeners hear
  // about changes only.
  changed: boolean;
  // The file is a blank note to fill from its template. Independent of
  // `changed`: it depends on the event and the file, not on the index.
  seed: boolean;
}

/**
 * Re-decide what a file is and bring the index in line, whatever event got us
 * here: no match drops the entry, a match sets it. With no granularity
 * enabled there is nothing to decide, and the index is left alone.
 */
export function resolveFile(
  index: PeriodicNoteIndex,
  input: MatchInput,
  settings: ISettings,
  reason: ResolveReason
): Resolution {
  const active = activeGranularities(settings);
  if (active.length === 0) return { match: null, changed: false, seed: false };

  const match = decide(input, settings, active);
  if (!match) {
    index.remove(input.path);
    return { match: null, changed: false, seed: false };
  }

  const changed = index.set(match);
  const seed = shouldSeedEmptyNote(reason, { stat: { size: input.size } }, match);
  return { match, changed, seed };
}
