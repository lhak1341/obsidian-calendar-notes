import type { Moment } from "moment";
import { normalizePath, App, Notice, Platform, TFile } from "obsidian";

import { configFor } from "./calendarSet";
import { HUMANIZE_FORMAT } from "./constants";
import type { Granularity, ISettings, PeriodicConfig, PeriodicNoteCachedMetadata } from "./types";

export function isMetaPressed(e: MouseEvent | KeyboardEvent): boolean {
  return Platform.isMacOS ? e.metaKey : e.ctrlKey;
}

function getDaysOfWeek(): string[] {
  const { moment } = window;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let weekStart = (moment.localeData() as any)._week.dow;
  const daysOfWeek = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  while (weekStart) {
    const day = daysOfWeek.shift();
    if (day) daysOfWeek.push(day);
    weekStart--;
  }
  return daysOfWeek;
}

function getDayOfWeekNumericalValue(dayOfWeekName: string): number {
  return getDaysOfWeek().indexOf(dayOfWeekName.toLowerCase());
}

function applyPeriodTemplate(
  contents: string,
  token: string,
  date: Moment,
  format: string
): string {
  return contents.replace(
    new RegExp(`{{\\s*(${token})\\s*(([+-]\\d+)([yqmwdhs]))?\\s*(:.+?)?}}`, "gi"),
    (_, _tok, calc, timeDelta, unit, momentFormat) => {
      const now = window.moment();
      const periodStart = date
        .clone()
        .startOf(token as Parameters<Moment["startOf"]>[0])
        .set({
          hour: now.get("hour"),
          minute: now.get("minute"),
          second: now.get("second"),
        });
      if (calc) {
        periodStart.add(parseInt(timeDelta, 10), unit);
      }
      return momentFormat
        ? periodStart.format(momentFormat.substring(1).trim())
        : periodStart.format(format);
    }
  );
}

export function applyTemplateTransformations(
  filename: string,
  granularity: Granularity,
  date: Moment,
  format: string,
  rawTemplateContents: string
): string {
  let templateContents = rawTemplateContents
    .replace(/{{\s*date\s*}}/gi, filename)
    .replace(/{{\s*time\s*}}/gi, window.moment().format("HH:mm"))
    .replace(/{{\s*title\s*}}/gi, filename);

  if (granularity === "day") {
    templateContents = templateContents
      .replace(/{{\s*yesterday\s*}}/gi, date.clone().subtract(1, "day").format(format))
      .replace(/{{\s*tomorrow\s*}}/gi, date.clone().add(1, "d").format(format))
      .replace(
        /{{\s*(date|time)\s*(([+-]\d+)([yqmwdhs]))?\s*(:.+?)?}}/gi,
        (_, _timeOrDate, calc, timeDelta, unit, momentFormat) => {
          const now = window.moment();
          const currentDate = date.clone().set({
            hour: now.get("hour"),
            minute: now.get("minute"),
            second: now.get("second"),
          });
          if (calc) {
            currentDate.add(parseInt(timeDelta, 10), unit);
          }

          if (momentFormat) {
            return currentDate.format(momentFormat.substring(1).trim());
          }
          return currentDate.format(format);
        }
      );
  }

  if (granularity === "week") {
    templateContents = templateContents.replace(
      /{{\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s*:(.*?)}}/gi,
      (_, dayOfWeek, momentFormat) => {
        const day = getDayOfWeekNumericalValue(dayOfWeek);
        return date.weekday(day).format(momentFormat.trim());
      }
    );
  }

  if (granularity === "month") {
    templateContents = applyPeriodTemplate(templateContents, "month", date, format);
  }

  if (granularity === "quarter") {
    templateContents = applyPeriodTemplate(templateContents, "quarter", date, format);
  }

  if (granularity === "year") {
    templateContents = applyPeriodTemplate(templateContents, "year", date, format);
  }

  return templateContents;
}

export async function applyPeriodicTemplateToFile(
  app: App,
  file: TFile,
  settings: ISettings,
  metadata: PeriodicNoteCachedMetadata
) {
  const cfg = configFor(settings, metadata.granularity);
  const templateContents = await getTemplateContents(app, cfg.config.templatePath);
  const renderedContents = applyTemplateTransformations(
    file.basename,
    metadata.granularity,
    metadata.date,
    cfg.format,
    templateContents
  );
  return app.vault.process(file, () => renderedContents);
}

export async function getTemplateContents(
  app: App,
  templatePath: string | undefined
): Promise<string> {
  const { metadataCache, vault } = app;
  const normalizedTemplatePath = normalizePath(templatePath ?? "");
  if (templatePath === "/") {
    return Promise.resolve("");
  }

  try {
    const templateFile = metadataCache.getFirstLinkpathDest(normalizedTemplatePath, "");
    return templateFile ? vault.cachedRead(templateFile) : "";
  } catch (err) {
    console.error(`Failed to read the template '${normalizedTemplatePath}'`, err);
    new Notice("Failed to read the note template");
    return "";
  }
}

export async function getNoteCreationPath(
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

// Credit: @creationix/path.js
export function join(...partSegments: string[]): string {
  let parts: string[] = [];
  for (let i = 0, l = partSegments.length; i < l; i++) {
    parts = parts.concat(partSegments[i].split("/"));
  }
  const newParts = [];
  for (let i = 0, l = parts.length; i < l; i++) {
    const part = parts[i];
    if (!part || part === ".") continue;
    else newParts.push(part);
  }
  if (parts[0] === "") newParts.unshift("");
  return newParts.join("/");
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

export function getRelativeDate(granularity: Granularity, date: Moment) {
  if (granularity == "week") {
    const thisWeek = window.moment().startOf(granularity);
    const fromNow = window.moment(date).diff(thisWeek, "week");
    if (fromNow === 0) {
      return "This week";
    } else if (fromNow === -1) {
      return "Last week";
    } else if (fromNow === 1) {
      return "Next week";
    }
    return window.moment.duration(fromNow, granularity).humanize(true);
  } else if (granularity === "day") {
    const today = window.moment().startOf("day");
    const fromNow = window.moment(date).from(today);
    return window.moment(date).calendar(null, {
      lastWeek: "[Last] dddd",
      lastDay: "[Yesterday]",
      sameDay: "[Today]",
      nextDay: "[Tomorrow]",
      nextWeek: "dddd",
      sameElse: function () {
        return "[" + fromNow + "]";
      },
    });
  } else {
    return date.format(HUMANIZE_FORMAT[granularity]);
  }
}

