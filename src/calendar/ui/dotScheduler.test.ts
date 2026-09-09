import moment from "moment";
import { describe, expect, it } from "vitest";

import { createDotScheduler, type DotCell } from "./dotScheduler";
import type { CalendarDot, GetDots } from "./types";

function cell(uid: string): DotCell {
  return { uid, date: moment(), note: null };
}

describe("createDotScheduler", () => {
  it("resolves the dots returned by getDots for each cell", async () => {
    const computeDots = createDotScheduler();
    const getDots: GetDots = async () => [{ isFilled: true }];

    const result = await computeDots([cell("a"), cell("b")], getDots);

    expect(result).toEqual({ a: [{ isFilled: true }], b: [{ isFilled: true }] });
  });

  it("discards an older run's result if a newer run has since started", async () => {
    const computeDots = createDotScheduler();

    // The first call's getDots resolves *after* the second call starts.
    let resolveFirst!: (dots: CalendarDot[]) => void;
    const slowGetDots: GetDots = () =>
      new Promise((resolve) => {
        resolveFirst = resolve;
      });

    const firstRun = computeDots([cell("a")], slowGetDots);

    const fastGetDots: GetDots = async () => [{ isFilled: false }];
    const secondRun = computeDots([cell("a")], fastGetDots);

    const secondResult = await secondRun;
    expect(secondResult).toEqual({ a: [{ isFilled: false }] });

    resolveFirst([{ isFilled: true }]);
    const firstResult = await firstRun;

    expect(firstResult).toBeNull();
  });
});
