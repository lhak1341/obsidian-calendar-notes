import { normalizePath, Notice, TFile, type App } from "obsidian";

import type { PeriodicNotesCache } from "./cache";
import type { NoteCreationPorts } from "./noteCreation";
import type { PeriodicConfig } from "./types";
import { join } from "./utils";

async function getTemplateContents(app: App, templatePath: string | undefined): Promise<string> {
  const { metadataCache, vault } = app;
  const normalizedTemplatePath = normalizePath(templatePath ?? "");
  if (templatePath === "/") {
    return "";
  }

  try {
    const templateFile = metadataCache.getFirstLinkpathDest(normalizedTemplatePath, "");
    return templateFile ? await vault.cachedRead(templateFile) : "";
  } catch (err) {
    console.error(`Failed to read the template '${normalizedTemplatePath}'`, err);
    new Notice("Failed to read the note template");
    return "";
  }
}

async function ensureFolderExists(app: App, path: string): Promise<void> {
  const dirs = path.replace(/\\/g, "/").split("/");
  dirs.pop(); // remove basename

  for (let i = 1; i <= dirs.length; i++) {
    const dir = join(...dirs.slice(0, i));
    if (dir && !app.vault.getAbstractFileByPath(dir)) {
      await app.vault.createFolder(dir);
    }
  }
}

async function getNoteCreationPath(
  app: App,
  filename: string,
  periodicConfig: PeriodicConfig
): Promise<string> {
  const directory = periodicConfig.folder ?? "";
  const filenameWithExt = !filename.endsWith(".md") ? `${filename}.md` : filename;

  const path = normalizePath(join(directory, filenameWithExt));
  await ensureFolderExists(app, path);
  return path;
}

// Obsidian-backed adapter for the note creation seam. Forwards only: the
// rollover/seeding policy lives in noteCreation.ts.
export function obsidianNoteCreationPorts(
  app: App,
  cache: Pick<PeriodicNotesCache, "getPeriodicNote" | "findNearestBefore">
): NoteCreationPorts {
  const { vault } = app;
  return {
    findExisting: (granularity, date) => cache.getPeriodicNote(granularity, date),
    readTemplate: (path) => getTemplateContents(app, path),
    resolvePath: (filename, cfg) => getNoteCreationPath(app, filename, cfg),
    createNote: (path, contents) => vault.create(path, contents),
    seedIfEmpty: async (path, contents) => {
      const file = vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile)) return false;
      let seeded = false;
      await vault.process(file, (data) => {
        if (data !== "") return data;
        seeded = true;
        return contents;
      });
      return seeded;
    },
    findNearestBeforePath: (date) => cache.findNearestBefore("day", date)?.filePath ?? null,
    readSource: async (path) => {
      const file = vault.getAbstractFileByPath(path);
      return file instanceof TFile ? vault.cachedRead(file) : null;
    },
    modifySource: async (path, contents) => {
      const file = vault.getAbstractFileByPath(path);
      if (file instanceof TFile) await vault.modify(file, contents);
    },
  };
}
