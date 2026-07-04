import type { Moment } from "moment";
import { type NLDatesPlugin, setIcon, App, SuggestModal, TFile } from "obsidian";

import { isIsoFormat } from "src/calendarSet";
import { DEFAULT_FORMAT } from "src/constants";
import type { MatchType } from "src/types";
import { getRelativeDate, isMetaPressed, join } from "src/utils";

import type { Granularity, IPeriodicNoteController } from "../types";

export interface DateNavigationItem {
  granularity: Granularity;
  date: Moment;
  label: string;
  matchData?: {
    exact: boolean;
    matchType: MatchType;
  };
}

const NAVIGATOR_INSTRUCTIONS = [
  { command: "⇥", purpose: "show related files" },
  { command: "↵", purpose: "to open" },
  { command: "ctrl ↵", purpose: "to open in a new pane" },
  { command: "esc", purpose: "to dismiss" },
];

export class NLDNavigator extends SuggestModal<DateNavigationItem> {
  private nlDatesPlugin: NLDatesPlugin;

  constructor(readonly app: App, readonly plugin: IPeriodicNoteController) {
    super(app);

    this.setInstructions(NAVIGATOR_INSTRUCTIONS);
    this.setPlaceholder("Type date to find related notes");

    this.nlDatesPlugin = app.plugins.getPlugin("nldates-obsidian") as NLDatesPlugin;

    this.scope.register(["Meta"], "Enter", (evt: KeyboardEvent) => {
      // @ts-expect-error this.chooser exists but is not exposed
      this.chooser.useSelectedItem(evt);
    });

    this.scope.register([], "Tab", (evt: KeyboardEvent) => {
      evt.preventDefault();
      this.close();
      new RelatedFilesSwitcher(
        this.app,
        this.plugin,
        this.getSelectedItem(),
        this.inputEl.value
      ).open();
    });
  }

  private getSelectedItem(): DateNavigationItem {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    return (this as any).chooser.values[(this as any).chooser.selectedItem];
  }

  /** XXX: this is pretty messy currently. Not sure if I like the format yet */
  private getPeriodicNotesFromQuery(query: string, date: Moment) {
    let granularity: Granularity = "day";

    const granularityExp = /\b(week|month|quarter|year)s?\b/.exec(query);
    if (granularityExp) {
      granularity = granularityExp[1] as Granularity;
    }

    let label = "";
    if (granularity === "week") {
      const format = this.plugin.getFormat("week");
      const weekNumber = isIsoFormat(format) ? "WW" : "ww";
      label = date.format(`GGGG [Week] ${weekNumber}`);
    } else if (granularity === "day") {
      label = `${getRelativeDate(granularity, date)}, ${date.format("MMMM DD")}`;
    } else {
      label = query;
    }

    const suggestions = [
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

  getSuggestions(query: string): DateNavigationItem[] {
    const dateInQuery = this.nlDatesPlugin.parseDate(query);
    const quickSuggestions = this.getDateSuggestions(query);

    if (quickSuggestions.length) {
      return quickSuggestions;
    }

    if (dateInQuery.moment.isValid()) {
      return this.getPeriodicNotesFromQuery(query, dateInQuery.moment);
    }
    return [];
  }

  getDateSuggestions(query: string): DateNavigationItem[] {
    const activeGranularities = this.plugin.getActiveGranularities();
    const getSuggestion = (dateStr: string, granularity: Granularity) => {
      const date = this.nlDatesPlugin.parseDate(dateStr);
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

  renderSuggestion(value: DateNavigationItem, el: HTMLElement) {
    const numRelatedNotes = this.plugin
      .getPeriodicNotes(value.granularity, value.date)
      .filter((e) => e.matchData.exact === false).length;

    const periodicNote = this.plugin.getPeriodicNote(value.granularity, value.date);

    if (!periodicNote) {
      const format = this.plugin.getFormat(value.granularity);
      const folder = this.plugin.getActiveConfig(value.granularity).folder || "/";
      el.setText(value.label);
      el.createSpan({ cls: "suggestion-flair", prepend: true }, (el) => {
        setIcon(el, "add-note-glyph");
      });
      if (numRelatedNotes > 0) {
        el.createSpan({ cls: "suggestion-badge", text: `+${numRelatedNotes}` });
      }
      el.createDiv({
        cls: "suggestion-note",
        text: join(folder, value.date.format(format)),
      });
      return;
    }

    const curPath = this.app.workspace.getActiveFile()?.path ?? "";
    const filePath = this.app.metadataCache.fileToLinktext(periodicNote, curPath, true);

    el.setText(value.label);
    el.createDiv({ cls: "suggestion-note", text: filePath });
    el.createSpan({ cls: "suggestion-flair", prepend: true }, (el) => {
      setIcon(el, `calendar-${value.granularity}`);
    });
    if (numRelatedNotes > 0) {
      el.createSpan({ cls: "suggestion-badge", text: `+${numRelatedNotes}` });
    }
  }

  async onChooseSuggestion(item: DateNavigationItem, evt: MouseEvent | KeyboardEvent) {
    this.plugin.openPeriodicNote(item.granularity, item.date, {
      inNewSplit: isMetaPressed(evt),
    });
  }
}

const RELATED_FILES_INSTRUCTIONS = [
  { command: "*", purpose: "show all notes within this period" },
  { command: "↵", purpose: "to open" },
  { command: "shift ↵", purpose: "to open in a new pane" },
  { command: "esc", purpose: "to dismiss" },
];

export class RelatedFilesSwitcher extends SuggestModal<DateNavigationItem> {
  private inputLabel!: HTMLElement;
  private includeFinerGranularities: boolean;

  constructor(
    readonly app: App,
    readonly plugin: IPeriodicNoteController,
    readonly selectedItem: DateNavigationItem,
    readonly oldQuery: string
  ) {
    super(app);

    this.includeFinerGranularities = false;
    this.setInstructions(RELATED_FILES_INSTRUCTIONS);
    this.setPlaceholder(`Search notes related to ${selectedItem.label}...`);

    this.inputEl.parentElement?.prepend(
      createDiv("periodic-notes-switcher-input-container", (inputContainer) => {
        inputContainer.appendChild(this.inputEl);
        this.inputLabel = inputContainer.createDiv({
          cls: "related-notes-mode-indicator",
          text: "Expanded",
        });
        this.inputLabel.toggleVisibility(false);
      })
    );

    this.scope.register([], "Tab", (evt: KeyboardEvent) => {
      evt.preventDefault();
      this.close();
      const nav = new NLDNavigator(this.app, this.plugin);
      nav.open();

      nav.inputEl.value = oldQuery;
      nav.inputEl.dispatchEvent(new Event("input"));
    });

    this.scope.register(["Shift"], "8", (evt: KeyboardEvent) => {
      evt.preventDefault();
      this.includeFinerGranularities = !this.includeFinerGranularities;
      this.inputLabel.toggleVisibility(this.includeFinerGranularities);
      this.inputEl.dispatchEvent(new Event("input"));
    });
  }

  private getDatePrefixedNotes(
    item: DateNavigationItem,
    query: string
  ): DateNavigationItem[] {
    return this.plugin
      .getPeriodicNotes(item.granularity, item.date, this.includeFinerGranularities)
      .filter((e) => e.matchData.exact === false)
      .filter((e) => e.filePath.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
      .map((e) => ({
        label: e.filePath,
        date: e.date,
        granularity: e.granularity,
        matchData: e.matchData,
      }));
  }

  getSuggestions(query: string): DateNavigationItem[] {
    return this.getDatePrefixedNotes(this.selectedItem, query);
  }

  renderSuggestion(value: DateNavigationItem, el: HTMLElement) {
    el.setText(value.label);
    el.createDiv({
      cls: "suggestion-note",
      text: value.date.format(DEFAULT_FORMAT[value.granularity]),
    });
    el.createSpan({ cls: "suggestion-flair", prepend: true }, (el) => {
      setIcon(el, `calendar-${value.granularity}`);
    });
  }

  async onChooseSuggestion(item: DateNavigationItem, evt: MouseEvent | KeyboardEvent) {
    const file = this.app.vault.getAbstractFileByPath(item.label);
    if (file && file instanceof TFile) {
      const inNewSplit = evt.shiftKey;
      const leaf = inNewSplit
        ? this.app.workspace.getLeaf("split")
        : this.app.workspace.getLeaf(false);
      await leaf.openFile(file, { active: true });
    }
  }
}
