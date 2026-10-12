import { DEFAULT_FORMAT } from "./constants";
import { isIsoFormat, splitFormatSegments } from "./formatRules";
import { DEFAULT_PERIODIC_CONFIG } from "./settings/defaults";
import type {
  Granularity,
  ISettings,
  PeriodicConfig,
  ResolvedPeriodicConfig,
} from "./types";

/**
 * Derive all note-config values from (settings, granularity) in one call.
 *
 * possibleFormats: when a user sets `YYYY/YYYY-MM-DD`, the cache must also
 * accept the bare `YYYY-MM-DD` basename in case the file was moved.
 */
export function configFor(
  settings: ISettings,
  granularity: Granularity
): ResolvedPeriodicConfig {
  const config: PeriodicConfig = settings[granularity] ?? DEFAULT_PERIODIC_CONFIG;
  const userFormat = settings[granularity]?.format;
  const format = userFormat || DEFAULT_FORMAT[granularity];

  let possibleFormats: string[];
  if (!userFormat) {
    possibleFormats = [DEFAULT_FORMAT[granularity]];
  } else {
    const segments = splitFormatSegments(format);
    possibleFormats =
      segments.length > 1 ? [format, segments[segments.length - 1]] : [format];
  }

  return {
    ...config,
    format,
    possibleFormats,
    isIso: isIsoFormat(format),
  };
}
