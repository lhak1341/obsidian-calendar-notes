<script lang="ts">
  import { App } from "obsidian";
  import type { Writable } from "svelte/store";
  import capitalize from "lodash/capitalize";

  import type { Granularity, ISettings } from "src/types";
  import { granularities } from "src/types";
  import { displayConfigs } from "src/commands";
  import Dropdown from "src/settings/components/Dropdown.svelte";
  import SettingItem from "src/settings/components/SettingItem.svelte";
  import Toggle from "src/settings/components/Toggle.svelte";
  import {
    getLocaleOptions,
    getWeekStartOptions,
  } from "src/settings/utils";
  import {
    configureGlobalMomentLocale,
    type ILocalizationSettings,
    type IWeekStartOption,
  } from "src/settings/localization";

  import PeriodicGroup from "./details/PeriodicGroup.svelte";

  export let app: App;
  export let settings: Writable<ISettings>;
  export let localization: Writable<ILocalizationSettings>;

  let activeGranularity: Granularity = "day";
</script>

<!-- Note types -->
<div class="granularity-tab-bar">
  {#each granularities as g}
    <div
      class="granularity-tab"
      class:is-active={activeGranularity === g}
      class:is-disabled={!($settings[g]?.enabled ?? false)}
      on:click={() => (activeGranularity = g)}
    >
      {capitalize(displayConfigs[g].periodicity)}
    </div>
  {/each}
</div>
<PeriodicGroup {app} granularity={activeGranularity} {settings} />

<!-- General -->
<SettingItem
  name='Show "Timeline" complication on periodic notes'
  description="Adds a collapsible timeline to the top-right of all periodic notes"
  type="toggle"
  isHeading={false}
>
  <Toggle
    slot="control"
    isEnabled={$settings.enableTimelineComplication}
    onChange={(val) => {
      $settings.enableTimelineComplication = val;
    }}
  />
</SettingItem>

<!-- Calendar -->
<h3>Calendar</h3>
<SettingItem
  name="Show week numbers"
  description="Display ISO week numbers in the left column of the calendar"
  type="toggle"
  isHeading={false}
>
  <Toggle
    slot="control"
    isEnabled={$settings.showWeekNums}
    onChange={(val) => {
      $settings.showWeekNums = val;
    }}
  />
</SettingItem>

<SettingItem
  name="Confirm before creating note"
  description="Show a confirmation prompt before creating a new periodic note from the calendar"
  type="toggle"
  isHeading={false}
>
  <Toggle
    slot="control"
    isEnabled={$settings.shouldConfirmBeforeCreate}
    onChange={(val) => {
      $settings.shouldConfirmBeforeCreate = val;
    }}
  />
</SettingItem>

<SettingItem
  name="Words per dot"
  description="Number of words in a daily note required to add one dot (0 to disable)"
  type="dropdown"
  isHeading={false}
>
  <input
    slot="control"
    class="words-per-dot-input"
    type="number"
    min="0"
    step="50"
    value={$settings.wordsPerDot}
    on:change={(e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      if (!isNaN(val) && val >= 0) $settings.wordsPerDot = val;
    }}
  />
</SettingItem>

<!-- Localization -->
<h3>Localization</h3>
<div class="setting-item-description">
  These settings are applied to your entire vault, meaning the values you
  specify here may impact other plugins as well.
</div>
<SettingItem
  name="Start week on"
  description="Choose what day of the week to start. Select 'locale default' to use the default specified by moment.js"
  type="dropdown"
  isHeading={false}
>
  <Dropdown
    slot="control"
    options={getWeekStartOptions()}
    value={$localization.weekStart}
    onChange={(e) => {
      const val = (e.target as HTMLSelectElement).value;
      $localization.weekStart = val as IWeekStartOption;
      app.vault.setConfig("weekStart", val as IWeekStartOption);
    }}
  />
</SettingItem>

<SettingItem
  name="Locale"
  description="Override the locale used by the calendar and other plugins"
  type="dropdown"
  isHeading={false}
>
  <Dropdown
    slot="control"
    options={getLocaleOptions()}
    value={$localization.localeOverride}
    onChange={(e) => {
      const val = (e.target as HTMLSelectElement).value;
      $localization.localeOverride = val;
      app.vault.setConfig("localeOverride", val);
      configureGlobalMomentLocale($localization.localeOverride, $localization.weekStart);
    }}
  />
</SettingItem>

<style>
  .words-per-dot-input {
    width: 80px;
    text-align: right;
  }

  .granularity-tab-bar {
    display: flex;
    gap: 4px;
    padding: 4px;
    margin-bottom: 12px;
    background: var(--background-primary-alt);
    border: 1px solid var(--background-modifier-border);
    border-radius: 10px;
  }

  .granularity-tab {
    flex: 1;
    padding: 6px 4px;
    border-radius: 7px;
    text-align: center;
    font-size: 0.85em;
    font-weight: 500;
    cursor: pointer;
    color: var(--text-normal);
    transition: background 0.1s, color 0.1s;
    user-select: none;
  }

  .granularity-tab:hover:not(.is-active) {
    background: var(--background-modifier-hover);
  }

  .granularity-tab.is-active {
    background: var(--background-primary);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  }

  .granularity-tab.is-disabled {
    color: var(--text-faint);
  }

  .granularity-tab.is-active.is-disabled {
    color: var(--text-muted);
  }
</style>
