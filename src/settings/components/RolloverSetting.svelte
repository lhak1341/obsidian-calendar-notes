<script lang="ts">
  import type { Writable } from "svelte/store";

  import type { ISettings } from "src/types";

  export let settings: Writable<ISettings>;
</script>

<div class="setting-item mod-toggle">
  <div class="setting-item-info">
    <div class="setting-item-name">Roll over unfinished tasks</div>
    <div class="setting-item-description">
      When today's daily note is created, move unfinished checkboxes out of the
      section below from the nearest previous daily note
    </div>
  </div>
  <div class="setting-item-control">
    <div
      class="checkbox-container"
      class:is-enabled={$settings.rolloverUnfinishedTasks}
      on:click={() => {
        $settings.rolloverUnfinishedTasks = !$settings.rolloverUnfinishedTasks;
      }}
    />
  </div>
</div>

{#if $settings.rolloverUnfinishedTasks}
  <div class="setting-item">
    <div class="setting-item-info">
      <div class="setting-item-name">Rollover section heading</div>
      <div class="setting-item-description">
        The exact heading line to move unfinished tasks from and into, e.g.
        "# Plan"
      </div>
    </div>
    <div class="setting-item-control">
      <input
        bind:value={$settings.rolloverHeading}
        type="text"
        spellcheck={false}
        placeholder="# Plan"
      />
    </div>
  </div>
{/if}

<style>
  .setting-item-control input {
    flex-grow: 1;
  }
</style>
