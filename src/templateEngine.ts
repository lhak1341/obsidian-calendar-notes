import type { Moment, unitOfTime } from "moment";

import type { Granularity } from "./types";

export interface TemplateContext {
  filename: string;
  granularity: Granularity;
  // The note's date. Never mutated.
  date: Moment;
  // The note's filename format, used when a variable has no `:format` of its own.
  format: string;
  // Source of every time-of-day value, so rendering is deterministic.
  now: Moment;
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// Index of a weekday within the locale's week (0 = the locale's first day).
function localeWeekdayIndex(dayName: string): number {
  const firstDay = window.moment.localeData().firstDayOfWeek();
  return (WEEKDAYS.indexOf(dayName.toLowerCase()) - firstDay + 7) % 7;
}

// `date` with `now`'s time of day, shifted by an optional `+1d`-style offset.
function withNowTime(date: Moment, now: Moment, offset: { amount: string; unit: string } | null) {
  const result = date.clone().set({
    hour: now.get("hour"),
    minute: now.get("minute"),
    second: now.get("second"),
  });
  if (offset) {
    result.add(parseInt(offset.amount, 10), offset.unit as unitOfTime.DurationConstructor);
  }
  return result;
}

// Month, quarter and year notes: `{{month}}`, `{{quarter+1Q:fmt}}`, `{{year-1y}}`
// resolve to the start of that period, offset and formatted.
function applyPeriodVariable(contents: string, ctx: TemplateContext): string {
  const token = ctx.granularity;
  return contents.replace(
    new RegExp(`{{\\s*(${token})\\s*(([+-]\\d+)([yqmwdhs]))?\\s*(:.+?)?}}`, "gi"),
    (_, _tok, calc, amount, unit, momentFormat) => {
      const periodStart = withNowTime(
        ctx.date.clone().startOf(token as Parameters<Moment["startOf"]>[0]),
        ctx.now,
        calc ? { amount, unit } : null
      );
      return periodStart.format(momentFormat ? momentFormat.substring(1).trim() : ctx.format);
    }
  );
}

// Fills the template variables for one periodic note. Which variables exist
// depends on the granularity: `{{date:fmt}}`-style forms only in day notes,
// `{{monday:fmt}}` only in week notes, `{{month}}`/`{{quarter}}`/`{{year}}`
// only in their own notes. Anything else is left as written.
export function renderTemplate(rawTemplate: string, ctx: TemplateContext): string {
  const { filename, granularity, date, format, now } = ctx;
  let contents = rawTemplate
    .replace(/{{\s*date\s*}}/gi, filename)
    .replace(/{{\s*time\s*}}/gi, now.format("HH:mm"))
    .replace(/{{\s*title\s*}}/gi, filename);

  if (granularity === "day") {
    contents = contents
      .replace(/{{\s*yesterday\s*}}/gi, date.clone().subtract(1, "day").format(format))
      .replace(/{{\s*tomorrow\s*}}/gi, date.clone().add(1, "d").format(format))
      .replace(
        /{{\s*(date|time)\s*(([+-]\d+)([yqmwdhs]))?\s*(:.+?)?}}/gi,
        (_, _timeOrDate, calc, amount, unit, momentFormat) =>
          withNowTime(date, now, calc ? { amount, unit } : null).format(
            momentFormat ? momentFormat.substring(1).trim() : format
          )
      );
  } else if (granularity === "week") {
    contents = contents.replace(
      /{{\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s*:(.*?)}}/gi,
      (_, dayName, momentFormat) =>
        date.clone().weekday(localeWeekdayIndex(dayName)).format(momentFormat.trim())
    );
  } else {
    contents = applyPeriodVariable(contents, ctx);
  }

  return contents;
}
