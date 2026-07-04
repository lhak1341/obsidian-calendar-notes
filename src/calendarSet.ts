import { DEFAULT_FORMAT } from "./constants";
import { DEFAULT_PERIODIC_CONFIG } from "./settings";
import { removeEscapedCharacters } from "./settings/validation";
import type { CalendarSet, Granularity, PeriodicConfig } from "./types";

export function getFormat(calendarSet: CalendarSet, granularity: Granularity): string {
  return calendarSet[granularity]?.format || DEFAULT_FORMAT[granularity];
}

/**
 * When matching file formats, users can specify `YYYY/YYYY-MM-DD`. We should look for
 * paths that match either `YYYY/YYYY-MM-DD` exactly, or just `YYYY-MM-DD` in case
 * users move the file later.
 */
export function getPossibleFormats(
  calendarSet: CalendarSet,
  granularity: Granularity
): string[] {
  const format = calendarSet[granularity]?.format;
  if (!format) return [DEFAULT_FORMAT[granularity]];

  const partialFormatExp = /[^/]*$/.exec(format);
  if (partialFormatExp) {
    const partialFormat = partialFormatExp[0];
    return [format, partialFormat];
  }
  return [format];
}

export function getFolder(calendarSet: CalendarSet, granularity: Granularity): string {
  return calendarSet[granularity]?.folder || "/";
}

export function getConfig(
  calendarSet: CalendarSet,
  granularity: Granularity
): PeriodicConfig {
  return calendarSet[granularity] ?? DEFAULT_PERIODIC_CONFIG;
}

export function isIsoFormat(format: string): boolean {
  const cleanFormat = removeEscapedCharacters(format);
  return /w{1,2}/.test(cleanFormat);
}
