import type { Moment } from "moment";
import { addIcon, Plugin, TFile } from "obsidian";
import { get, writable } from "svelte/store";

import { PeriodicNotesCache } from "./cache";
import { VIEW_TYPE_CALENDAR } from "./calendar/constants";
import { CalendarView } from "./calendar/view";
import { configFor } from "./calendarSet";
import { displayConfigs, getCommands } from "./commands";
import {
  calendarDayIcon,
  calendarMonthIcon,
  calendarWeekIcon,
  calendarQuarterIcon,
  calendarYearIcon,
} from "./icons";
import { addLegacySettingsCompat, type SettingsStore } from "./legacySettingsCompat";
import { showFileMenu } from "./modal";
import { createNoteFromTemplate, type NoteCreationPorts } from "./noteCreation";
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
import { NLDNavigator } from "./switcher/navigator";
import TimelineManager from "./timeline/manager";
import {
  granularities,
  type Granularity,
  type IOpenOpts,
  type IPeriodicNoteController,
  type PeriodicConfig,
  type PeriodicNoteCachedMetadata,
} from "./types";
import {
  applyPeriodicTemplateToFile,
  getNoteCreationPath,
  getTemplateContents,
  isMetaPressed,
} from "./utils";

export default class PeriodicNotesPlugin extends Plugin implements IPeriodicNoteController {
  public settings!: SettingsStore;
  private ribbonEl: HTMLElement | null = null;

  private cache!: PeriodicNotesCache;
  private timelineManager!: TimelineManager;
  private settingsTab!: PeriodicNotesSettingsTab;

  unload(): void {
    this.settingsTab?.hide();
    this.timelineManager?.cleanup();
    super.unload();
  }

  async onload(): Promise<void> {
    addIcon("calendar-day", calendarDayIcon);
    addIcon("calendar-week", calendarWeekIcon);
    addIcon("calendar-month", calendarMonthIcon);
    addIcon("calendar-quarter", calendarQuarterIcon);
    addIcon("calendar-year", calendarYearIcon);

    this.registerView(VIEW_TYPE_CALENDAR, (leaf) => new CalendarView(leaf, this));

    this.settings = addLegacySettingsCompat(writable<ISettings>());
    await this.loadSettings();
    this.register(this.settings.subscribe(this.onUpdateSettings.bind(this)));

    this.registerEvent(
      this.app.workspace.on("periodic-notes:empty-note-created", (file, match) =>
        applyPeriodicTemplateToFile(this.app, file, get(this.settings), match)
      )
    );

    initializeLocaleConfigOnce(this.app);

    this.ribbonEl = null;
    this.cache = new PeriodicNotesCache(this.app, this.settings);
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

    const activeGranularities = this.getActiveGranularities();
    if (activeGranularities.length) {
      const granularity = activeGranularities[0];
      const config = displayConfigs[granularity];
      this.ribbonEl = this.addRibbonIcon(
        `calendar-${granularity}`,
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
        getCommands(this.app, this, granularity).forEach((command) =>
          this.app.commands.removeCommand(`periodic-notes:${command.id}`)
        );
      });

    // Register enabled commands
    this.getActiveGranularities().forEach((granularity: Granularity) => {
      getCommands(this.app, this, granularity).forEach(this.addCommand.bind(this));
    });
  }

  async loadSettings(): Promise<void> {
    const savedData = (await this.loadData()) as (LegacyPluginData & Partial<ISettings>) | null;
    this.settings.set(migrateLegacySettings(savedData, hasLegacyDailyNoteSettings(this.app)));
  }

  private async onUpdateSettings(newSettings: ISettings): Promise<void> {
    await this.saveData(newSettings);
    this.configureCommands();
    this.configureRibbonIcons();

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

  private noteCreationPorts(): NoteCreationPorts {
    const { vault } = this.app;
    return {
      readTemplate: (path) => getTemplateContents(this.app, path),
      resolvePath: (filename, cfg) => getNoteCreationPath(this.app, filename, cfg),
      createNote: (path, contents) => vault.create(path, contents),
      findNearestBeforePath: (date) => this.cache.findNearestBefore("day", date)?.filePath ?? null,
      readSource: async (path) => {
        const file = vault.getAbstractFileByPath(path);
        return file instanceof TFile ? vault.cachedRead(file) : null;
      },
      modifySource: async (path, contents) => {
        const file = vault.getAbstractFileByPath(path);
        if (file instanceof TFile) await vault.modify(file, contents);
      },
    };
  }

  public async createPeriodicNote(
    granularity: Granularity,
    date: Moment
  ): Promise<TFile> {
    const s = get(this.settings);
    const cfg = configFor(s, granularity);
    const rollover =
      s.rolloverUnfinishedTasks && s.rolloverHeading ? { heading: s.rolloverHeading } : null;

    return createNoteFromTemplate(this.noteCreationPorts(), granularity, date, cfg, rollover);
  }

  public getPeriodicNote(granularity: Granularity, date: Moment): TFile | null {
    return this.cache.getPeriodicNote(granularity, date);
  }

  public getPeriodicNotes(
    granularity: Granularity,
    date: Moment,
    includeFinerGranularities = false
  ): PeriodicNoteCachedMetadata[] {
    return this.cache.getPeriodicNotes(granularity, date, includeFinerGranularities);
  }

  public isPeriodic(filePath: string, granularity?: Granularity): boolean {
    return this.cache.isPeriodic(filePath, granularity);
  }

  public findAdjacent(
    filePath: string,
    direction: "forwards" | "backwards"
  ): PeriodicNoteCachedMetadata | null {
    return this.cache.findAdjacent(filePath, direction);
  }

  public findInCache(filePath: string): PeriodicNoteCachedMetadata | null {
    return this.cache.find(filePath);
  }

  public async openPeriodicNote(
    granularity: Granularity,
    date: Moment,
    opts?: IOpenOpts
  ): Promise<void> {
    const { inNewSplit = false } = opts ?? {};
    const { workspace } = this.app;
    let file = this.cache.getPeriodicNote(granularity, date);
    if (!file) {
      file = await this.createPeriodicNote(granularity, date);
    }

    const leaf = inNewSplit ? workspace.getLeaf("split") : workspace.getLeaf(false);
    await leaf.openFile(file, { active: true });
  }

  public getActiveGranularities(): Granularity[] {
    const s = get(this.settings);
    return granularities.filter((g) => s[g]?.enabled);
  }

  public getActiveConfig(granularity: Granularity): PeriodicConfig {
    return configFor(get(this.settings), granularity);
  }

  public getFormat(granularity: Granularity): string {
    return configFor(get(this.settings), granularity).format;
  }
}
