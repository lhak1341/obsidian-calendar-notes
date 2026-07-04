<script lang="ts">
  import type { App } from "obsidian";
  import { writable, type Writable } from "svelte/store";

  import type { ISettings } from "src/types";
  import { getLocalizationSettings } from "../localization";

  import Settings from "./Settings.svelte";

  export let app: App;
  export let settings: Writable<ISettings>;

  const localization = writable(getLocalizationSettings(app));
</script>

<Settings {app} {settings} {localization} />
