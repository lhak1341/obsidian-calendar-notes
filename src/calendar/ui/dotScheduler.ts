import type { Moment } from "moment";
import type { TFile } from "obsidian";

import type { CalendarDot, GetDots } from "./types";

export interface DotCell {
  uid: string;
  date: Moment;
  note: TFile | null;
}

// A newer computeDots() call can resolve before an older one (getDots is
// async, I/O-bound, unordered). Without a generation guard, the older run's
// result can overwrite the newer one's after both resolve.
export function createDotScheduler() {
  let generation = 0;

  return async function computeDots(
    cells: DotCell[],
    getDots: GetDots
  ): Promise<Record<string, CalendarDot[]> | null> {
    const myGeneration = ++generation;
    const newDots: Record<string, CalendarDot[]> = {};

    await Promise.all(
      cells.map(async (cell) => {
        newDots[cell.uid] = await getDots(cell.date, cell.note);
      })
    );

    if (myGeneration !== generation) return null;
    return newDots;
  };
}
