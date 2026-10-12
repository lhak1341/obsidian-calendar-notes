import type { Granularity } from "./types";

// Facts about moment format strings. Pure: no Obsidian imports, so the matcher,
// calendar sets, suggestions and settings validation all share it.

export function removeEscapedCharacters(format: string): string {
  const withoutBrackets = format.replace(/\[[^\]]*\]/g, ""); // remove everything within brackets

  return withoutBrackets.replace(/\\./g, "");
}

interface FileLike {
  path: string;
  basename: string;
  extension: string;
}

function pathWithoutExtension(file: FileLike): string {
  const extLen = file.extension.length + 1;
  return file.path.slice(0, -extLen);
}

// Splits a moment format string on "/", ignoring slashes escaped inside
// bracket literals (e.g. "YYYY[/]MM" is one segment, not two) — this is the
// single source of truth for how many folder levels a nested format has.
export function splitFormatSegments(format: string): string[] {
  const segments: string[] = [];
  let current = "";
  let bracketDepth = 0;
  for (const char of format) {
    if (char === "[") bracketDepth++;
    if (char === "]") bracketDepth = Math.max(0, bracketDepth - 1);

    if (char === "/" && bracketDepth === 0) {
      segments.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  segments.push(current);
  return segments;
}

function getBasename(format: string): string {
  return splitFormatSegments(format).pop() ?? "";
}

export function isIsoFormat(format: string): boolean {
  const cleanFormat = removeEscapedCharacters(format);
  return /w{1,2}/.test(cleanFormat);
}

export function validateFormatComplexity(
  format: string,
  granularity: Granularity
): "valid" | "fragile-basename" | "loose-parsing" {
  const testFormattedDate = window.moment().format(format);
  const parsedDate = window.moment(testFormattedDate, format, true);
  if (!parsedDate.isValid()) {
    return "loose-parsing";
  }

  const segments = splitFormatSegments(format);
  if (segments.length > 1) {
    if (
      granularity === "day" &&
      !["m", "d", "y"].every(
        (requiredChar) =>
          getBasename(format)
            .replace(/\[[^\]]*\]/g, "") // remove everything within brackets
            .toLowerCase()
            .indexOf(requiredChar) !== -1
      )
    ) {
      return "fragile-basename";
    }
  }

  return "valid";
}

// Picks the string to parse as a date for this file: its basename, or, for a
// nested format with a fragile basename (YYYY/MM/DD), the path tail as deep as
// the format nests.
export function dateStringFor(
  file: FileLike,
  format: string,
  granularity: Granularity
): string {
  // pseudo-intelligently find files when the format is YYYY/MM/DD for example
  if (validateFormatComplexity(format, granularity) === "fragile-basename") {
    const fileName = pathWithoutExtension(file);
    const nestingLvl = splitFormatSegments(format).length;
    const pathParts = fileName.split("/");
    return pathParts.slice(-nestingLvl).join("/");
  }
  return file.basename;
}
