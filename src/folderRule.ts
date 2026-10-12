// How a configured folder setting relates to vault paths. "", "/", "./" and
// whitespace all mean the vault root; anything else is compared by whole path
// segments, so "Daily" holds "Daily/x.md" and "Daily/2024/x.md" but not
// "Daily2/x.md". Case-sensitive, like Obsidian's own paths.
export function normalizeFolder(folder: string): string {
  return folder
    .trim()
    .replace(/^(\.?\/)+/, "")
    .replace(/\/+$/, "");
}

export function isInFolder(path: string, folder: string): boolean {
  const normalized = normalizeFolder(folder);
  return normalized === "" || path.startsWith(`${normalized}/`);
}

// The path to ask the vault for when looking up the folder itself.
export function folderLookupPath(folder: string): string {
  return normalizeFolder(folder) || "/";
}
