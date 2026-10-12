import { describe, expect, it } from "vitest";

import { dateStringFor, isIsoFormat, removeEscapedCharacters, splitFormatSegments, validateFormatComplexity } from "./formatRules";

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

describe("removeEscapedCharacters", () => {
  it("drops bracket literals and backslash escapes", () => {
    expect(removeEscapedCharacters("gggg-[W]ww")).toBe("gggg-ww");
    expect(removeEscapedCharacters("YYYY\\-MM")).toBe("YYYYMM");
  });
});

describe("isIsoFormat", () => {
  it("is true only for a week token outside literals", () => {
    expect(isIsoFormat("GGGG-[W]WW")).toBe(false);
    expect(isIsoFormat("gggg-[W]ww")).toBe(true);
    expect(isIsoFormat("YYYY-[week]MM")).toBe(false);
  });
});

describe("validateFormatComplexity", () => {
  it("is valid for a flat format", () => {
    expect(validateFormatComplexity("YYYY-MM-DD", "day")).toBe("valid");
  });

  it("flags a nested day format whose basename lacks year, month or day", () => {
    expect(validateFormatComplexity("YYYY/MM/DD", "day")).toBe("fragile-basename");
  });

  it("accepts a nested day format whose basename is complete", () => {
    expect(validateFormatComplexity("YYYY/YYYY-MM-DD", "day")).toBe("valid");
  });

  it("does not flag nested formats for other granularities", () => {
    expect(validateFormatComplexity("YYYY/MM", "month")).toBe("valid");
  });

  it("flags a format that cannot be parsed back strictly", () => {
    expect(validateFormatComplexity("[abc]", "day")).toBe("loose-parsing");
  });
});

describe("dateStringFor", () => {
  const file = { path: "daily/2024/01/15.md", basename: "15", extension: "md" };

  it("uses the basename when the format's basename is enough", () => {
    expect(dateStringFor({ ...file, basename: "2024-01-15" }, "YYYY-MM-DD", "day")).toBe("2024-01-15");
  });

  it("uses the path tail, as deep as the format nests, for a fragile nested format", () => {
    expect(dateStringFor(file, "YYYY/MM/DD", "day")).toBe("2024/01/15");
  });
});
