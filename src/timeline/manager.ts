import { MarkdownView } from "obsidian";
import { PeriodicNotesCache } from "src/cache";
import PeriodicNotesPlugin from "src/main";
import { mount, unmount } from "svelte";

import Timeline from "./Timeline.svelte";

export default class TimelineManager {
  // Maps each view's containerEl → its mounted Timeline instance
  private timelines = new Map<HTMLElement, ReturnType<typeof mount>>();

  constructor(readonly plugin: PeriodicNotesPlugin, readonly cache: PeriodicNotesCache) {
    this.plugin.app.workspace.onLayoutReady(() => {
      plugin.registerEvent(
        plugin.app.workspace.on("layout-change", this.onLayoutChange, this)
      );
      this.onLayoutChange();
    });
  }

  public cleanup() {
    for (const instance of this.timelines.values()) {
      unmount(instance);
    }
    this.timelines.clear();
  }

  private onLayoutChange(): void {
    const openViews = new Map<HTMLElement, MarkdownView>();
    this.plugin.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view instanceof MarkdownView) {
        openViews.set(leaf.view.containerEl, leaf.view);
      }
    });

    // Remove timelines for closed views
    for (const [target, instance] of this.timelines) {
      if (!openViews.has(target)) {
        unmount(instance);
        this.timelines.delete(target);
      }
    }

    // Add timelines for new views
    for (const [container, view] of openViews) {
      if (!this.timelines.has(container)) {
        this.timelines.set(
          container,
          mount(Timeline, {
            target: container,
            props: { plugin: this.plugin, cache: this.cache, view },
          })
        );
      }
    }
  }
}
