<script lang="ts">
  import { App } from "obsidian";
  import type { Writable } from "svelte/store";
  import writableDerived from "svelte-writable-derived";

  import { displayConfigs } from "src/commands";
  import NoteFormatSetting from "src/settings/components/NoteFormatSetting.svelte";
  import NoteTemplateSetting from "src/settings/components/NoteTemplateSetting.svelte";
  import NoteFolderSetting from "src/settings/components/NoteFolderSetting.svelte";
  import SettingItem from "src/settings/components/SettingItem.svelte";
  import Toggle from "src/settings/components/Toggle.svelte";
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

<div class="periodic-group">
  <SettingItem
    name="Enabled"
    description="Create and open {displayConfigs[granularity].periodicity} notes"
    type="toggle"
    isHeading={false}
  >
    <Toggle
      slot="control"
      isEnabled={$config.enabled}
      onChange={(val) => {
        $config.enabled = val;
      }}
    />
  </SettingItem>
  <NoteFormatSetting {config} {granularity} />
  <NoteFolderSetting {app} {config} {granularity} />
  <NoteTemplateSetting {app} {config} {granularity} />
  <OpenAtStartupSetting {config} {settings} {granularity} />
</div>

<style lang="scss">
  .periodic-group {
    background: var(--background-primary-alt);
    border: 1px solid var(--background-modifier-border);
    border-radius: 12px;
    overflow: hidden;
  }
</style>
