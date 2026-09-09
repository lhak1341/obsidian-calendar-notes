import { describe, expect, it } from "vitest";

import { extractUnfinishedSection, insertRolledOverItems } from "./rollover";

describe("extractUnfinishedSection", () => {
  it("moves unfinished checkboxes and leaves finished ones behind", () => {
    const content = [
      "# Plan",
      "- [ ] Task A",
      "- [x] Task B",
      "- [ ] Task C",
      "",
      "# Notes",
      "Some notes",
    ].join("\n");

    const { remainingContent, itemsText } = extractUnfinishedSection(content, "# Plan");

    expect(itemsText).toBe("- [ ] Task A\n- [ ] Task C");
    expect(remainingContent).toBe(
      ["# Plan", "- [x] Task B", "", "# Notes", "Some notes"].join("\n")
    );
  });

  it("moves the whole indented block with an unfinished top-level checkbox", () => {
    const content = [
      "# Plan",
      "- [ ] Task A",
      "  - [ ] Sub task",
      "  Some note under it",
      "- [x] Task B",
    ].join("\n");

    const { itemsText } = extractUnfinishedSection(content, "# Plan");

    expect(itemsText).toBe("- [ ] Task A\n  - [ ] Sub task\n  Some note under it");
  });

  it("leaves an unfinished child behind when its parent is finished", () => {
    const content = ["# Plan", "- [x] Task A", "  - [ ] Sub task"].join("\n");

    const { remainingContent, itemsText } = extractUnfinishedSection(content, "# Plan");

    expect(itemsText).toBe("");
    expect(remainingContent).toBe(content);
  });

  it("treats any non-x marker as unfinished", () => {
    const content = ["# Plan", "- [/] In progress"].join("\n");

    const { itemsText } = extractUnfinishedSection(content, "# Plan");

    expect(itemsText).toBe("- [/] In progress");
  });

  it("stops the section at the next heading of the same or shallower level", () => {
    const content = [
      "# Plan",
      "## Sub-heading",
      "- [ ] Still in Plan's section",
      "# Next section",
      "- [ ] Not in Plan's section",
    ].join("\n");

    const { itemsText } = extractUnfinishedSection(content, "# Plan");

    expect(itemsText).toBe("- [ ] Still in Plan's section");
  });

  it("is a no-op when the heading is missing", () => {
    const content = "# Other\n- [ ] Task";
    const result = extractUnfinishedSection(content, "# Plan");

    expect(result.itemsText).toBe("");
    expect(result.remainingContent).toBe(content);
  });

  it("is a no-op when nothing is unfinished", () => {
    const content = "# Plan\n- [x] Done";
    const result = extractUnfinishedSection(content, "# Plan");

    expect(result.itemsText).toBe("");
    expect(result.remainingContent).toBe(content);
  });
});

describe("insertRolledOverItems", () => {
  it("appends items to the bottom of an existing section", () => {
    const content = ["# Plan", "- [ ] Existing", "", "# Notes"].join("\n");

    const result = insertRolledOverItems(content, "# Plan", "- [ ] Rolled over");

    expect(result).toBe(
      ["# Plan", "- [ ] Existing", "", "- [ ] Rolled over", "# Notes"].join("\n")
    );
  });

  it("inserts directly under an empty section", () => {
    const content = ["# Plan", "", "# Notes"].join("\n");

    const result = insertRolledOverItems(content, "# Plan", "- [ ] Rolled over");

    expect(result).toBe(["# Plan", "", "- [ ] Rolled over", "# Notes"].join("\n"));
  });

  it("appends a new heading and section when the heading is missing", () => {
    const content = "# Notes\nSome notes";

    const result = insertRolledOverItems(content, "# Plan", "- [ ] Rolled over");

    expect(result).toBe("# Notes\nSome notes\n\n# Plan\n- [ ] Rolled over\n");
  });

  it("is a no-op when there's nothing to insert", () => {
    const content = "# Plan\n";
    expect(insertRolledOverItems(content, "# Plan", "")).toBe(content);
  });
});
