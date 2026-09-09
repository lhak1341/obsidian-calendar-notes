import { describe, expect, it } from "vitest";

import { configFor } from "./calendarSet";
import { DEFAULT_SETTINGS } from "./settings/defaults";
import type { ISettings } from "./types";

function settingsWith(overrides: Partial<ISettings>): ISettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

describe("configFor", () => {
  it("returns one flat object with no nested config", () => {
    const settings = settingsWith({
      day: { enabled: true, openAtStartup: false, format: "YYYY-MM-DD", folder: "" },
    });

    const cfg = configFor(settings, "day");

    expect(cfg).not.toHaveProperty("config");
    expect(cfg.format).toBe("YYYY-MM-DD");
    expect(cfg.folder).toBe("");
    expect(cfg.enabled).toBe(true);
  });

  it("falls back to the default format when the user hasn't set one", () => {
    const settings = settingsWith({
      day: { enabled: true, openAtStartup: false, format: "", folder: "" },
    });

    const cfg = configFor(settings, "day");

    expect(cfg.format).toBe("YYYY-MM-DD");
    expect(cfg.possibleFormats).toEqual(["YYYY-MM-DD"]);
  });

  it("includes the bare basename as a fallback possible format for nested formats", () => {
    const settings = settingsWith({
      day: { enabled: true, openAtStartup: false, format: "YYYY/YYYY-MM-DD", folder: "" },
    });

    const cfg = configFor(settings, "day");

    expect(cfg.possibleFormats).toEqual(["YYYY/YYYY-MM-DD", "YYYY-MM-DD"]);
  });

  it("flags ISO week formats", () => {
    const settings = settingsWith({
      week: { enabled: true, openAtStartup: false, format: "gggg-[W]ww", folder: "" },
    });

    const cfg = configFor(settings, "week");

    expect(cfg.isIso).toBe(true);
  });
});
