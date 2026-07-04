import { ItemView, WorkspaceLeaf } from "obsidian";
import { mount, unmount } from "svelte";

import type { IPeriodicNoteController } from "src/types";

import { VIEW_TYPE_CALENDAR } from "./constants";
import CalendarPane from "./ui/CalendarPane.svelte";

export class CalendarView extends ItemView {
  private component: Record<string, unknown> | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private plugin: IPeriodicNoteController
  ) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_CALENDAR;
  }

  getDisplayText(): string {
    return "Calendar";
  }

  getIcon(): string {
    return "calendar-days";
  }

  async onOpen(): Promise<void> {
    this.component = mount(CalendarPane, {
      target: this.contentEl,
      props: { plugin: this.plugin },
    });
  }

  async onClose(): Promise<void> {
    if (this.component) {
      unmount(this.component);
      this.component = null;
    }
  }
}
