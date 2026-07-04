<script lang="ts">
  import type { Moment } from "moment";
  import type { TFile } from "obsidian";
  import { onDestroy } from "svelte";

  import type { CalendarDot, DotSource } from "./types";
  import { dayUID, weekUID } from "./types";

  // ── Props ──────────────────────────────────────────────────────────────────
  let {
    displayedMonth = $bindable(window.moment()),
    today = $bindable(window.moment()),
    selectedId = "",
    showWeekNums = false,
    sources = [],
    getNoteForDate = (_date: Moment): TFile | null => null,
    getNoteForWeek = (_date: Moment): TFile | null => null,
    onClickDay,
    onClickWeek,
    onHoverDay,
    onHoverWeek,
    onContextMenuDay,
    onContextMenuWeek,
  }: {
    displayedMonth?: Moment;
    today?: Moment;
    selectedId?: string;
    showWeekNums?: boolean;
    sources?: DotSource[];
    getNoteForDate?: (date: Moment) => TFile | null;
    getNoteForWeek?: (date: Moment) => TFile | null;
    onClickDay?: (date: Moment, isMetaPressed: boolean) => void;
    onClickWeek?: (date: Moment, isMetaPressed: boolean) => void;
    onHoverDay?: (date: Moment, target: EventTarget) => void;
    onHoverWeek?: (date: Moment, target: EventTarget) => void;
    onContextMenuDay?: (date: Moment, event: MouseEvent) => void;
    onContextMenuWeek?: (date: Moment, event: MouseEvent) => void;
  } = $props();

  // ── Local state ────────────────────────────────────────────────────────────
  let dotsByDate = $state<Record<string, CalendarDot[]>>({});
  let refreshTick = $state(0);

  export function refresh() {
    refreshTick++;
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  // weekdaysShort(true) returns days in locale order starting from configured week start
  const weekdays = $derived(displayedMonth && window.moment.weekdaysShort(true));

  const weeks = $derived.by(() => {
    const locale = window.moment().locale();
    const startOfMonth = displayedMonth.clone().locale(locale).date(1);
    const startOffset = startOfMonth.weekday();
    let date = startOfMonth.clone().subtract(startOffset, "days");

    const result: { weekNum: number; days: Moment[] }[] = [];
    for (let w = 0; w < 6; w++) {
      const days: Moment[] = [];
      for (let d = 0; d < 7; d++) {
        days.push(date.clone());
        date = date.clone().add(1, "day");
      }
      result.push({ weekNum: days[0].week(), days });
    }
    return result;
  });

  // ── Dot computation ────────────────────────────────────────────────────────
  $effect(() => {
    void refreshTick;
    if (sources.length === 0) return;

    const newDots: Record<string, CalendarDot[]> = {};

    const dayPromises = weeks
      .flatMap((w: { weekNum: number; days: Moment[] }) => w.days)
      .map(async (date: Moment) => {
        const note = getNoteForDate(date);
        const results = await Promise.all(sources.map((s) => s.getDots(date, note)));
        newDots[dayUID(date)] = (results as CalendarDot[][]).flat();
      });

    const weekPromises = weeks.map(async (w: { weekNum: number; days: Moment[] }) => {
      const weekDate = w.days[0];
      const note = getNoteForWeek(weekDate);
      const results = await Promise.all(sources.map((s) => s.getDots(weekDate, note)));
      newDots[weekUID(weekDate)] = (results as CalendarDot[][]).flat();
    });

    Promise.all([...dayPromises, ...weekPromises]).then(() => {
      dotsByDate = newDots;
    });
  });

  // ── Heartbeat: keep today current ─────────────────────────────────────────
  const heartbeat = setInterval(() => {
    const now = window.moment();
    today = now;
    if (displayedMonth.isSame(now, "day")) {
      displayedMonth = now.clone();
    }
  }, 60_000);

  onDestroy(() => clearInterval(heartbeat));

  // Locale-aware "Today" label (e.g. "Today", "Aujourd'hui", etc.)
  const todayDisplayStr = today.calendar().split(/\d|\s/)[0];

  // ── Helpers ────────────────────────────────────────────────────────────────
  function isMeta(e: MouseEvent): boolean {
    return navigator.appVersion.includes("Mac") ? e.metaKey : e.ctrlKey;
  }

  function prevMonth() {
    displayedMonth = displayedMonth.clone().subtract(1, "month");
  }

  function nextMonth() {
    displayedMonth = displayedMonth.clone().add(1, "month");
  }

  function resetMonth() {
    displayedMonth = today.clone();
  }
</script>

<div id="calendar-container" class="container">
  <!-- Navigation -->
  <div class="nav">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <h3 class="title" onclick={resetMonth}>
      <span class="month">{displayedMonth.format("MMM")}</span>
      <span class="year">{displayedMonth.format("YYYY")}</span>
    </h3>
    <div class="right-nav">
      <div class="arrow" onclick={prevMonth} aria-label="Previous month" role="button" tabindex="0">
        <svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
          <path fill="currentColor" d="M34.52 239.03L228.87 44.69c9.37-9.37 24.57-9.37 33.94 0l22.67 22.67c9.36 9.36 9.37 24.52.04 33.9L131.49 256l154.02 154.75c9.34 9.38 9.32 24.54-.04 33.9l-22.67 22.67c-9.37 9.37-24.57 9.37-33.94 0L34.52 272.97c-9.37-9.37-9.37-24.57 0-33.94z"></path>
        </svg>
      </div>
      <div class="reset-button" onclick={resetMonth} role="button" tabindex="0">{todayDisplayStr}</div>
      <div class="arrow right" onclick={nextMonth} aria-label="Next month" role="button" tabindex="0">
        <svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
          <path fill="currentColor" d="M34.52 239.03L228.87 44.69c9.37-9.37 24.57-9.37 33.94 0l22.67 22.67c9.36 9.36 9.37 24.52.04 33.9L131.49 256l154.02 154.75c9.34 9.38 9.32 24.54-.04 33.9l-22.67 22.67c-9.37 9.37-24.57 9.37-33.94 0L34.52 272.97c-9.37-9.37-9.37-24.57 0-33.94z"></path>
        </svg>
      </div>
    </div>
  </div>

  <!-- Grid -->
  <table class="calendar">
    <colgroup>
      {#if showWeekNums}<col />{/if}
      {#each weekdays as _}<col />{/each}
    </colgroup>
    <thead>
      <tr>
        {#if showWeekNums}<th>W</th>{/if}
        {#each weekdays as day}<th>{day}</th>{/each}
      </tr>
    </thead>
    <tbody>
      {#each weeks as week (week.weekNum)}
        <tr>
          {#if showWeekNums}
            {@const weekDate = week.days[0]}
            {@const wDots = dotsByDate[weekUID(weekDate)] ?? []}
            <td class="weeknum-td">
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="week-num"
                class:active={selectedId === weekUID(weekDate)}
                onclick={(e) => onClickWeek?.(weekDate.clone().weekday(0), isMeta(e))}
                oncontextmenu={(e) => { e.preventDefault(); onContextMenuWeek?.(weekDate, e); }}
                onpointerenter={(e) => onHoverWeek?.(weekDate, e.target!)}
                role="button"
                tabindex="0"
                onkeydown={(e) => e.key === "Enter" && onClickWeek?.(weekDate.clone().weekday(0), false)}
              >
                {week.weekNum}
                <div class="dot-container">
                  {#each wDots as dot}
                    {#if dot.isFilled}
                      <svg class="dot filled" viewBox="0 0 6 6" xmlns="http://www.w3.org/2000/svg"><circle cx="3" cy="3" r="2" /></svg>
                    {:else}
                      <svg class="hollow" viewBox="0 0 6 6" xmlns="http://www.w3.org/2000/svg"><circle cx="3" cy="3" r="2" /></svg>
                    {/if}
                  {/each}
                </div>
              </div>
            </td>
          {/if}

          {#each week.days as date (date.format())}
            {@const dDots = dotsByDate[dayUID(date)] ?? []}
            <td>
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="day"
                class:today={date.isSame(today, "day")}
                class:active={selectedId === dayUID(date)}
                class:adjacent-month={!date.isSame(displayedMonth, "month")}
                onclick={(e) => onClickDay?.(date, isMeta(e))}
                oncontextmenu={(e) => { e.preventDefault(); onContextMenuDay?.(date, e); }}
                onpointerenter={(e) => onHoverDay?.(date, e.target!)}
                role="button"
                tabindex="0"
                onkeydown={(e) => e.key === "Enter" && onClickDay?.(date, false)}
              >
                {date.format("D")}
                <div class="dot-container">
                  {#each dDots as dot}
                    {#if dot.isFilled}
                      <svg class="dot filled" viewBox="0 0 6 6" xmlns="http://www.w3.org/2000/svg"><circle cx="3" cy="3" r="2" /></svg>
                    {:else}
                      <svg class="hollow" viewBox="0 0 6 6" xmlns="http://www.w3.org/2000/svg"><circle cx="3" cy="3" r="2" /></svg>
                    {/if}
                  {/each}
                </div>
              </div>
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .container {
    --color-background-day: transparent;
    --color-background-weeknum: transparent;
    --color-dot: var(--text-muted);
    --color-arrow: var(--text-muted);
    --color-button: var(--text-muted);
    --color-text-title: var(--text-normal);
    --color-text-heading: var(--text-muted);
    --color-text-day: var(--text-normal);
    --color-text-today: var(--interactive-accent);
    --color-text-weeknum: var(--text-muted);
    padding: 0 8px;
  }

  /* Navigation */
  .nav {
    align-items: center;
    display: flex;
    margin: 0.6em 0 1em;
    padding: 0 8px;
    width: 100%;
  }

  .title {
    color: var(--color-text-title);
    cursor: pointer;
    font-size: 1.5em;
    margin: 0;
  }

  .month {
    font-weight: 500;
    text-transform: capitalize;
  }

  .year {
    color: var(--interactive-accent);
  }

  .right-nav {
    display: flex;
    justify-content: center;
    margin-left: auto;
  }

  .reset-button {
    cursor: pointer;
    border-radius: 4px;
    color: var(--color-button);
    font-size: 0.7em;
    font-weight: 600;
    letter-spacing: 1px;
    margin: 0 4px;
    padding: 0 4px;
    text-transform: uppercase;
  }

  .arrow {
    align-items: center;
    cursor: pointer;
    display: flex;
    justify-content: center;
    width: 24px;
  }

  .arrow.right {
    transform: rotate(180deg);
  }

  .arrow svg {
    color: var(--color-arrow);
    height: 16px;
    width: 16px;
  }

  /* Table */
  .calendar {
    border-collapse: collapse;
    width: 100%;
  }

  th {
    background-color: transparent;
    color: var(--color-text-heading);
    font-size: 0.6em;
    letter-spacing: 1px;
    padding: 4px;
    text-align: center;
    text-transform: uppercase;
  }

  /* Day cells */
  .day {
    background-color: var(--color-background-day);
    border-radius: 4px;
    color: var(--color-text-day);
    cursor: pointer;
    font-size: 0.8em;
    height: 100%;
    padding: 4px;
    position: relative;
    text-align: center;
    transition: background-color 0.1s ease-in, color 0.1s ease-in;
    vertical-align: baseline;
  }

  .day:hover {
    background-color: var(--interactive-hover);
  }

  .day.adjacent-month {
    opacity: 0.25;
  }

  .day.today {
    color: var(--color-text-today);
  }

  .day:active,
  .day.active,
  .day.active.today {
    background-color: var(--interactive-accent);
    color: var(--text-on-accent);
  }

  .day.active:hover {
    background-color: var(--interactive-accent-hover);
  }

  /* Week number cells */
  .weeknum-td {
    border-right: 1px solid var(--background-modifier-border);
  }

  .week-num {
    background-color: var(--color-background-weeknum);
    border-radius: 4px;
    color: var(--color-text-weeknum);
    cursor: pointer;
    font-size: 0.65em;
    height: 100%;
    padding: 4px;
    text-align: center;
    transition: background-color 0.1s ease-in, color 0.1s ease-in;
    vertical-align: baseline;
  }

  .week-num:hover {
    background-color: var(--interactive-hover);
  }

  .week-num.active:hover {
    background-color: var(--interactive-accent-hover);
  }

  .week-num.active {
    background-color: var(--interactive-accent);
    color: var(--text-on-accent);
  }

  /* Dots */
  .dot-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    line-height: 6px;
    min-height: 6px;
  }

  .dot,
  .hollow {
    display: inline-block;
    height: 6px;
    margin: 0 1px;
    width: 6px;
  }

  .dot.filled {
    fill: var(--color-dot);
  }

  .active .dot.filled {
    fill: var(--text-on-accent);
  }

  .hollow {
    fill: none;
    stroke: var(--color-dot);
  }

  .active .hollow {
    fill: none;
    stroke: var(--text-on-accent);
  }
</style>
