<script lang="ts">
  import type { App } from "obsidian";
  import { onMount } from "svelte";

  import { FolderSuggest } from "src/ui/file-suggest";
  import type { Granularity, PeriodicConfig } from "src/types";

  import { validateFolder } from "../validation";
  import { useFieldValidation } from "./useFieldValidation";
  import type { Readable } from "svelte/store";
  import { displayConfigs } from "src/granularity";

  export let config: Readable<PeriodicConfig>;
  export let app: App;
  export let granularity: Granularity;

  let inputEl: HTMLInputElement;

  const { error, onChange, onInput } = useFieldValidation(
    () => inputEl.value,
    (value) => validateFolder(app, value)
  );

  onMount(() => {
    new FolderSuggest(app, inputEl);
  });
</script>

<div class="setting-item">
  <div class="setting-item-info">
    <div class="setting-item-name">Note Folder</div>
    <div class="setting-item-description">
      New {displayConfigs[granularity].periodicity} notes will be placed here
    </div>
    {#if $error}
      <div class="has-error">{$error}</div>
    {/if}
  </div>
  <div class="setting-item-control">
    <input
      bind:value={$config.folder}
      bind:this={inputEl}
      class:has-error={!!$error}
      type="text"
      spellcheck={false}
      placeholder="e.g. folder 1/folder 2"
      on:change={onChange}
      on:input={onInput}
    />
  </div>
</div>

<style>
  .setting-item-control input {
    flex-grow: 1;
  }
</style>
