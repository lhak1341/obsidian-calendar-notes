import { granularities, type Granularity, type ISettings } from "./types";

export interface IDisplayConfig {
  periodicity: string;
  relativeUnit: string;
  labelOpenPresent: string;
}

export const displayConfigs: Record<Granularity, IDisplayConfig> = {
  day: {
    periodicity: "daily",
    relativeUnit: "today",
    labelOpenPresent: "Open today's daily note",
  },
  week: {
    periodicity: "weekly",
    relativeUnit: "this week",
    labelOpenPresent: "Open this week's note",
  },
  month: {
    periodicity: "monthly",
    relativeUnit: "this month",
    labelOpenPresent: "Open this month's note",
  },
  quarter: {
    periodicity: "quarterly",
    relativeUnit: "this quarter",
    labelOpenPresent: "Open this quarter's note",
  },
  year: {
    periodicity: "yearly",
    relativeUnit: "this year",
    labelOpenPresent: "Open this year's note",
  },
};

// The granularities the user has turned on, in canonical order.
export function activeGranularities(settings: ISettings): Granularity[] {
  return granularities.filter((g) => settings[g]?.enabled);
}

// Obsidian icon id registered for a granularity (see addIcon in main.ts).
export function iconId(granularity: Granularity): string {
  return `calendar-${granularity}`;
}
