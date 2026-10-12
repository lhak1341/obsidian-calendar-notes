import type { Moment } from "moment";
import { addIcon, debounce, Notice, Plugin, type TFile } from "obsidian";
import { get, writable } from "svelte/store";

import { PeriodicNotesCache } from "./cache";
import { VIEW_TYPE_CALENDAR } from "./calendar/constants";
import { CalendarView } from "./calendar/view";
import { configFor } from "./calendarSet";
import { commandIds, getCommands } from "./commands";
import { activeGranularities, displayConfigs, iconId } from "./granularity";
import {
  calendarDayIcon,
  calendarMonthIcon,
  calendarWeekIcon,
  calendarQuarterIcon,
  calendarYearIcon,
} from "./icons";
import { addLegacySettingsCompat, type SettingsStore } from "./legacySettingsCompat";
import { showFileMenu } from "./modal";
import { getOrCreateNote, seedNoteFromTemplate } from "./noteCreation";
import { obsidianNoteCreationPorts } from "./obsidianNoteCreationPorts";
import { type ISettings, PeriodicNotesSettingsTab } from "./settings";
import { initializeLocaleConfigOnce } from "./settings/localization";
import {
  migrateLegacySettings,
  type LegacyPluginData,
} from "./settings/migrateLegacySettings";
import {
  findStartupNoteConfig,
  hasLegacyDailyNoteSettings,
} from "./settings/utils";
import { createSettingsEffectsTracker } from "./settingsEffects";
import { NLDNavigator } from "./switcher/navigator";
import TimelineManager from "./timeline/manager";
import {
  granularities,
  type Granularity,
  type IOpenOpts,
  type IPeriodicNoteController,
} from "./types";
import { isMetaPressed } from "./utils";

export default class PeriodicNotesPlugin extends Plugin implements IPeriodicNoteController {
  public settings!: SettingsStore;
  private ribbonEl: HTMLElement | null = null;

  public cache!: PeriodicNotesCache;
  private timelineManager!: TimelineManager;
  private settingsTab!: PeriodicNotesSettingsTab;
  private settingsEffects = createSettingsEffectsTracker();
  // A keystroke in a format or folder field changes the stored value each time;
  // rebuilding the index waits until typing pauses.
  private reindexSoon = debounce(() => this.cache?.reset(), 300, true);

  unload(): void {
    this.reindexSoon.cancel();
    this.settingsTab?.hide();
    this.timelineManager?.cleanup();
    super.unload();
  }

  async onload(): Promise<void> {
    addIcon(iconId("day"), calendarDayIcon);
    addIcon(iconId("week"), calendarWeekIcon);
    addIcon(iconId("month"), calendarMonthIcon);
    addIcon(iconId("quarter"), calendarQuarterIcon);
    addIcon(iconId("year"), calendarYearIcon);

    this.registerView(VIEW_TYPE_CALENDAR, (leaf) => new CalendarView(leaf, this));

    this.settings = addLegacySettingsCompat(writable<ISettings>());
    await this.loadSettings();
    this.register(this.settings.subscribe(this.onUpdateSettings.bind(this)));

    this.registerEvent(
      this.app.workspace.on("periodic-notes:empty-note-created", (file, match) => {
        const s = get(this.settings);
        seedNoteFromTemplate(
          this.noteCreationPorts(),
          file.path,
          file.basename,
          match.granularity,
          match.date,
          configFor(s, match.granularity),
          s
        ).catch((error: unknown) => {
          console.error("[Calendar Notes] could not apply the template to", file.path, error);
          new Notice(`Calendar Notes: could not apply the template to ${file.basename}`);
        });
      })
    );

    initializeLocaleConfigOnce(this.app);

    this.ribbonEl = null;
    this.cache = new PeriodicNotesCache(this.app, this.settings);
    // Without this the cache's registered events outlive a plugin disable.
    this.addChild(this.cache);
    this.timelineManager = new TimelineManager(this.app, this, this);

    this.openPeriodicNote = this.openPeriodicNote.bind(this);
    this.settingsTab = new PeriodicNotesSettingsTab(this.app, this);
    this.addSettingTab(this.settingsTab);

    this.configureRibbonIcons();
    this.configureCommands();

    this.addCommand({
      id: "show-date-switcher",
      name: "Show date switcher...",
      checkCallback: (checking: boolean) => {
        if (!this.app.plugins.getPlugin("nldates-obsidian")) {
          return false;
        }
        if (checking) {
          // Any open leaf is enough — NLDNavigator opens the target note itself and
          // treats the active file as optional, so it needs no editor or markdown view.
          return !!this.app.workspace.getMostRecentLeaf();
        }
        new NLDNavigator(this.app, this).open();
      },
    });

    this.addCommand({
      id: "open-calendar",
      name: "Open calendar",
      callback: () => this.activateCalendarView(),
    });

    this.app.workspace.onLayoutReady(() => {
      const startupNoteConfig = findStartupNoteConfig(this.settings);
      if (startupNoteConfig) {
        this.openPeriodicNote(startupNoteConfig.granularity, window.moment());
      }
    });
  }

  private configureRibbonIcons() {
    this.ribbonEl?.detach();

    const enabled = activeGranularities(get(this.settings));
    if (enabled.length) {
      const granularity = enabled[0];
      const config = displayConfigs[granularity];
      this.ribbonEl = this.addRibbonIcon(
        iconId(granularity),
        config.labelOpenPresent,
        (e: MouseEvent) => {
          if (e.type !== "auxclick") {
            this.openPeriodicNote(granularity, window.moment(), {
              inNewSplit: isMetaPressed(e),
            });
          }
        }
      );
      this.registerDomEvent(this.ribbonEl, "contextmenu", (e: MouseEvent) => {
        e.preventDefault();
        showFileMenu(this, {
          x: e.pageX,
          y: e.pageY,
        });
      });
    }
  }

  private configureCommands() {
    const s = get(this.settings);

    // Remove disabled commands
    granularities
      .filter((granularity) => !s[granularity]?.enabled)
      .forEach((granularity: Granularity) => {
        commandIds(granularity).forEach((id) =>
          this.app.commands.removeCommand(`${this.manifest.id}:${id}`)
        );
      });

    // Register enabled commands
    activeGranularities(s).forEach((granularity: Granularity) => {
      getCommands(this.app, this, granularity).forEach(this.addCommand.bind(this));
    });
  }

  async loadSettings(): Promise<void> {
    const savedData = (await this.loadData()) as (LegacyPluginData & Partial<ISettings>) | null;
    this.settings.set(migrateLegacySettings(savedData, hasLegacyDailyNoteSettings(this.app)));
  }

  private async onUpdateSettings(newSettings: ISettings): Promise<void> {
    const effects = this.settingsEffects.next(newSettings);

    await this.saveData(newSettings);
    if (effects.reconfigure) {
      this.configureCommands();
      this.configureRibbonIcons();
    }
    if (effects.reindex) this.reindexSoon();

    this.app.workspace.trigger("periodic-notes:settings-updated");
  }

  public async activateCalendarView(): Promise<void> {
    const { workspace } = this.app;
    const existing = workspace.getLeavesOfType(VIEW_TYPE_CALENDAR);
    if (existing.length > 0) {
      workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: VIEW_TYPE_CALENDAR, active: true });
      workspace.revealLeaf(leaf);
    }
  }

  private noteCreationPorts() {
    return obsidianNoteCreationPorts(this.app, this.cache);
  }

  public async getOrCreatePeriodicNote(granularity: Granularity, date: Moment): Promise<TFile> {
    const s = get(this.settings);
    return getOrCreateNote(
      this.noteCreationPorts(),
      granularity,
      date,
      configFor(s, granularity),
      s
    );
  }

  public async openPeriodicNote(
    granularity: Granularity,
    date: Moment,
    opts?: IOpenOpts
  ): Promise<void> {
    const { inNewSplit = false } = opts ?? {};
    const { workspace } = this.app;
    const file = await this.getOrCreatePeriodicNote(granularity, date);

    const leaf = inNewSplit ? workspace.getLeaf("split") : workspace.getLeaf(false);
    await leaf.openFile(file, { active: true });
  }
}
