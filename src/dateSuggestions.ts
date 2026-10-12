import type { Moment } from "moment";
import type { NLDResult } from "obsidian";

import { isIsoFormat } from "./formatRules";
import type { Granularity, MatchType } from "./types";
import { getRelativeDate } from "./utils";

export interface DateNavigationItem {
  granularity: Granularity;
  date: Moment;
  label: string;
  matchData?: {
    exact: boolean;
    matchType: MatchType;
  };
}

function getDateSuggestions(
  query: string,
  activeGranularities: Granularity[],
  parseDate: (dateStr: string) => NLDResult
): DateNavigationItem[] {
  const getSuggestion = (dateStr: string, granularity: Granularity): DateNavigationItem => {
    const date = parseDate(dateStr);
    return {
      granularity,
      date: date.moment,
      label: dateStr,
    };
  };

  const relativeExpr = query.match(/(next|last|this)/i);
  if (relativeExpr) {
    const reference = relativeExpr[1];
    return [
      getSuggestion(`${reference} Sunday`, "day"),
      getSuggestion(`${reference} Monday`, "day"),
      getSuggestion(`${reference} Tuesday`, "day"),
      getSuggestion(`${reference} Wednesday`, "day"),
      getSuggestion(`${reference} Thursday`, "day"),
      getSuggestion(`${reference} Friday`, "day"),
      getSuggestion(`${reference} Saturday`, "day"),
      getSuggestion(`${reference} week`, "week"),
      getSuggestion(`${reference} month`, "month"),
      // getSuggestion(`${reference} quarter`, "quarter"), TODO include once nldates supports quarters
      getSuggestion(`${reference} year`, "year"),
    ]
      .filter((items) => activeGranularities.includes(items.granularity))
      .filter((items) => items.label.toLowerCase().startsWith(query));
  }

  const relativeDate = query.match(/^in ([+-]?\d+)/i) || query.match(/^([+-]?\d+)/i);
  if (relativeDate) {
    const timeDelta = relativeDate[1];
    return [
      getSuggestion(`in ${timeDelta} days`, "day"),
      getSuggestion(`in ${timeDelta} weeks`, "day"),
      getSuggestion(`in ${timeDelta} weeks`, "week"),
      getSuggestion(`in ${timeDelta} months`, "month"),
      getSuggestion(`in ${timeDelta} years`, "day"),
      getSuggestion(`in ${timeDelta} years`, "year"),
      getSuggestion(`${timeDelta} days ago`, "day"),
      getSuggestion(`${timeDelta} weeks ago`, "day"),
      getSuggestion(`${timeDelta} weeks ago`, "week"),
      getSuggestion(`${timeDelta} months ago`, "month"),
      getSuggestion(`${timeDelta} years ago`, "day"),
      getSuggestion(`${timeDelta} years ago`, "year"),
    ]
      .filter((items) => activeGranularities.includes(items.granularity))
      .filter((item) => item.label.toLowerCase().startsWith(query));
  }

  return [
    getSuggestion("today", "day"),
    getSuggestion("yesterday", "day"),
    getSuggestion("tomorrow", "day"),
    getSuggestion("this week", "week"),
    getSuggestion("last week", "week"),
    getSuggestion("next week", "week"),
    getSuggestion("this month", "month"),
    getSuggestion("last month", "month"),
    getSuggestion("next month", "month"),
    // TODO - requires adding new parser to NLDates
    // getSuggestion("this quarter", "quarter"),
    // getSuggestion("last quarter", "quarter"),
    // getSuggestion("next quarter", "quarter"),
    getSuggestion("this year", "year"),
    getSuggestion("last year", "year"),
    getSuggestion("next year", "year"),
  ]
    .filter((items) => activeGranularities.includes(items.granularity))
    .filter((items) => items.label.toLowerCase().startsWith(query));
}

/** XXX: this is pretty messy currently. Not sure if I like the format yet */
function getPeriodicNotesFromQuery(
  query: string,
  date: Moment,
  weekFormat: string
): DateNavigationItem[] {
  let granularity: Granularity = "day";

  const granularityExp = /\b(week|month|quarter|year)s?\b/.exec(query);
  if (granularityExp) {
    granularity = granularityExp[1] as Granularity;
  }

  let label = "";
  if (granularity === "week") {
    const weekNumber = isIsoFormat(weekFormat) ? "WW" : "ww";
    label = date.format(`GGGG [Week] ${weekNumber}`);
  } else if (granularity === "day") {
    label = `${getRelativeDate(granularity, date)}, ${date.format("MMMM DD")}`;
  } else {
    label = query;
  }

  const suggestions: DateNavigationItem[] = [
    {
      label,
      date,
      granularity,
    },
  ];

  if (granularity !== "day") {
    suggestions.push({
      label: `${getRelativeDate(granularity, date)}, ${date.format("MMMM DD")}`,
      date,
      granularity: "day",
    });
  }

  return suggestions;
}

// query: what the user has typed in the date switcher.
// parseDate: nldates-obsidian's NLP date parser — the actual "understand
// English" step; not reimplemented here, just injected so this stays
// testable without a live plugin instance.
// weekFormat: the day-granularity-agnostic week format string (only read
// when a query resolves to "week"), so callers resolve it once up front
// instead of this function reaching back into settings.
export function generateDateSuggestions(
  query: string,
  activeGranularities: Granularity[],
  parseDate: (dateStr: string) => NLDResult,
  weekFormat: string
): DateNavigationItem[] {
  const quickSuggestions = getDateSuggestions(query, activeGranularities, parseDate);
  if (quickSuggestions.length) {
    return quickSuggestions;
  }

  const dateInQuery = parseDate(query);
  if (dateInQuery.moment.isValid()) {
    return getPeriodicNotesFromQuery(query, dateInQuery.moment, weekFormat);
  }
  return [];
}
