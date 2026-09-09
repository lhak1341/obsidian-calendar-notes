import { get, type Writable } from "svelte/store";

import type { Granularity, ISettings, PeriodicConfig } from "./types";

// obsidian-daily-notes-interface (an external package other community plugins
// depend on, not a dependency of this repo) reads plugin.settings.daily,
// .weekly, .monthly, .quarterly, .yearly as plain objects with a `template`
// field. This shim adds non-enumerable getters to the settings store so that
// contract keeps working without this repo's own code ever touching it.
type LegacyConfig = PeriodicConfig & { template?: string };

export type SettingsStore = Writable<ISettings> & {
  daily?: LegacyConfig;
  weekly?: LegacyConfig;
  monthly?: LegacyConfig;
  quarterly?: LegacyConfig;
  yearly?: LegacyConfig;
};

export function addLegacySettingsCompat(settings: Writable<ISettings>): SettingsStore {
  const store = settings as SettingsStore;
  const keyMap: Array<[string, Granularity]> = [
    ["daily", "day"],
    ["weekly", "week"],
    ["monthly", "month"],
    ["quarterly", "quarter"],
    ["yearly", "year"],
  ];
  for (const [legacyKey, granularity] of keyMap) {
    Object.defineProperty(store, legacyKey, {
      get: (): LegacyConfig | undefined => {
        const s = get(store);
        const config = s?.[granularity];
        return config ? { ...config, template: config.templatePath } : undefined;
      },
      enumerable: false,
      configurable: true,
    });
  }
  return store;
}
