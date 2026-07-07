<script lang="ts">
  import { App } from "obsidian";
  import type { Writable } from "svelte/store";
  import capitalize from "lodash/capitalize";

  import type { Granularity, ISettings } from "src/types";
  import { granularities } from "src/types";
  import { displayConfigs } from "src/commands";

  import PeriodicGroup from "./details/PeriodicGroup.svelte";

  export let app: App;
  export let settings: Writable<ISettings>;

  let activeGranularity: Granularity = "day";
</script>

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

<style>
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
