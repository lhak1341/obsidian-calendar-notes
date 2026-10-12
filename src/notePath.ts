import { join } from "./utils";

// Where a periodic note's file goes: the configured folder plus the filename,
// with ".md" added unless it is already there. Pure; the vault-facing port
// normalizes the result and creates the folders.
export function noteFilePath(folder: string, filename: string): string {
  const filenameWithExt = filename.endsWith(".md") ? filename : `${filename}.md`;
  return join(folder, filenameWithExt);
}

// Every folder that must exist before the file at `path` can be written,
// outermost first.
export function parentFolders(path: string): string[] {
  const dirs = path.replace(/\\/g, "/").split("/");
  dirs.pop(); // remove basename

  const folders: string[] = [];
  for (let i = 1; i <= dirs.length; i++) {
    const dir = join(...dirs.slice(0, i));
    if (dir) folders.push(dir);
  }
  return folders;
}
