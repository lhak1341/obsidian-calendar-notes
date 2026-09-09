import type { Moment } from "moment";
import type { TFile } from "obsidian";

import { extractUnfinishedSection, insertRolledOverItems } from "./rollover";
import type { Granularity, PeriodicConfig, ResolvedPeriodicConfig } from "./types";
import { applyTemplateTransformations } from "./utils";

export interface RolloverOptions {
  heading: string;
}

// Vault/cache I/O the orchestration needs, narrowed to exactly these
// operations so tests can stub plain functions instead of faking Obsidian's
// App/Vault. Rollover source is addressed by path, not TFile — resolving a
// path to a real TFile (and guarding against it being a folder or missing)
// stays in the port implementation, closer to app.vault.
export interface NoteCreationPorts {
  readTemplate(path: string | undefined): Promise<string>;
  resolvePath(filename: string, cfg: PeriodicConfig): Promise<string>;
  createNote(path: string, contents: string): Promise<TFile>;
  // Nearest earlier day note's path, or null if there isn't one.
  findNearestBeforePath(date: Moment): string | null;
  // null if the path doesn't resolve to a readable file.
  readSource(path: string): Promise<string | null>;
  modifySource(path: string, contents: string): Promise<void>;
}

// Renders a periodic note from its template, folds in rolled-over unfinished
// tasks from the nearest earlier day note (if enabled), creates the note, and
// only then strips those tasks from the source note — so a failure between
// create and strip duplicates a task instead of losing it.
export async function createNoteFromTemplate(
  ports: NoteCreationPorts,
  granularity: Granularity,
  date: Moment,
  cfg: ResolvedPeriodicConfig,
  rollover: RolloverOptions | null
): Promise<TFile> {
  const filename = date.format(cfg.format);
  const templateContents = await ports.readTemplate(cfg.templatePath);
  let renderedContents = applyTemplateTransformations(
    filename,
    granularity,
    date,
    cfg.format,
    templateContents
  );

  let rolloverSource: { path: string; remainingContent: string } | null = null;
  if (granularity === "day" && rollover) {
    const sourcePath = ports.findNearestBeforePath(date);
    const sourceContent = sourcePath ? await ports.readSource(sourcePath) : null;
    if (sourcePath && sourceContent !== null) {
      const { remainingContent, itemsText } = extractUnfinishedSection(
        sourceContent,
        rollover.heading
      );
      if (itemsText) {
        renderedContents = insertRolledOverItems(renderedContents, rollover.heading, itemsText);
        rolloverSource = { path: sourcePath, remainingContent };
      }
    }
  }

  const destPath = await ports.resolvePath(filename, cfg);
  const file = await ports.createNote(destPath, renderedContents);

  if (rolloverSource) {
    await ports.modifySource(rolloverSource.path, rolloverSource.remainingContent);
  }

  return file;
}
