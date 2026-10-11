import moment, { type Moment } from "moment";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderTemplate } from "./templateEngine";
import type { Granularity } from "./types";

// 2030-01-01 13:45:30 local: the "now" every time-of-day assertion is pinned to.
const NOW = new Date(2030, 0, 1, 13, 45, 30);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

interface RenderOpts {
  granularity: Granularity;
  format: string;
  date?: Moment;
  filename?: string;
}

function render(template: string, opts: RenderOpts): string {
  return renderTemplate(template, {
    filename: opts.filename ?? "FILE",
    granularity: opts.granularity,
    date: opts.date ?? moment("2024-03-15 08:00"), // a Friday
    format: opts.format,
    now: moment(),
  });
}

const day = (template: string, format = "YYYY-MM-DD") =>
  render(template, { granularity: "day", format });

describe("day notes", () => {
  it("replaces {{date}} and {{title}} with the filename", () => {
    expect(day("{{date}} / {{title}}")).toBe("FILE / FILE");
  });

  it("replaces {{time}} with the current time", () => {
    expect(day("{{time}}")).toBe("13:45");
  });

  it("is case-insensitive and tolerates inner spaces", () => {
    expect(day("{{ DATE }} {{ Title }} {{TIME}}")).toBe("FILE FILE 13:45");
  });

  it("renders {{yesterday}} and {{tomorrow}} in the note's format", () => {
    expect(day("{{yesterday}} {{tomorrow}}")).toBe("2024-03-14 2024-03-16");
  });

  it("formats the note's date with {{date:format}}", () => {
    expect(day("{{date:dddd}}")).toBe("Friday");
  });

  it("applies offsets to {{date}}, in the note's format when none is given", () => {
    expect(day("{{date+1d:YYYY-MM-DD}}")).toBe("2024-03-16");
    expect(day("{{date-1w:YYYY-MM-DD}}")).toBe("2024-03-08");
    expect(day("{{date+1d}}")).toBe("2024-03-16");
  });

  it("combines the note's date with the current time of day for {{time:format}}", () => {
    expect(day("{{time:HH:mm:ss}}")).toBe("13:45:30");
    expect(day("{{time+1h:YYYY-MM-DD HH:mm}}")).toBe("2024-03-15 14:45");
  });

  it("leaves unknown variables alone", () => {
    expect(day("{{nope}}")).toBe("{{nope}}");
  });
});

describe("week notes", () => {
  const week = (template: string) =>
    render(template, { granularity: "week", format: "gggg-[W]ww" });

  it("renders named weekdays of the note's week", () => {
    expect(week("{{monday:YYYY-MM-DD}} {{ Friday : DD }}")).toBe("2024-03-11 15");
  });

  it("starts the week from the locale's first day", () => {
    const original = moment.localeData().firstDayOfWeek();
    try {
      expect(week("{{sunday:YYYY-MM-DD}}")).toBe("2024-03-10");
      moment.updateLocale("en", { week: { dow: 1 } });
      expect(week("{{sunday:YYYY-MM-DD}}")).toBe("2024-03-17");
    } finally {
      moment.updateLocale("en", { week: { dow: original } });
    }
  });

  it("still replaces {{date}} and {{title}}, but not the day-only forms", () => {
    expect(week("{{date}} {{title}}")).toBe("FILE FILE");
    expect(week("{{date:YYYY}} {{yesterday}} {{time:HH}}")).toBe(
      "{{date:YYYY}} {{yesterday}} {{time:HH}}"
    );
  });
});

describe("month, quarter and year notes", () => {
  const month = (template: string) => render(template, { granularity: "month", format: "YYYY-MM" });
  const quarter = (template: string) =>
    render(template, { granularity: "quarter", format: "YYYY-[Q]Q" });
  const year = (template: string) => render(template, { granularity: "year", format: "YYYY" });

  it("renders the period's own token in the note's format", () => {
    expect(month("{{month}}")).toBe("2024-03");
    expect(quarter("{{quarter}}")).toBe("2024-Q1");
    expect(year("{{year}}")).toBe("2024");
  });

  it("formats the period start with {{token:format}}", () => {
    expect(month("{{month:MMMM}}")).toBe("March");
    expect(quarter("{{quarter:[Q]Q YYYY}}")).toBe("Q1 2024");
  });

  it("resolves to the start of the period, not the note's own day", () => {
    expect(month("{{month:YYYY-MM-DD}}")).toBe("2024-03-01");
    expect(quarter("{{quarter:YYYY-MM-DD}}")).toBe("2024-01-01");
    expect(year("{{year:MM-DD}}")).toBe("01-01");
  });

  it("applies offsets, case-insensitively", () => {
    expect(month("{{month+1M}}")).toBe("2024-04");
    expect(month("{{ MONTH -2M }}")).toBe("2024-01");
    expect(quarter("{{quarter+1Q}}")).toBe("2024-Q2");
    expect(year("{{year-1y}}")).toBe("2023");
  });

  it("reads the offset unit as moment does: lowercase m is minutes, M is months", () => {
    expect(month("{{month+1m}}")).toBe("2024-03");
    expect(month("{{month+1M}}")).toBe("2024-04");
  });

  it("uses the current time of day for the period start", () => {
    expect(month("{{month:HH:mm}}")).toBe("13:45");
  });

  it("only replaces the token that belongs to the note's granularity", () => {
    expect(month("{{quarter}} {{year}} {{date:YYYY}}")).toBe("{{quarter}} {{year}} {{date:YYYY}}");
    expect(year("{{month}}")).toBe("{{month}}");
  });

  it("still replaces {{date}} and {{title}}", () => {
    expect(month("{{date}} {{title}}")).toBe("FILE FILE");
  });
});

describe("renderTemplate inputs", () => {
  it("takes every time of day from the given `now`, not the system clock", () => {
    const out = renderTemplate("{{time}} {{time:HH:mm:ss}} {{month:HH}}", {
      filename: "FILE",
      granularity: "day",
      date: moment("2024-03-15 08:00"),
      format: "YYYY-MM-DD",
      now: moment("2000-01-01 01:02:03"),
    });

    expect(out).toBe("01:02 01:02:03 {{month:HH}}");
  });

  it.each([
    ["day", "{{date+1d}} {{yesterday}} {{time:HH}}"],
    ["week", "{{sunday:YYYY-MM-DD}} {{saturday:YYYY-MM-DD}}"],
    ["month", "{{month+1M}}"],
    ["quarter", "{{quarter+1Q}}"],
    ["year", "{{year-1y}}"],
  ] as const)("never mutates the note's date (%s)", (granularity, template) => {
    const date = moment("2024-03-15 08:00");

    renderTemplate(template, { filename: "FILE", granularity, date, format: "YYYY-MM-DD", now: moment() });

    expect(date.format("YYYY-MM-DD HH:mm")).toBe("2024-03-15 08:00");
  });
});
