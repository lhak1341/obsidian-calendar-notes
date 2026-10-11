import type { Moment } from "moment";
import type { TFile } from "obsidian";

import { extractUnfinishedSection, insertRolledOverItems } from "./rollover";
import { renderTemplate } from "./templateEngine";
import type { Granularity, ISettings, PeriodicConfig, ResolvedPeriodicConfig } from "./types";

export type RolloverSettings = Pick<ISettings, "rolloverUnfinishedTasks" | "rolloverHeading">;

// Vault/cache I/O the orchestration needs, narrowed to exactly these
// operations so tests can stub plain functions instead of faking Obsidian's
// App/Vault. Rollover source is addressed by path, not TFile — resolving a
// path to a real TFile (and guarding against it being a folder or missing)
// stays in the port implementation, closer to app.vault.
export interface NoteCreationPorts {
  // The already-indexed note for this period, or null.
  findExisting(granularity: Granularity, date: Moment): TFile | null;
  readTemplate(path: string | undefined): Promise<string>;
  resolvePath(filename: string, cfg: PeriodicConfig): Promise<string>;
  createNote(path: string, contents: string): Promise<TFile>;
  // Writes contents only if the file is still empty when the write happens.
  // Returns whether it wrote.
  seedIfEmpty(path: string, contents: string): Promise<boolean>;
  // Nearest earlier day note's path, or null if there isn't one.
  findNearestBeforePath(date: Moment): string | null;
  // null if the path doesn't resolve to a readable file.
  readSource(path: string): Promise<string | null>;
  modifySource(path: string, contents: string): Promise<void>;
}

interface RenderedNote {
  contents: string;
  rolloverSource: { path: string; remainingContent: string } | null;
}

// Renders the template and, for day notes with rollover enabled, folds in
// unfinished tasks from the nearest earlier day note.
async function renderPeriodicNote(
  ports: NoteCreationPorts,
  filename: string,
  granularity: Granularity,
  date: Moment,
  cfg: ResolvedPeriodicConfig,
  rollover: RolloverSettings
): Promise<RenderedNote> {
  const templateContents = await ports.readTemplate(cfg.templatePath);
  let contents = renderTemplate(templateContents, {
    filename,
    granularity,
    date,
    format: cfg.format,
    now: window.moment(),
  });

  let rolloverSource: RenderedNote["rolloverSource"] = null;
  const { rolloverUnfinishedTasks, rolloverHeading } = rollover;
  if (granularity === "day" && rolloverUnfinishedTasks && rolloverHeading) {
    const sourcePath = ports.findNearestBeforePath(date);
    const sourceContent = sourcePath ? await ports.readSource(sourcePath) : null;
    if (sourcePath && sourceContent !== null) {
      const { remainingContent, itemsText } = extractUnfinishedSection(
        sourceContent,
        rolloverHeading
      );
      if (itemsText) {
        contents = insertRolledOverItems(contents, rolloverHeading, itemsText);
        rolloverSource = { path: sourcePath, remainingContent };
      }
    }
  }

  return { contents, rolloverSource };
}

// Renders a periodic note from its template, folds in rolled-over unfinished
// tasks (if enabled), creates the note, and only then strips those tasks from
// the source note — so a failure between create and strip duplicates a task
// instead of losing it.
export async function createNoteFromTemplate(
  ports: NoteCreationPorts,
  granularity: Granularity,
  date: Moment,
  cfg: ResolvedPeriodicConfig,
  rollover: RolloverSettings
): Promise<TFile> {
  const filename = date.format(cfg.format);
  const { contents, rolloverSource } = await renderPeriodicNote(
    ports,
    filename,
    granularity,
    date,
    cfg,
    rollover
  );

  const destPath = await ports.resolvePath(filename, cfg);
  const file = await ports.createNote(destPath, contents);

  if (rolloverSource) {
    await ports.modifySource(rolloverSource.path, rolloverSource.remainingContent);
  }

  return file;
}

// The note for this period if it exists, otherwise a freshly created one.
export async function getOrCreateNote(
  ports: NoteCreationPorts,
  granularity: Granularity,
  date: Moment,
  cfg: ResolvedPeriodicConfig,
  rollover: RolloverSettings
): Promise<TFile> {
  return (
    ports.findExisting(granularity, date) ??
    createNoteFromTemplate(ports, granularity, date, cfg, rollover)
  );
}

// Fills a note the user just created by hand (an empty file whose name matches
// a periodic format) with the same template + rollover a command-created note
// gets. `filename` is the file's own basename: a strict match may use any of
// the config's possible formats, so it can differ from `date.format(cfg.format)`.
// Writes only if the file is still empty, and strips the rollover source only
// if it wrote. Returns whether it seeded.
export async function seedNoteFromTemplate(
  ports: NoteCreationPorts,
  path: string,
  filename: string,
  granularity: Granularity,
  date: Moment,
  cfg: ResolvedPeriodicConfig,
  rollover: RolloverSettings
): Promise<boolean> {
  const { contents, rolloverSource } = await renderPeriodicNote(
    ports,
    filename,
    granularity,
    date,
    cfg,
    rollover
  );

  const seeded = await ports.seedIfEmpty(path, contents);
  if (seeded && rolloverSource) {
    await ports.modifySource(rolloverSource.path, rolloverSource.remainingContent);
  }
  return seeded;
}
