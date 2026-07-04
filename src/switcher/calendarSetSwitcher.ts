import { App, type FuzzyMatch, FuzzySuggestModal } from "obsidian";
import type { CalendarSet, IPeriodicNoteController } from "src/types";

export class CalendarSetSuggestModal extends FuzzySuggestModal<CalendarSet> {
  constructor(app: App, readonly plugin: IPeriodicNoteController) {
    super(app);
  }

  getItemText(item: CalendarSet): string {
    return item.toString();
  }

  getItems(): CalendarSet[] {
    return this.plugin.getCalendarSets();
  }

  renderSuggestion(calendarSet: FuzzyMatch<CalendarSet>, el: HTMLElement) {
    el.createDiv({ text: calendarSet.item.id });
  }

  async onChooseItem(item: CalendarSet, _evt: MouseEvent | KeyboardEvent): Promise<void> {
    this.plugin.setActiveSet(item.id);
  }
}
