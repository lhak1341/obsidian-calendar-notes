import type { Moment } from "moment";
import type { TFile } from "obsidian";

import type { CalendarDot, DotSource } from "../ui/types";

export function createStreakSource(): DotSource {
  return {
    async getDots(_date: Moment, note: TFile | null): Promise<CalendarDot[]> {
      if (!note) return [];
      return [{ isFilled: false }];
    },
  };
}
