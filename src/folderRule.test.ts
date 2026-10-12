import { describe, expect, it } from "vitest";

import { folderLookupPath, isInFolder, normalizeFolder } from "./folderRule";

describe("isInFolder", () => {
  it("holds files and descendants of the folder", () => {
    expect(isInFolder("Daily/x.md", "Daily")).toBe(true);
    expect(isInFolder("Daily/2024/01/x.md", "Daily")).toBe(true);
  });

  it("does not hold a sibling that shares the name as a prefix", () => {
    expect(isInFolder("Daily2/x.md", "Daily")).toBe(false);
    expect(isInFolder("Dailyarchive.md", "Daily")).toBe(false);
  });

  it("treats every spelling of root as holding everything", () => {
    for (const root of ["", "/", "./", "  "]) {
      expect(isInFolder("x.md", root)).toBe(true);
      expect(isInFolder("a/b/x.md", root)).toBe(true);
    }
  });

  it("ignores leading and trailing slashes on the folder", () => {
    expect(isInFolder("a/b/x.md", "a/b/")).toBe(true);
    expect(isInFolder("a/b/x.md", "/a/b")).toBe(true);
    expect(isInFolder("a/bc/x.md", "a/b/")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(isInFolder("daily/x.md", "Daily")).toBe(false);
  });
});

describe("normalizeFolder and folderLookupPath", () => {
  it("normalizes nested folders", () => {
    expect(normalizeFolder(" /80 journal/81 daily/ ")).toBe("80 journal/81 daily");
  });

  it("looks the root up as '/'", () => {
    expect(folderLookupPath("")).toBe("/");
    expect(folderLookupPath("./")).toBe("/");
    expect(folderLookupPath("a/b/")).toBe("a/b");
  });
});
