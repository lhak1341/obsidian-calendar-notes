import { describe, expect, it } from "vitest";

import { activeGranularities, iconId } from "./granularity";
import { DEFAULT_SETTINGS } from "./settings/defaults";
import type { ISettings } from "./types";

const on = { enabled: true, openAtStartup: false, format: "", folder: "" };

describe("activeGranularities", () => {
  it("lists enabled granularities in canonical order, whatever order they were set", () => {
    const settings: ISettings = { ...DEFAULT_SETTINGS, year: on, day: on, week: { ...on, enabled: false } };
    expect(activeGranularities(settings)).toEqual(["day", "year"]);
  });

  it("is empty when none is enabled or configured", () => {
    expect(activeGranularities({ ...DEFAULT_SETTINGS, day: { ...on, enabled: false } })).toEqual([]);
  });
});

describe("iconId", () => {
  it("names the registered icon for a granularity", () => {
    expect(iconId("quarter")).toBe("calendar-quarter");
  });
});
