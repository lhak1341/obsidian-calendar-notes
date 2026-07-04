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
    if (sources.length === 0) return;

    const allDays = weeks.flatMap((w) => w.days);
    const newDots: Record<string, CalendarDot[]> = {};

    Promise.all(
      allDays.map(async (date) => {
        const key = dayUID(date);
        const note = getNoteForDate(date);
        const results = await Promise.all(sources.map((s) => s.getDots(date, note)));
        newDots[key] = results.flat();
      })
    ).then(() => {
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

<div class="calendar-container">
  <!-- Navigation -->
  <div class="calendar-nav">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <h3 class="calendar-title" onclick={resetMonth}>
      <span class="calendar-month">{displayedMonth.format("MMM")}</span>
      <span class="calendar-year">{displayedMonth.format("YYYY")}</span>
    </h3>
    <div class="calendar-nav-right">
      <button class="calendar-nav-btn clickable-icon" onclick={prevMonth} aria-label="Previous month">‹</button>
      <button class="calendar-nav-btn" onclick={resetMonth} aria-label="Go to today">Today</button>
      <button class="calendar-nav-btn clickable-icon" onclick={nextMonth} aria-label="Next month">›</button>
    </div>
  </div>

  <!-- Grid -->
  <table class="calendar">
    <colgroup>
      {#if showWeekNums}<col class="weeknum-col" />{/if}
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
            <td>
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="calendar-weeknum"
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
                    <svg class="dot" class:filled={dot.isFilled} viewBox="0 0 6 6" xmlns="http://www.w3.org/2000/svg"><circle cx="3" cy="3" r="2" /></svg>
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
                class="calendar-day"
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
                    <svg class="dot" class:filled={dot.isFilled} viewBox="0 0 6 6" xmlns="http://www.w3.org/2000/svg"><circle cx="3" cy="3" r="2" /></svg>
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
  .calendar-container {
    --color-dot: var(--text-muted);
    --color-text-title: var(--text-normal);
    --color-text-heading: var(--text-muted);
    --color-text-day: var(--text-normal);
    --color-text-today: var(--interactive-accent);
    --color-text-weeknum: var(--text-muted);
    padding: 0 8px;
  }

  /* Navigation */
  .calendar-nav {
    align-items: center;
    display: flex;
    margin: 0.6em 0 1em;
  }

  .calendar-title {
    color: var(--color-text-title);
    cursor: pointer;
    font-size: 1.5em;
    margin: 0;
  }

  .calendar-month {
    font-weight: 500;
    text-transform: capitalize;
  }

  .calendar-year {
    color: var(--interactive-accent);
  }

  .calendar-nav-right {
    display: flex;
    align-items: center;
    margin-left: auto;
  }

  .calendar-nav-btn {
    background: none;
    border: none;
    border-radius: 4px;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 0.7em;
    font-weight: 600;
    letter-spacing: 1px;
    margin: 0 2px;
    padding: 2px 6px;
    text-transform: uppercase;
  }

  .calendar-nav-btn.clickable-icon {
    font-size: 1.4em;
    font-weight: 300;
    padding: 0 4px;
  }

  /* Table */
  .calendar {
    border-collapse: collapse;
    width: 100%;
  }

  .weeknum-col {
    border-right: 1px solid var(--background-modifier-border);
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
  .calendar-day {
    border-radius: 4px;
    color: var(--color-text-day);
    cursor: pointer;
    font-size: 0.8em;
    padding: 4px;
    text-align: center;
    transition: background-color 0.1s ease-in, color 0.1s ease-in;
  }

  .calendar-day:hover {
    background-color: var(--interactive-hover);
  }

  .calendar-day.adjacent-month {
    opacity: 0.25;
  }

  .calendar-day.today {
    color: var(--color-text-today);
  }

  .calendar-day.active,
  .calendar-day.active.today {
    background-color: var(--interactive-accent);
    color: var(--text-on-accent);
  }

  .calendar-day.active:hover {
    background-color: var(--interactive-accent-hover);
  }

  /* Week number cells */
  td:first-child .calendar-weeknum {
    border-right: 1px solid var(--background-modifier-border);
  }

  .calendar-weeknum {
    border-radius: 4px;
    color: var(--color-text-weeknum);
    cursor: pointer;
    font-size: 0.65em;
    padding: 4px;
    text-align: center;
    transition: background-color 0.1s ease-in, color 0.1s ease-in;
  }

  .calendar-weeknum:hover {
    background-color: var(--interactive-hover);
  }

  .calendar-weeknum.active {
    background-color: var(--interactive-accent);
    color: var(--text-on-accent);
  }

  .calendar-weeknum.active:hover {
    background-color: var(--interactive-accent-hover);
  }

  /* Dots */
  .dot-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    line-height: 6px;
    min-height: 6px;
  }

  .dot {
    display: inline-block;
    fill: none;
    height: 6px;
    margin: 0 1px;
    stroke: var(--color-dot);
    width: 6px;
  }

  .dot.filled {
    fill: var(--color-dot);
    stroke: none;
  }

  .active .dot {
    stroke: var(--text-on-accent);
  }

  .active .dot.filled {
    fill: var(--text-on-accent);
    stroke: none;
  }
</style>
