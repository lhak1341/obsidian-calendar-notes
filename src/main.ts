import type { Moment } from "moment";
import { addIcon, Plugin, TFile } from "obsidian";
import { get, writable, type Writable } from "svelte/store";

import { PeriodicNotesCache } from "./cache";
import CalendarSetManager, {
  isLegacySettings,
  migrateDailyNoteSettings,
  migrateLegacySettingsToCalendarSet,
} from "./calendarSetManager";
import { displayConfigs, getCommands } from "./commands";
import { DEFAULT_CALENDARSET_ID } from "./constants";
import {
  calendarDayIcon,
  calendarMonthIcon,
  calendarWeekIcon,
  calendarQuarterIcon,
  calendarYearIcon,
} from "./icons";
import { showFileMenu } from "./modal";
import {
  type ISettings,
  PeriodicNotesSettingsTab,
  DEFAULT_SETTINGS,
  DEFAULT_PERIODIC_CONFIG,
} from "./settings";
import { initializeLocaleConfigOnce } from "./settings/localization";
import {
  createNewCalendarSet,
  findStartupNoteConfig,
  hasLegacyDailyNoteSettings,
  setActiveSet,
} from "./settings/utils";
import { CalendarSetSuggestModal } from "./switcher/calendarSetSwitcher";
import { NLDNavigator } from "./switcher/switcher";
import TimelineManager from "./timeline/manager";
import { granularities, type CalendarSet, type Granularity, type IOpenOpts, type IPeriodicNoteController, type PeriodicConfig, type PeriodicNoteCachedMetadata } from "./types";
import {
  applyTemplateTransformations,
  getNoteCreationPath,
  getTemplateContents,
  isMetaPressed,
} from "./utils";

// obsidian-daily-notes-interface reads plugin.settings.daily/weekly/etc. as plain objects.
// Extend Writable with those legacy keys so the type system accepts the compat shim.
type LegacyConfig = PeriodicConfig & { template?: string };
type SettingsStore = Writable<ISettings> & {
  daily?: LegacyConfig;
  weekly?: LegacyConfig;
  monthly?: LegacyConfig;
  quarterly?: LegacyConfig;
  yearly?: LegacyConfig;
};

export default class PeriodicNotesPlugin extends Plugin implements IPeriodicNoteController {
  public settings!: SettingsStore;
  private ribbonEl: HTMLElement | null = null;

  private cache!: PeriodicNotesCache;
  public calendarSetManager!: CalendarSetManager;
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

    this.settings = writable<ISettings>() as SettingsStore;
    this.addLegacySettingsCompat();
    await this.loadSettings();
    this.register(this.settings.subscribe(this.onUpdateSettings.bind(this)));

    initializeLocaleConfigOnce(this.app);

    this.ribbonEl = null;
    this.calendarSetManager = new CalendarSetManager(this.settings);
    this.cache = new PeriodicNotesCache(this.app, this.calendarSetManager);
    this.timelineManager = new TimelineManager(this.app, this, this.cache, this);

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
          return !!this.app.workspace.activeLeaf;
        }
        new NLDNavigator(this.app, this).open();
      },
    });

    this.addCommand({
      id: "switch-calendarset",
      name: "Switch active calendar set...",
      callback: () => {
        new CalendarSetSuggestModal(this.app, this).open();
      },
    });

    this.app.workspace.onLayoutReady(() => {
      const startupNoteConfig = findStartupNoteConfig(this.settings);
      if (startupNoteConfig) {
        this.openPeriodicNote(startupNoteConfig.granularity, window.moment(), {
          calendarSet: startupNoteConfig.calendarSet,
        });
      }
    });
  }

  private addLegacySettingsCompat(): void {
    // obsidian-daily-notes-interface reads plugin.settings.daily/weekly/monthly/quarterly/yearly
    // as plain objects. Our settings use CalendarSet keys (day/week/month/quarter/year) so we
    // add getters that map from the legacy names to the active calendar set's config.
    const keyMap: Array<[string, Granularity]> = [
      ["daily", "day"],
      ["weekly", "week"],
      ["monthly", "month"],
      ["quarterly", "quarter"],
      ["yearly", "year"],
    ];
    for (const [legacyKey, granularity] of keyMap) {
      Object.defineProperty(this.settings, legacyKey, {
        get: (): LegacyConfig | undefined => {
          const s = get(this.settings);
          const activeSet = s?.calendarSets?.find((cs) => cs.id === s.activeCalendarSet);
          const config = activeSet?.[granularity];
          return config ? { ...config, template: config.templatePath } : undefined;
        },
        enumerable: false,
        configurable: true,
      });
    }
  }

  private configureRibbonIcons() {
    this.ribbonEl?.detach();

    const configuredGranularities = this.calendarSetManager.getActiveGranularities();
    if (configuredGranularities.length) {
      const granularity = configuredGranularities[0];
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
    // Remove disabled commands
    const activeSet = this.calendarSetManager.getActiveSet();
    granularities
      .filter((granularity) => !activeSet[granularity]?.enabled)
      .forEach((granularity: Granularity) => {
        getCommands(this.app, this, granularity).forEach((command) =>
          this.app.commands.removeCommand(`periodic-notes:${command.id}`)
        );
      });

    // register enabled commands
    this.calendarSetManager
      .getActiveGranularities()
      .forEach((granularity: Granularity) => {
        getCommands(this.app, this, granularity).forEach(this.addCommand.bind(this));
      });
  }

  async loadSettings(): Promise<void> {
    const savedSettings = await this.loadData();
    const settings = Object.assign({}, DEFAULT_SETTINGS, savedSettings || {});
    this.settings.set(settings);

    if (!settings.calendarSets || settings.calendarSets.length === 0) {
      // check for migration
      if (isLegacySettings(settings)) {
        this.settings.update(
          createNewCalendarSet(
            DEFAULT_CALENDARSET_ID,
            migrateLegacySettingsToCalendarSet(settings)
          )
        );
      } else if (hasLegacyDailyNoteSettings(this.app)) {
        this.settings.update(
          createNewCalendarSet(DEFAULT_CALENDARSET_ID, migrateDailyNoteSettings(settings))
        );
      } else {
        // otherwise create new default calendar set
        this.settings.update(
          createNewCalendarSet(DEFAULT_CALENDARSET_ID, {
            day: {
              ...DEFAULT_PERIODIC_CONFIG,
              enabled: true,
            },
          })
        );
      }
      this.settings.update(setActiveSet(DEFAULT_CALENDARSET_ID));
    }
  }

  private async onUpdateSettings(newSettings: ISettings): Promise<void> {
    await this.saveData(newSettings);
    this.configureCommands();
    this.configureRibbonIcons();

    // Integrations (i.e. Calendar Plugin) can listen for changes to settings
    this.app.workspace.trigger("periodic-notes:settings-updated");
  }

  public async createPeriodicNote(
    granularity: Granularity,
    date: Moment
  ): Promise<TFile> {
    const config = this.calendarSetManager.getActiveConfig(granularity);
    const format = this.calendarSetManager.getFormat(granularity);
    const filename = date.format(format);
    const templateContents = await getTemplateContents(this.app, config.templatePath);
    const renderedContents = applyTemplateTransformations(
      filename,
      granularity,
      date,
      format,
      templateContents
    );
    const destPath = await getNoteCreationPath(this.app, filename, config);
    return this.app.vault.create(destPath, renderedContents);
  }

  public getPeriodicNote(granularity: Granularity, date: Moment): TFile | null {
    return this.cache.getPeriodicNote(
      this.calendarSetManager.getActiveId(),
      granularity,
      date
    );
  }

  // TODO: What API do I want for this?
  public getPeriodicNotes(
    granularity: Granularity,
    date: Moment,
    includeFinerGranularities = false
  ): PeriodicNoteCachedMetadata[] {
    return this.cache.getPeriodicNotes(
      this.calendarSetManager.getActiveId(),
      granularity,
      date,
      includeFinerGranularities
    );
  }

  public isPeriodic(filePath: string, granularity?: Granularity): boolean {
    return this.cache.isPeriodic(filePath, granularity);
  }

  public findAdjacent(
    calendarSet: string,
    filePath: string,
    direction: "forwards" | "backwards"
  ): PeriodicNoteCachedMetadata | null {
    return this.cache.findAdjacent(calendarSet, filePath, direction);
  }

  public findInCache(filePath: string): PeriodicNoteCachedMetadata | null {
    return this.cache.find(filePath);
  }

  public async openPeriodicNote(
    granularity: Granularity,
    date: Moment,
    opts?: IOpenOpts
  ): Promise<void> {
    const { inNewSplit = false, calendarSet } = opts ?? {};
    const { workspace } = this.app;
    let file = this.cache.getPeriodicNote(
      calendarSet ?? this.calendarSetManager.getActiveId(),
      granularity,
      date
    );
    if (!file) {
      file = await this.createPeriodicNote(granularity, date);
    }

    const leaf = inNewSplit ? workspace.getLeaf("split") : workspace.getLeaf(false);
    await leaf.openFile(file, { active: true });
  }

  public getActiveId(): string {
    return this.calendarSetManager.getActiveId();
  }

  public getActiveGranularities(): Granularity[] {
    return this.calendarSetManager.getActiveGranularities();
  }

  public getActiveConfig(granularity: Granularity): PeriodicConfig {
    return this.calendarSetManager.getActiveConfig(granularity);
  }

  public getActiveSet(): CalendarSet {
    return this.calendarSetManager.getActiveSet();
  }

  public getCalendarSets(): CalendarSet[] {
    return this.calendarSetManager.getCalendarSets();
  }

  public getFormat(granularity: Granularity): string {
    return this.calendarSetManager.getFormat(granularity);
  }

  public setActiveSet(id: string): void {
    this.calendarSetManager.setActiveSet(id);
  }
}
