<script lang="ts">
  import type { Moment } from "moment";
  import { Menu } from "obsidian";
  import type { TFile } from "obsidian";
  import { onDestroy, onMount, untrack } from "svelte";

  import { createStreakSource } from "../sources/streak";
  import { createWordCountSource } from "../sources/wordCount";
  import type { IPeriodicNoteController, ISettings } from "src/types";
  import Calendar from "./Calendar.svelte";
  import { dayUID, weekUID } from "./types";

  // ── Props ──────────────────────────────────────────────────────────────────
  let { plugin }: { plugin: IPeriodicNoteController } = $props();

  // untrack: plugin is a stable reference that never changes — these top-level
  // reads are intentionally non-reactive.
  const p = untrack(() => plugin);

  // ── Settings ───────────────────────────────────────────────────────────────
  let showWeekNums = $state(false);
  let wordsPerDot = $state(250);
  let shouldConfirmBeforeCreate = $state(true);

  const unsubSettings = p.settings.subscribe((s: ISettings) => {
    showWeekNums = s.showWeekNums ?? false;
    wordsPerDot = s.wordsPerDot ?? 250;
    shouldConfirmBeforeCreate = s.shouldConfirmBeforeCreate ?? true;
  });

  // ── Dot sources ────────────────────────────────────────────────────────────
  const sources = $derived([
    createWordCountSource(p.app.vault, () => wordsPerDot),
    createStreakSource(),
  ]);

  // ── Selected day tracking ──────────────────────────────────────────────────
  let selectedId = $state("");
  let calendarRef: Calendar | null = null;

  function syncSelectedId() {
    const file = p.app.workspace.getActiveFile();
    if (!file) { selectedId = ""; return; }
    const meta = p.findInCache(file.path);
    if (!meta) { selectedId = ""; return; }
    if (meta.granularity === "day") selectedId = dayUID(meta.date);
    else if (meta.granularity === "week") selectedId = weekUID(meta.date);
    else selectedId = "";
  }

  // ── Event subscriptions ────────────────────────────────────────────────────
  const leafRef = p.app.workspace.on("active-leaf-change", syncSelectedId);
  const modifyRef = p.app.vault.on("modify", () => calendarRef?.refresh());
  const createRef = p.app.vault.on("create", () => calendarRef?.refresh());
  const deleteRef = p.app.vault.on("delete", () => calendarRef?.refresh());
  const renameRef = p.app.vault.on("rename", () => calendarRef?.refresh());

  onDestroy(() => {
    unsubSettings();
    p.app.workspace.offref(leafRef);
    p.app.vault.offref(modifyRef);
    p.app.vault.offref(createRef);
    p.app.vault.offref(deleteRef);
    p.app.vault.offref(renameRef);
  });

  // After the cache's onLayoutReady has run and indexed the vault, trigger a
  // dot refresh. Callbacks are queued in registration order, so the cache's
  // callback fires first, then ours.
  onMount(() => {
    p.app.workspace.onLayoutReady(() => calendarRef?.refresh());
    syncSelectedId();
  });

  // ── Note getters ───────────────────────────────────────────────────────────
  function getNoteForDate(date: Moment): TFile | null {
    return plugin.getPeriodicNote("day", date);
  }

  function getNoteForWeek(date: Moment): TFile | null {
    return plugin.getPeriodicNote("week", date);
  }

  // ── Click handlers ─────────────────────────────────────────────────────────
  async function handleClickDay(date: Moment, inNewSplit: boolean) {
    const exists = !!plugin.getPeriodicNote("day", date);
    if (!exists && shouldConfirmBeforeCreate) {
      const ok = window.confirm(`Create daily note for ${date.format("YYYY-MM-DD")}?`);
      if (!ok) return;
    }
    await plugin.openPeriodicNote("day", date, { inNewSplit });
    selectedId = dayUID(date);
  }

  async function handleClickWeek(date: Moment, inNewSplit: boolean) {
    const exists = !!plugin.getPeriodicNote("week", date);
    if (!exists && shouldConfirmBeforeCreate) {
      const ok = window.confirm(`Create weekly note for ${date.format("[W]WW GGGG")}?`);
      if (!ok) return;
    }
    await plugin.openPeriodicNote("week", date, { inNewSplit });
    selectedId = weekUID(date);
  }

  // ── Context menus ──────────────────────────────────────────────────────────
  function handleContextMenuDay(date: Moment, event: MouseEvent) {
    const note = plugin.getPeriodicNote("day", date);
    const menu = new Menu();
    if (note) {
      menu.addItem((item) =>
        item.setTitle("Open daily note").setIcon("file").onClick(() => {
          plugin.openPeriodicNote("day", date);
        })
      );
    } else {
      menu.addItem((item) =>
        item.setTitle("Create daily note").setIcon("file-plus").onClick(() => {
          plugin.openPeriodicNote("day", date);
        })
      );
    }
    menu.showAtMouseEvent(event);
  }

  function handleContextMenuWeek(date: Moment, event: MouseEvent) {
    const note = plugin.getPeriodicNote("week", date);
    const menu = new Menu();
    if (note) {
      menu.addItem((item) =>
        item.setTitle("Open weekly note").setIcon("file").onClick(() => {
          plugin.openPeriodicNote("week", date);
        })
      );
    } else {
      menu.addItem((item) =>
        item.setTitle("Create weekly note").setIcon("file-plus").onClick(() => {
          plugin.openPeriodicNote("week", date);
        })
      );
    }
    menu.showAtMouseEvent(event);
  }
</script>

<Calendar
  bind:this={calendarRef}
  {selectedId}
  {showWeekNums}
  {sources}
  {getNoteForDate}
  {getNoteForWeek}
  onClickDay={handleClickDay}
  onClickWeek={handleClickWeek}
  onContextMenuDay={handleContextMenuDay}
  onContextMenuWeek={handleContextMenuWeek}
/>
