import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS, DEFAULT_PERIODIC_CONFIG } from "./defaults";
import { migrateLegacySettings, type LegacySavedData } from "./migrateLegacySettings";

describe("migrateLegacySettings", () => {
  it("returns DEFAULT_SETTINGS unchanged when there's nothing saved", () => {
    const result = migrateLegacySettings(null, false);
    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  it("passes through current-format data untouched", () => {
    const saved: LegacySavedData = {
      day: { enabled: true, openAtStartup: false, format: "YYYY-MM-DD", folder: "notes" },
    };
    const result = migrateLegacySettings(saved, false);
    expect(result.day).toEqual(saved.day);
  });

  describe("migration 1: calendarSets[] array", () => {
    it("flattens the first calendar set's per-granularity configs onto the top level", () => {
      const saved: LegacySavedData = {
        calendarSets: [
          {
            id: "default",
            day: { enabled: true, openAtStartup: false, format: "YYYY-MM-DD", folder: "" },
            week: { enabled: true, openAtStartup: false, format: "gggg-[W]ww", folder: "" },
          },
        ],
      };

      const result = migrateLegacySettings(saved, false);

      expect(result.day).toEqual(saved.calendarSets![0].day);
      expect(result.week).toEqual(saved.calendarSets![0].week);
    });

    it("drops the stray calendarSets/activeCalendarSet keys from the result", () => {
      const saved = {
        calendarSets: [{ id: "default", day: DEFAULT_PERIODIC_CONFIG }],
        activeCalendarSet: "default",
      } as LegacySavedData;

      const result = migrateLegacySettings(saved, false);

      expect(result).not.toHaveProperty("calendarSets");
      expect(result).not.toHaveProperty("activeCalendarSet");
    });

    it("ignores any calendar sets beyond the first", () => {
      const saved: LegacySavedData = {
        calendarSets: [
          { id: "a", day: { enabled: true, openAtStartup: false, format: "A", folder: "" } },
          { id: "b", day: { enabled: true, openAtStartup: false, format: "B", folder: "" } },
        ],
      };

      const result = migrateLegacySettings(saved, false);

      expect(result.day?.format).toBe("A");
    });
  });

  describe("migration 2: daily/weekly/monthly/quarterly/yearly", () => {
    it("migrates each present legacy periodicity into the flat granularity fields", () => {
      const saved: LegacySavedData = {
        daily: { enabled: true, format: "YYYY-MM-DD", folder: "daily", template: "tpl.md" },
        weekly: { enabled: false, format: "gggg-[W]ww", folder: "weekly" },
      };

      const result = migrateLegacySettings(saved, false);

      expect(result.day).toEqual({
        enabled: true,
        format: "YYYY-MM-DD",
        folder: "daily",
        openAtStartup: false,
        templatePath: "tpl.md",
      });
      expect(result.week).toEqual({
        enabled: false,
        format: "gggg-[W]ww",
        folder: "weekly",
        openAtStartup: false,
        templatePath: undefined,
      });
      // Untouched by this migration — still DEFAULT_SETTINGS' own default.
      expect(result.month).toEqual(DEFAULT_SETTINGS.month);
    });

    it("defaults enabled/format/folder when a legacy periodicity entry is sparse", () => {
      const saved: LegacySavedData = { yearly: {} as never };

      const result = migrateLegacySettings(saved, false);

      expect(result.year).toEqual({
        enabled: false,
        format: "",
        folder: "",
        openAtStartup: false,
        templatePath: undefined,
      });
    });

    it("loses to migration 1 when both legacy shapes are somehow present (calendarSets checked first)", () => {
      const saved: LegacySavedData = {
        calendarSets: [{ id: "x", day: { enabled: true, openAtStartup: false, format: "X", folder: "" } }],
        daily: { enabled: true, format: "Y", folder: "" },
      };

      const result = migrateLegacySettings(saved, false);

      expect(result.day?.format).toBe("X");
    });
  });

  describe("migration 3: legacy Obsidian daily-notes plugin", () => {
    it("enables day notes with defaults when the legacy plugin has settings and no day config exists yet", () => {
      const result = migrateLegacySettings({}, true);

      expect(result.day).toEqual({ ...DEFAULT_PERIODIC_CONFIG, enabled: true });
    });

    it("does not override an already-present day config", () => {
      const existingDay = { enabled: false, openAtStartup: false, format: "custom", folder: "x" };
      const result = migrateLegacySettings({ day: existingDay }, true);
      expect(result.day).toEqual(existingDay);
    });
  });
});
