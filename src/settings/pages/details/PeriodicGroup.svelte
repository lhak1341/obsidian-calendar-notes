<script lang="ts">
  import { App } from "obsidian";
  import type { Writable } from "svelte/store";
  import writableDerived from "svelte-writable-derived";

  import { displayConfigs } from "src/commands";
  import NoteFormatSetting from "src/settings/components/NoteFormatSetting.svelte";
  import NoteTemplateSetting from "src/settings/components/NoteTemplateSetting.svelte";
  import NoteFolderSetting from "src/settings/components/NoteFolderSetting.svelte";
  import type { Granularity } from "src/types";
  import { DEFAULT_PERIODIC_CONFIG } from "src/settings/defaults";
  import type { ISettings } from "src/types";
  import OpenAtStartupSetting from "src/settings/components/OpenAtStartupSetting.svelte";

  export let app: App;
  export let granularity: Granularity;
  export let settings: Writable<ISettings>;

  let config = writableDerived(
    settings,
    ($settings) => $settings[granularity] ?? { ...DEFAULT_PERIODIC_CONFIG },
    (reflecting, $settings) => {
      $settings[granularity] = reflecting;
      return $settings;
    }
  );
</script>

<div class="setting-group">
  <div class="setting-items">
    <div class="setting-item mod-toggle">
      <div class="setting-item-info">
        <div class="setting-item-name">Enabled</div>
        <div class="setting-item-description">
          Create and open {displayConfigs[granularity].periodicity} notes
        </div>
      </div>
      <div class="setting-item-control">
        <div
          class="checkbox-container"
          class:is-enabled={$config.enabled}
          on:click={() => {
            $config.enabled = !$config.enabled;
          }}
        />
      </div>
    </div>
    <NoteFormatSetting {config} {granularity} />
    <NoteFolderSetting {app} {config} {granularity} />
    <NoteTemplateSetting {app} {config} {granularity} />
    <OpenAtStartupSetting {config} {settings} {granularity} />
  </div>
</div>
