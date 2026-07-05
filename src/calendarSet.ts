import { DEFAULT_FORMAT } from "./constants";
import { DEFAULT_PERIODIC_CONFIG } from "./settings/defaults";
import { removeEscapedCharacters } from "./settings/validation";
import type { Granularity, ISettings, PeriodicConfig } from "./types";

/**
 * Derive all note-config values from (settings, granularity) in one call.
 *
 * possibleFormats: when a user sets `YYYY/YYYY-MM-DD`, the cache must also
 * accept the bare `YYYY-MM-DD` basename in case the file was moved.
 */
export function configFor(settings: ISettings, granularity: Granularity) {
  const config: PeriodicConfig = settings[granularity] ?? DEFAULT_PERIODIC_CONFIG;
  const userFormat = settings[granularity]?.format;
  const format = userFormat || DEFAULT_FORMAT[granularity];

  let possibleFormats: string[];
  if (!userFormat) {
    possibleFormats = [DEFAULT_FORMAT[granularity]];
  } else {
    const partial = /[^/]*$/.exec(format);
    possibleFormats = partial ? [format, partial[0]] : [format];
  }

  return {
    format,
    folder: config.folder,
    possibleFormats,
    isIso: isIsoFormat(format),
    config,
  };
}

export function isIsoFormat(format: string): boolean {
  const cleanFormat = removeEscapedCharacters(format);
  return /w{1,2}/.test(cleanFormat);
}
