import type { Moment } from "moment";

import { configFor } from "./calendarSet";
import { getLooselyMatchedDate } from "./parser";
import { getDateInput } from "./settings/validation";
import type { Granularity, ISettings, PeriodicNoteCachedMetadata } from "./types";

export interface MatchInput {
  path: string;
  basename: string;
  extension: string;
  size: number;
}

export function getCanonicalDateString(date: Moment): string {
  return date.toISOString();
}

function matchByFilename(
  input: MatchInput,
  settings: ISettings,
  granularity: Granularity
): PeriodicNoteCachedMetadata | null {
  const cfg = configFor(settings, granularity);
  if (!input.path.startsWith(cfg.folder)) return null;

  const dateInputStr = getDateInput(input, cfg.possibleFormats[0], granularity);
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
 * any) it matches, and with what precedence. Frontmatter matches (decided
 * elsewhere, in PeriodicNotesCache.resolveChangedMetadata) always outrank
 * filename and loose matches — this function refuses to override one.
 */
export function decide(
  input: MatchInput,
  settings: ISettings,
  activeGranularities: Granularity[],
  existing: PeriodicNoteCachedMetadata | undefined
): PeriodicNoteCachedMetadata | null {
  if (existing?.matchData.matchType === "frontmatter") return null;

  for (const granularity of activeGranularities) {
    const match = matchByFilename(input, settings, granularity);
    if (match) return match;
  }

  return matchByLooseGuess(input);
}

export type ResolveReason = "create" | "rename" | "initialize";

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
