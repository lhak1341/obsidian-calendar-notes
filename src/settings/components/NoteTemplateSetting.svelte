<script lang="ts">
  import type { App } from "obsidian";
  import { onMount } from "svelte";
  import type { Readable } from "svelte/store";
  import capitalize from "lodash/capitalize";

  import type { Granularity, PeriodicConfig } from "src/types";
  import { FileSuggest } from "src/ui/file-suggest";

  import { validateTemplate } from "../validation";
  import { useFieldValidation } from "./useFieldValidation";
  import { displayConfigs } from "src/commands";

  export let app: App;
  export let granularity: Granularity;
  export let config: Readable<PeriodicConfig>;

  let inputEl: HTMLInputElement;

  const { error, onChange, onInput } = useFieldValidation(
    () => inputEl.value,
    (value) => validateTemplate(app, value)
  );

  onMount(() => {
    new FileSuggest(app, inputEl);
  });
</script>

<div class="setting-item">
  <div class="setting-item-info">
    <div class="setting-item-name">
      {capitalize(displayConfigs[granularity].periodicity)} Note Template
    </div>
    <div class="setting-item-description">
      Choose the file to use as a template
    </div>
    {#if $error}
      <div class="has-error">{$error}</div>
    {/if}
  </div>
  <div class="setting-item-control">
    <input
      class:has-error={!!$error}
      type="text"
      spellcheck={false}
      placeholder="e.g. templates/template-file"
      bind:value={$config.templatePath}
      bind:this={inputEl}
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
