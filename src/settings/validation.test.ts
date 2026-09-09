import { describe, expect, it } from "vitest";

import { splitFormatSegments } from "./validation";

describe("splitFormatSegments", () => {
  it("returns a single segment for a non-nested format", () => {
    expect(splitFormatSegments("YYYY-MM-DD")).toEqual(["YYYY-MM-DD"]);
  });

  it("splits on real folder separators", () => {
    expect(splitFormatSegments("YYYY/YYYY-MM-DD")).toEqual(["YYYY", "YYYY-MM-DD"]);
  });

  it("splits on every real folder separator, not just the first", () => {
    expect(splitFormatSegments("YYYY/MM/DD")).toEqual(["YYYY", "MM", "DD"]);
  });

  it("does not treat a bracket-escaped slash as a folder separator", () => {
    expect(splitFormatSegments("YYYY[/]MM-DD")).toEqual(["YYYY[/]MM-DD"]);
  });

  it("does not split on a trailing bracket-escaped slash", () => {
    expect(splitFormatSegments("YYYY/MM-DD[/]")).toEqual(["YYYY", "MM-DD[/]"]);
  });
});
