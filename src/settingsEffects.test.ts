import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS } from "./settings/defaults";
import { createSettingsEffectsTracker } from "./settingsEffects";
import type { ISettings } from "./types";

const on = { enabled: true, openAtStartup: false, format: "YYYY-MM-DD", folder: "daily" };
const base = (): ISettings => ({ ...DEFAULT_SETTINGS, day: { ...on } });

function trackerAfter(first: ISettings) {
  const tracker = createSettingsEffectsTracker();
  tracker.next(first);
  return tracker;
}

describe("createSettingsEffectsTracker", () => {
  it("sets commands up for the first settings but has nothing to reindex", () => {
    expect(createSettingsEffectsTracker().next(base())).toEqual({ reconfigure: true, reindex: false });
  });

  it("does nothing for a change the index and commands do not depend on", () => {
    const tracker = trackerAfter(base());
    const next: ISettings = {
      ...base(),
      rolloverHeading: "# Other",
      day: { ...on, templatePath: "t.md", openAtStartup: true },
    };
    expect(tracker.next(next)).toEqual({ reconfigure: false, reindex: false });
  });

  it("reindexes, without reconfiguring, when a format or folder changes", () => {
    expect(trackerAfter(base()).next({ ...base(), day: { ...on, format: "YYMMDD" } })).toEqual({
      reconfigure: false,
      reindex: true,
    });
    expect(trackerAfter(base()).next({ ...base(), day: { ...on, folder: "dail" } })).toEqual({
      reconfigure: false,
      reindex: true,
    });
  });

  it("reconfigures and reindexes when a granularity is enabled or disabled", () => {
    const week = { ...on, format: "gggg-[W]ww" };
    expect(trackerAfter(base()).next({ ...base(), week })).toEqual({ reconfigure: true, reindex: true });
    expect(trackerAfter(base()).next({ ...base(), day: { ...on, enabled: false } })).toEqual({
      reconfigure: true,
      reindex: true,
    });
  });

  it("sees an in-place edit of the same settings object, as the settings UI makes", () => {
    const settings = base();
    const tracker = trackerAfter(settings);

    settings.day!.folder = "daily2";
    expect(tracker.next(settings)).toEqual({ reconfigure: false, reindex: true });

    settings.day!.enabled = false;
    expect(tracker.next(settings)).toEqual({ reconfigure: true, reindex: true });
  });
});
