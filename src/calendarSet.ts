import { DEFAULT_FORMAT } from "./constants";
import { DEFAULT_PERIODIC_CONFIG } from "./settings/defaults";
import { removeEscapedCharacters } from "./settings/validation";
import type { Granularity, ISettings, PeriodicConfig } from "./types";

export function getFormat(settings: ISettings, granularity: Granularity): string {
  return settings[granularity]?.format || DEFAULT_FORMAT[granularity];
}

/**
 * When matching file formats, users can specify `YYYY/YYYY-MM-DD`. We should look for
 * paths that match either `YYYY/YYYY-MM-DD` exactly, or just `YYYY-MM-DD` in case
 * users move the file later.
 */
export function getPossibleFormats(settings: ISettings, granularity: Granularity): string[] {
  const format = settings[granularity]?.format;
  if (!format) return [DEFAULT_FORMAT[granularity]];

  const partialFormatExp = /[^/]*$/.exec(format);
  if (partialFormatExp) {
    const partialFormat = partialFormatExp[0];
    return [format, partialFormat];
  }
  return [format];
}

export function getFolder(settings: ISettings, granularity: Granularity): string {
  return settings[granularity]?.folder || "/";
}

export function getConfig(settings: ISettings, granularity: Granularity): PeriodicConfig {
  return settings[granularity] ?? DEFAULT_PERIODIC_CONFIG;
}

export function isIsoFormat(format: string): boolean {
  const cleanFormat = removeEscapedCharacters(format);
  return /w{1,2}/.test(cleanFormat);
}
