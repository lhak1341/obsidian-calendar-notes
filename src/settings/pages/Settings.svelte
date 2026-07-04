<script lang="ts">
  import { App } from "obsidian";
  import type { Writable } from "svelte/store";

  import type { ISettings } from "src/types";
  import { granularities } from "src/types";
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
</script>

<!-- Note types -->
{#each granularities as granularity}
  <PeriodicGroup {app} {granularity} {settings} />
{/each}

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
</style>
