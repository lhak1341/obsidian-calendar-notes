import { get, writable } from "svelte/store";
import { describe, expect, it } from "vitest";

import { addLegacySettingsCompat } from "./legacySettingsCompat";
import { DEFAULT_SETTINGS } from "./settings/defaults";
import type { ISettings } from "./types";

function makeStore(overrides: Partial<ISettings> = {}) {
  return addLegacySettingsCompat(writable<ISettings>({ ...DEFAULT_SETTINGS, ...overrides }));
}

const PAIRS = [
  ["daily", "day"],
  ["weekly", "week"],
  ["monthly", "month"],
  ["quarterly", "quarter"],
  ["yearly", "year"],
] as const;

describe("addLegacySettingsCompat", () => {
  it.each(PAIRS)("exposes %s as the %s config", (legacyKey, granularity) => {
    const store = makeStore({
      [granularity]: {
        enabled: true,
        openAtStartup: false,
        format: "FMT",
        folder: "F",
        templatePath: "tpl.md",
      },
    });

    expect(store[legacyKey]).toMatchObject({ enabled: true, format: "FMT", folder: "F" });
  });

  it("mirrors templatePath as `template`, the field external readers expect", () => {
    const store = makeStore({
      day: { enabled: true, openAtStartup: false, format: "x", folder: "", templatePath: "t.md" },
    });

    expect(store.daily?.template).toBe("t.md");
    expect(store.daily?.templatePath).toBe("t.md");
  });

  it("reads the store's current value on every access", () => {
    const store = makeStore();
    const before = store.daily?.format;

    store.update((s) => ({ ...s, day: { ...s.day!, format: "CHANGED" } }));

    expect(before).not.toBe("CHANGED");
    expect(store.daily?.format).toBe("CHANGED");
  });

  it("returns a copy, so a reader cannot mutate the settings", () => {
    const store = makeStore();

    const legacy = store.daily!;
    legacy.format = "MUTATED";

    expect(get(store).day?.format).not.toBe("MUTATED");
  });

  it("returns undefined for a granularity with no config", () => {
    const store = makeStore({ week: undefined });

    expect(store.weekly).toBeUndefined();
  });

  it("keeps the legacy keys non-enumerable so they never reach saved data", () => {
    const store = makeStore();

    const keys = Object.keys(store);
    for (const [legacyKey] of PAIRS) expect(keys).not.toContain(legacyKey);
    expect(JSON.stringify(store)).not.toContain("template");
  });

  it("is still a working store", () => {
    const store = makeStore();
    let seen: ISettings | undefined;
    const unsubscribe = store.subscribe((v) => (seen = v));

    store.set({ ...DEFAULT_SETTINGS, rolloverHeading: "# X" });

    expect(seen?.rolloverHeading).toBe("# X");
    unsubscribe();
  });
});
