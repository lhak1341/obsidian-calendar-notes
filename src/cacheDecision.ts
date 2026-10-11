import type { Moment } from "moment";

import { configFor } from "./calendarSet";
import { DEFAULT_FORMAT } from "./constants";
import { getLooselyMatchedDate } from "./parser";
import { getDateInput } from "./settings/validation";
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
    if (!input.path.startsWith(configFor(settings, granularity).folder)) continue;

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
