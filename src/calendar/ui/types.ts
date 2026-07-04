import type { Moment } from "moment";
import type { TFile } from "obsidian";

export interface CalendarDot {
  isFilled: boolean;
  color?: string;
}

export interface DotSource {
  getDots(date: Moment, note: TFile | null): Promise<CalendarDot[]>;
}

export function dayUID(date: Moment): string {
  return date.format("YYYY-MM-DD");
}

export function weekUID(date: Moment): string {
  return date.format("GGGG-[W]WW");
}
