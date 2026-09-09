// Moves unfinished checkboxes out of one heading's section and into another
// note's copy of the same section. Pure string manipulation so it's testable
// without touching the vault.

const CHECKBOX_RE = /^(\s*)-\s\[([^\]])\]/;
const HEADING_RE = /^(#+)\s/;

function indentOf(line: string): number {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

function headingLevel(line: string): number | null {
  const match = line.match(HEADING_RE);
  return match ? match[1].length : null;
}

function isUnfinished(marker: string): boolean {
  return marker.toLowerCase() !== "x";
}

// Finds [headingLineIndex, sectionEndIndex) for the first line that matches
// `heading` exactly. The section ends at the next heading of the same or
// shallower level, or at end of file.
function findSection(
  lines: string[],
  heading: string
): { headingIndex: number; sectionEnd: number } | null {
  const targetLevel = headingLevel(heading);
  if (targetLevel === null) return null;

  const headingIndex = lines.findIndex((line) => line.trim() === heading.trim());
  if (headingIndex === -1) return null;

  let sectionEnd = lines.length;
  for (let i = headingIndex + 1; i < lines.length; i++) {
    const level = headingLevel(lines[i]);
    if (level !== null && level <= targetLevel) {
      sectionEnd = i;
      break;
    }
  }

  return { headingIndex, sectionEnd };
}

interface Block {
  start: number;
  end: number; // exclusive
  unfinished: boolean; // only meaningful for checkbox blocks
}

// Groups section lines into top-level blocks. A checkbox line's block also
// swallows every following line indented deeper than it (nested checkboxes,
// notes, etc.), so the whole subtree travels together.
function groupBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const checkboxMatch = lines[i].match(CHECKBOX_RE);
    if (!checkboxMatch) {
      blocks.push({ start: i, end: i + 1, unfinished: false });
      i++;
      continue;
    }

    const indent = checkboxMatch[1].length;
    const unfinished = isUnfinished(checkboxMatch[2]);
    let end = i + 1;
    while (end < lines.length && lines[end].trim() !== "" && indentOf(lines[end]) > indent) {
      end++;
    }
    blocks.push({ start: i, end, unfinished });
    i = end;
  }
  return blocks;
}

export interface RolloverExtraction {
  remainingContent: string;
  itemsText: string;
}

// Pulls every unfinished top-level checkbox block out of `heading`'s section
// in `content`. Returns the content with those blocks removed, plus the
// extracted lines. If the heading isn't found, or nothing is unfinished,
// `itemsText` is empty and `remainingContent` equals `content`.
export function extractUnfinishedSection(content: string, heading: string): RolloverExtraction {
  const lines = content.split("\n");
  const section = findSection(lines, heading);
  if (!section) {
    return { remainingContent: content, itemsText: "" };
  }

  const sectionLines = lines.slice(section.headingIndex + 1, section.sectionEnd);
  const blocks = groupBlocks(sectionLines);

  const kept: string[] = [];
  const moved: string[] = [];
  for (const block of blocks) {
    const blockLines = sectionLines.slice(block.start, block.end);
    if (block.unfinished) {
      moved.push(...blockLines);
    } else {
      kept.push(...blockLines);
    }
  }

  if (moved.length === 0) {
    return { remainingContent: content, itemsText: "" };
  }

  const newLines = [
    ...lines.slice(0, section.headingIndex + 1),
    ...kept,
    ...lines.slice(section.sectionEnd),
  ];

  return { remainingContent: newLines.join("\n"), itemsText: moved.join("\n") };
}

// Inserts `itemsText` at the bottom of `heading`'s section in `content`. If
// the heading isn't present, appends a new "heading + items" block at the
// end of the file instead, so items are never silently dropped.
export function insertRolledOverItems(content: string, heading: string, itemsText: string): string {
  if (!itemsText) return content;

  const lines = content.split("\n");
  const section = findSection(lines, heading);

  if (!section) {
    const trimmed = content.replace(/\n+$/, "");
    return `${trimmed}\n\n${heading}\n${itemsText}\n`;
  }

  const newLines = [
    ...lines.slice(0, section.sectionEnd),
    ...itemsText.split("\n"),
    ...lines.slice(section.sectionEnd),
  ];

  return newLines.join("\n");
}
