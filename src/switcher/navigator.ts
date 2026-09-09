import { type NLDatesPlugin, setIcon, App, SuggestModal, TFile } from "obsidian";

import { DEFAULT_FORMAT } from "src/constants";
import { generateDateSuggestions, type DateNavigationItem } from "src/dateSuggestions";
import { isMetaPressed, join } from "src/utils";

import type { INoteIndex, INoteOps } from "../types";

const NAVIGATOR_INSTRUCTIONS = [
  { command: "⇥", purpose: "show related files" },
  { command: "↵", purpose: "to open" },
  { command: "ctrl ↵", purpose: "to open in a new pane" },
  { command: "esc", purpose: "to dismiss" },
];

export class NLDNavigator extends SuggestModal<DateNavigationItem> {
  private nlDatesPlugin: NLDatesPlugin;

  constructor(readonly app: App, readonly plugin: INoteOps & INoteIndex) {
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

  // Obsidian's SuggestModal has no public API to set a query and recompute
  // suggestions other than firing a real "input" event on inputEl.
  presetQuery(query: string): void {
    this.inputEl.value = query;
    this.inputEl.dispatchEvent(new Event("input"));
  }

  private getSelectedItem(): DateNavigationItem {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    return (this as any).chooser.values[(this as any).chooser.selectedItem];
  }

  getSuggestions(query: string): DateNavigationItem[] {
    return generateDateSuggestions(
      query,
      this.plugin.getActiveGranularities(),
      (dateStr) => this.nlDatesPlugin.parseDate(dateStr),
      this.plugin.getFormat("week")
    );
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
    readonly plugin: INoteOps & INoteIndex,
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
      nav.presetQuery(oldQuery);
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
