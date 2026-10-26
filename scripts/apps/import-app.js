import { name as moduleName } from '../config.js';
import DataHelper, { MODULE_STATUS } from '../data-helper.js';
import SettingsAppBase from './base-app.js';

export default class SettingsImportApp extends SettingsAppBase {
  constructor(rawData, options = {}) {
    super(options);
    this.analysis = DataHelper.analyzeImportData(rawData);
    this.settingsByKey = new Map(this.analysis.groups.flatMap((g) => g.settings.map((s) => [s.key, s])));
  }

  static DEFAULT_OPTIONS = {
    id: 'niks-copy-environment-import',
    window: {
      title: 'niks-copy-environment.import.title',
      icon: 'fa-solid fa-file-import',
    },
    position: {
      width: 860,
      height: 720,
    },
    actions: {
      applyImport: SettingsImportApp.#onApplyImport,
    },
  };

  static PARTS = {
    form: {
      template: 'modules/niks-copy-environment/templates/import-dialog.hbs',
    },
  };

  static PLAYER_CHECKBOX = '.player-field-checkbox';

  static SUMMARY_KEY = 'niks-copy-environment.import.summaryCount';

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const counts = {
      total: 0,
      changed: 0,
      active: 0,
      inactive: 0,
      missing: 0,
      system: 0,
    };

    for (const g of this.analysis.groups) {
      const n = g.settings.length;
      counts.total += n;
      counts.changed += g.settings.filter((s) => s.isChanged).length;
      if (g.type === MODULE_STATUS.ACTIVE) counts.active += n;
      else if (g.type === MODULE_STATUS.INACTIVE) counts.inactive += n;
      else if (g.type === MODULE_STATUS.MISSING) counts.missing += n;
      else if (g.type === MODULE_STATUS.CORE || g.type === MODULE_STATUS.SYSTEM) counts.system += n;
    }

    return Object.assign(context, {
      groups: this.analysis.groups,
      players: this.analysis.players,
      notFoundPlayers: this.analysis.notFoundPlayers,
      notChangedPlayers: this.analysis.notChangedPlayers,
      counts,
    });
  }

  /** @override */
  _updateSelectionState() {
    super._updateSelectionState();

    // Core module config warning
    const moduleConfigCb = this.element.querySelector('.setting-checkbox[data-key="core.moduleConfiguration"]');
    const moduleWarningEl = this.element.querySelector('.core-module-warning');
    if (moduleWarningEl && moduleConfigCb) {
      moduleWarningEl.classList.toggle('hidden', moduleConfigCb.checked);
    }

    // Missing modules selected warning
    const missingWarningEl = this.element.querySelector('.missing-modules-warning');
    if (missingWarningEl) {
      missingWarningEl.classList.toggle('hidden', this.#countMissingSelected() === 0);
    }
  }

  #countMissingSelected() {
    return this.element.querySelectorAll(`.module-card[data-type="${MODULE_STATUS.MISSING}"] .setting-checkbox:checked`).length;
  }

  static async #onApplyImport(event, target) {
    // 1. Gather selected settings and remember the selection for future imports
    const selectedSettings = [];
    const selectedProperties = game.settings.get(moduleName, 'selected-properties') || {};

    for (const cb of this.element.querySelectorAll('.setting-checkbox')) {
      const setting = this.settingsByKey.get(cb.dataset.key);
      if (!setting) continue;
      selectedProperties[setting.key] = cb.checked;
      if (cb.checked) selectedSettings.push({ key: setting.key, value: setting.value });
    }

    // 2. Gather selected player changes, using the full (untruncated) values from the analysis
    const playersByName = new Map(this.analysis.players.map((p) => [p.name, p]));
    const playerUpdatesMap = new Map();

    for (const cb of this.element.querySelectorAll('.player-field-checkbox:checked')) {
      const { player: playerName, type, field } = cb.dataset;
      const player = playersByName.get(playerName);
      const list = type === 'flag' ? player?.flagDifferences : player?.differences;
      const diff = list?.find((d) => d.field === field);
      if (!diff) continue;

      let record = playerUpdatesMap.get(playerName);
      if (!record) {
        record = { name: playerName, core: {}, flags: {} };
        playerUpdatesMap.set(playerName, record);
      }
      if (type === 'flag') record.flags[field] = diff.newVal;
      else record.core[field] = diff.newVal;
    }

    const selectedPlayerChanges = Array.from(playerUpdatesMap.values());

    if (selectedSettings.length === 0 && selectedPlayerChanges.length === 0) {
      ui.notifications.warn(game.i18n.localize('niks-copy-environment.import.nothingSelected'));
      return;
    }

    // Confirm dialog if missing modules are being imported
    const missingSelected = this.#countMissingSelected();
    if (missingSelected > 0) {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize('niks-copy-environment.badges.missing') },
        content: `<p>${game.i18n.format('niks-copy-environment.import.missingConfirmWarning', { count: missingSelected })}</p>`,
        rejectClose: false,
      });
      if (!confirmed) return;
    }

    await game.settings.set(moduleName, 'selected-properties', selectedProperties);

    try {
      this.close();

      const changed = await DataHelper.applyImport({
        selectedSettings,
        selectedPlayerChanges,
        supportingData: this.analysis.supportingData,
      });

      if (changed) {
        ui.notifications.info(game.i18n.localize('niks-copy-environment.updatedReloading'), { permanent: true });
        window.setTimeout(() => foundry.utils.debouncedReload(), 4000);
      } else {
        ui.notifications.info(game.i18n.localize('niks-copy-environment.import.noChangesApplied'));
      }
    } catch (e) {
      console.error('Copy Environment | Import error:', e);
      ui.notifications.error(game.i18n.localize('niks-copy-environment.import.errorOccurred'));
    }
  }
}
