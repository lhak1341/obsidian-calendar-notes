<script lang="ts">
  import type { Writable } from "svelte/store";

  import type { Granularity, PeriodicConfig } from "src/types";
  import { displayConfigs } from "src/commands";
  import type { ISettings } from "..";
  import { clearStartupNote } from "../utils";

  export let config: Writable<PeriodicConfig>;
  export let settings: Writable<ISettings>;
  export let granularity: Granularity;
</script>

<div class="setting-item mod-toggle">
  <div class="setting-item-info">
    <div class="setting-item-name">Open on startup</div>
    <div class="setting-item-description">
      Opens your {displayConfigs[granularity].periodicity} note automatically whenever you open this vault
    </div>
  </div>
  <div class="setting-item-control">
    <div
      class="checkbox-container"
      class:is-enabled={$config.openAtStartup}
      on:click={() => {
        const newVal = !$config.openAtStartup;
        settings.update(clearStartupNote);
        $config.openAtStartup = newVal;
      }}
    />
  </div>
</div>
