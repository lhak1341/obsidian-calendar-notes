import { activeGranularities } from "./granularity";
import { granularities, type ISettings } from "./types";

export interface SettingsEffects {
  // Commands and the ribbon icon follow which granularities are enabled.
  reconfigure: boolean;
  // The cache's index depends on which granularities are enabled and on each
  // one's format and folder, and on nothing else.
  reindex: boolean;
}

interface Fingerprint {
  enabled: string;
  matching: string;
}

function fingerprintOf(settings: ISettings): Fingerprint {
  return {
    enabled: activeGranularities(settings).join(","),
    matching: JSON.stringify(
      granularities.map((g) => [g, settings[g]?.enabled ?? false, settings[g]?.format, settings[g]?.folder])
    ),
  };
}

// Tells what each successive settings value obliges the plugin to redo. It
// remembers a fingerprint of the previous value, not the value itself: the
// settings UI edits the store's object in place, so a held reference would
// always equal the new one. The first value needs commands set up, and there
// is no index yet to rebuild.
export function createSettingsEffectsTracker(): { next(settings: ISettings): SettingsEffects } {
  let prev: Fingerprint | null = null;
  return {
    next(settings) {
      const current = fingerprintOf(settings);
      const effects: SettingsEffects = prev
        ? { reconfigure: prev.enabled !== current.enabled, reindex: prev.matching !== current.matching }
        : { reconfigure: true, reindex: false };
      prev = current;
      return effects;
    },
  };
}
