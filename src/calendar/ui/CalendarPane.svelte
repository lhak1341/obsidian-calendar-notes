<script lang="ts">
  import type { Moment } from "moment";
  import { Menu } from "obsidian";
  import type { TFile } from "obsidian";
  import { onDestroy, onMount, untrack } from "svelte";

  import { displayConfigs } from "src/granularity";
  import { DEFAULT_SETTINGS } from "src/settings/defaults";
  import type { Granularity, IPeriodicNoteController, ISettings } from "src/types";
  import { createWordCountSource } from "../sources/wordCount";
  import Calendar from "./Calendar.svelte";
  import { openWithConfirm } from "./openWithConfirm";
  import { dayUID, weekUID } from "./types";

  // ── Props ──────────────────────────────────────────────────────────────────
  let { plugin }: { plugin: IPeriodicNoteController } = $props();

  // untrack: plugin is a stable reference that never changes — these top-level
  // reads are intentionally non-reactive.
  const p = untrack(() => plugin);

  // ── Settings ───────────────────────────────────────────────────────────────
  let showWeekNums = $state(DEFAULT_SETTINGS.showWeekNums);
  let useJapaneseWeekdays = $state(DEFAULT_SETTINGS.useJapaneseWeekdays);
  let wordsPerDot = $state(DEFAULT_SETTINGS.wordsPerDot);
  let shouldConfirmBeforeCreate = $state(DEFAULT_SETTINGS.shouldConfirmBeforeCreate);

  const unsubSettings = p.settings.subscribe((s: ISettings) => {
    showWeekNums = s.showWeekNums;
    useJapaneseWeekdays = s.useJapaneseWeekdays;
    wordsPerDot = s.wordsPerDot;
    shouldConfirmBeforeCreate = s.shouldConfirmBeforeCreate;
  });

  // ── Dot source ─────────────────────────────────────────────────────────────
  const getDots = $derived(createWordCountSource(p.app.vault, () => wordsPerDot));

  // ── Selected day tracking ──────────────────────────────────────────────────
  let selectedId = $state("");
  let calendarRef: Calendar | null = null;

  function syncSelectedId() {
    const file = p.app.workspace.getActiveFile();
    if (!file) { selectedId = ""; return; }
    const meta = p.cache.find(file.path);
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

  // ── Calendar cells: day and week ───────────────────────────────────────────
  type CellGranularity = Extract<Granularity, "day" | "week">;
  const uidFor: Record<CellGranularity, (date: Moment) => string> = {
    day: dayUID,
    week: weekUID,
  };

  function getNote(granularity: CellGranularity, date: Moment): TFile | null {
    return plugin.cache.getPeriodicNote(granularity, date);
  }

  async function handleClick(granularity: CellGranularity, date: Moment, inNewSplit: boolean) {
    if (await openWithConfirm(granularity, date, plugin, shouldConfirmBeforeCreate, { inNewSplit }))
      selectedId = uidFor[granularity](date);
  }

  function handleContextMenu(granularity: CellGranularity, date: Moment, event: MouseEvent) {
    const { periodicity } = displayConfigs[granularity];
    const exists = !!getNote(granularity, date);
    const menu = new Menu();
    menu.addItem((item) =>
      item
        .setTitle(`${exists ? "Open" : "Create"} ${periodicity} note`)
        .setIcon(exists ? "file" : "file-plus")
        .onClick(() => {
          plugin.openPeriodicNote(granularity, date);
        })
    );
    menu.showAtMouseEvent(event);
  }
</script>

<Calendar
  bind:this={calendarRef}
  {selectedId}
  {showWeekNums}
  {useJapaneseWeekdays}
  {getDots}
  getNoteForDate={(date) => getNote("day", date)}
  getNoteForWeek={(date) => getNote("week", date)}
  onClickDay={(date, inNewSplit) => handleClick("day", date, inNewSplit)}
  onClickWeek={(date, inNewSplit) => handleClick("week", date, inNewSplit)}
  onContextMenuDay={(date, event) => handleContextMenu("day", date, event)}
  onContextMenuWeek={(date, event) => handleContextMenu("week", date, event)}
/>
