import { describe, expect, it } from "vitest";

import { noteFilePath, parentFolders } from "./notePath";

describe("noteFilePath", () => {
  it("puts the file in the folder and adds .md", () => {
    expect(noteFilePath("journal/daily", "2024-01-15")).toBe("journal/daily/2024-01-15.md");
  });

  it("keeps an existing .md extension", () => {
    expect(noteFilePath("journal", "2024-01-15.md")).toBe("journal/2024-01-15.md");
  });

  it("leaves a root slash for an empty folder, which the port's normalizePath strips", () => {
    expect(noteFilePath("", "2024-01-15")).toBe("/2024-01-15.md");
  });

  it("keeps the folders a nested filename carries", () => {
    expect(noteFilePath("journal", "2024/01/15")).toBe("journal/2024/01/15.md");
  });
});

describe("parentFolders", () => {
  it("lists every folder to create, outermost first", () => {
    expect(parentFolders("a/b/c/note.md")).toEqual(["a", "a/b", "a/b/c"]);
  });

  it("is empty for a file in the vault root", () => {
    expect(parentFolders("note.md")).toEqual([]);
  });

  it("treats backslashes as separators", () => {
    expect(parentFolders("a\\b\\note.md")).toEqual(["a", "a/b"]);
  });
});
