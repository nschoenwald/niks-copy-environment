import { name as moduleName, log } from '../config.js';
import DataHelper, { MODULE_STATUS } from '../data-helper.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class SettingsImportApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(rawData, options = {}) {
    super(options);
    this.rawData = rawData;
    this.analysis = DataHelper.analyzeImportData(rawData);
    this.currentFilter = 'all';
    this.searchQuery = '';
  }

  static DEFAULT_OPTIONS = {
    id: 'niks-copy-environment-import',
    classes: ['niks-copy-environment-app'],
    tag: 'form',
    window: {
      title: 'niks-copy-environment.import.title',
      icon: 'fa-solid fa-file-import',
      resizable: true,
    },
    position: {
      width: 860,
      height: 720,
    },
    actions: {
      toggleAll: SettingsImportApp.#onToggleAll,
      toggleActiveOnly: SettingsImportApp.#onToggleActiveOnly,
      deselectAll: SettingsImportApp.#onDeselectAll,
      toggleGroup: SettingsImportApp.#onToggleGroup,
      toggleAccordion: SettingsImportApp.#onToggleAccordion,
      filterStatus: SettingsImportApp.#onFilterStatus,
      applyImport: SettingsImportApp.#onApplyImport,
      close: SettingsImportApp.#onClose,
    },
  };

  static PARTS = {
    form: {
      template: 'modules/niks-copy-environment/templates/import-dialog.hbs',
    },
  };

  /** @override */
  async _prepareContext(options) {
    const counts = {
      total: 0,
      changed: 0,
      active: 0,
      inactive: 0,
      missing: 0,
      system: 0,
    };

    for (const g of this.analysis.groups) {
      counts.total += g.settings.length;
      counts.changed += g.settings.filter((s) => s.isChanged).length;
      if (g.type === MODULE_STATUS.ACTIVE) counts.active += g.settings.length;
      else if (g.type === MODULE_STATUS.INACTIVE) counts.inactive += g.settings.length;
      else if (g.type === MODULE_STATUS.MISSING) counts.missing += g.settings.length;
      else if (g.type === MODULE_STATUS.CORE || g.type === MODULE_STATUS.SYSTEM) counts.system += g.settings.length;
    }

    // Check if core.moduleConfiguration is present and what its selected state is
    const moduleConfigSetting = this.analysis.groups
      .find((g) => g.id === 'core')
      ?.settings?.find((s) => s.key === 'core.moduleConfiguration');

    return {
      metadata: this.analysis.metadata,
      groups: this.analysis.groups,
      players: this.analysis.players,
      notFoundPlayers: this.analysis.notFoundPlayers,
      notChangedPlayers: this.analysis.notChangedPlayers,
      counts,
      currentFilter: this.currentFilter,
      hasModuleConfigSetting: Boolean(moduleConfigSetting),
      hasMissingModules: counts.missing > 0,
    };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    // Bind real-time search input
    const searchInput = this.element.querySelector('.search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this._applyFilters();
      });
    }

    // Bind checkbox changes to update warning banners and counts
    this.element.addEventListener('change', (e) => {
      if (e.target.matches('input[type=checkbox]')) {
        this._updateSelectionState();
      }
    });

    this._applyFilters();
    this._updateSelectionState();
  }

  _applyFilters() {
    const groupCards = this.element.querySelectorAll('.module-card');
    const playerCard = this.element.querySelector('.players-card');

    for (const card of groupCards) {
      const type = card.dataset.type;
      const title = card.dataset.title?.toLowerCase() || '';
      const id = card.dataset.id?.toLowerCase() || '';
      const hasChanges = card.dataset.hasChanges === 'true';

      const matchesStatus =
        this.currentFilter === 'all' ||
        (this.currentFilter === 'changed' && hasChanges) ||
        (this.currentFilter === 'active' && type === MODULE_STATUS.ACTIVE) ||
        (this.currentFilter === 'inactive' && type === MODULE_STATUS.INACTIVE) ||
        (this.currentFilter === 'missing' && type === MODULE_STATUS.MISSING) ||
        (this.currentFilter === 'system' && (type === MODULE_STATUS.CORE || type === MODULE_STATUS.SYSTEM));

      let matchesSearch = true;
      if (this.searchQuery) {
        const matchesGroup = title.includes(this.searchQuery) || id.includes(this.searchQuery);
        let matchingSettingsCount = 0;

        const settingRows = card.querySelectorAll('.setting-row');
        for (const row of settingRows) {
          const key = row.dataset.key?.toLowerCase() || '';
          const match = matchesGroup || key.includes(this.searchQuery);
          row.classList.toggle('hidden-by-search', !match);
          if (match) matchingSettingsCount++;
        }
        matchesSearch = matchesGroup || matchingSettingsCount > 0;
      } else {
        card.querySelectorAll('.setting-row').forEach((r) => r.classList.remove('hidden-by-search'));
      }

      card.classList.toggle('hidden-by-filter', !matchesStatus || !matchesSearch);
    }

    if (playerCard) {
      const matchesFilter = this.currentFilter === 'all' || this.currentFilter === 'players' || this.currentFilter === 'changed';
      const matchesSearch = !this.searchQuery || playerCard.textContent.toLowerCase().includes(this.searchQuery);
      playerCard.classList.toggle('hidden-by-filter', !matchesFilter || !matchesSearch);
    }
  }

  _updateSelectionState() {
    const selectedSettings = this.element.querySelectorAll('.setting-checkbox:checked').length;
    const totalSettings = this.element.querySelectorAll('.setting-checkbox').length;
    const selectedPlayerFields = this.element.querySelectorAll('.player-field-checkbox:checked').length;

    const countEl = this.element.querySelector('.selection-summary');
    if (countEl) {
      countEl.textContent = game.i18n.format('niks-copy-environment.import.summaryCount', {
        settings: selectedSettings,
        totalSettings,
        players: selectedPlayerFields,
      });
    }

    // Core module config warning
    const moduleConfigCb = this.element.querySelector('input[data-key="core.moduleConfiguration"]');
    const moduleWarningEl = this.element.querySelector('.core-module-warning');
    if (moduleWarningEl && moduleConfigCb) {
      moduleWarningEl.classList.toggle('hidden', moduleConfigCb.checked);
    }

    // Missing modules selected warning
    const missingSelected = this.element.querySelectorAll('.module-card[data-type="missing"] .setting-checkbox:checked').length;
    const missingWarningEl = this.element.querySelector('.missing-modules-warning');
    if (missingWarningEl) {
      missingWarningEl.classList.toggle('hidden', missingSelected === 0);
    }
  }

  static #onToggleAccordion(event, target) {
    const card = target.closest('.module-card, .players-card');
    if (card) {
      const content = card.querySelector('.module-settings-list, .players-list');
      const icon = card.querySelector('.collapse-toggle i');
      if (content) {
        content.classList.toggle('collapsed');
        if (icon) {
          icon.classList.toggle('fa-chevron-down', !content.classList.contains('collapsed'));
          icon.classList.toggle('fa-chevron-right', content.classList.contains('collapsed'));
        }
      }
    }
  }

  static #onToggleGroup(event, target) {
    const card = target.closest('.module-card, .players-card');
    if (card) {
      const isChecked = target.checked;
      const checkboxes = card.querySelectorAll('input[type=checkbox]:not(.group-toggle)');
      for (const cb of checkboxes) {
        cb.checked = isChecked;
      }
    }
    this._updateSelectionState();
  }

  static #onToggleAll(event, target) {
    const checkboxes = this.element.querySelectorAll('.setting-checkbox, .player-field-checkbox, .group-toggle');
    for (const cb of checkboxes) {
      cb.checked = true;
    }
    this._updateSelectionState();
  }

  static #onToggleActiveOnly(event, target) {
    const groupCards = this.element.querySelectorAll('.module-card');
    for (const card of groupCards) {
      const type = card.dataset.type;
      const isAllowed = type === MODULE_STATUS.ACTIVE || type === MODULE_STATUS.CORE || type === MODULE_STATUS.SYSTEM;
      const groupToggle = card.querySelector('.group-toggle');
      if (groupToggle) groupToggle.checked = isAllowed;
      const settingCbs = card.querySelectorAll('.setting-checkbox');
      for (const cb of settingCbs) {
        cb.checked = isAllowed;
      }
    }
    this._updateSelectionState();
  }

  static #onDeselectAll(event, target) {
    const checkboxes = this.element.querySelectorAll('input[type=checkbox]');
    for (const cb of checkboxes) {
      cb.checked = false;
    }
    this._updateSelectionState();
  }

  static #onFilterStatus(event, target) {
    const filter = target.dataset.filter || 'all';
    this.currentFilter = filter;
    this.element.querySelectorAll('.filter-pill').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    this._applyFilters();
  }

  static #onClose(event, target) {
    this.close();
  }

  static async #onApplyImport(event, target) {
    // 1. Gather selected settings
    const selectedSettings = [];
    const settingCheckboxes = this.element.querySelectorAll('.setting-checkbox:checked');
    const selectedProperties = game.settings.get(moduleName, 'selected-properties') || {};

    for (const cb of settingCheckboxes) {
      const key = cb.dataset.key;
      const value = cb.dataset.value;
      if (key && value !== undefined) {
        selectedSettings.push({ key, value });
        selectedProperties[key] = true;
      }
    }

    // Also update unselected settings in remembered preferences
    const unselectedCbs = this.element.querySelectorAll('.setting-checkbox:not(:checked)');
    for (const cb of unselectedCbs) {
      if (cb.dataset.key) {
        selectedProperties[cb.dataset.key] = false;
      }
    }
    await game.settings.set(moduleName, 'selected-properties', selectedProperties);

    // 2. Gather selected player changes
    const playerUpdatesMap = new Map();
    const playerFieldCbs = this.element.querySelectorAll('.player-field-checkbox:checked');

    for (const cb of playerFieldCbs) {
      const playerName = cb.dataset.player;
      const type = cb.dataset.type; // 'core' or 'flag'
      const field = cb.dataset.field;
      const rawNewVal = cb.dataset.newval;

      if (!playerUpdatesMap.has(playerName)) {
        playerUpdatesMap.set(playerName, { name: playerName, core: {}, flags: {} });
      }
      const playerRecord = playerUpdatesMap.get(playerName);

      let parsedVal;
      try {
        parsedVal = JSON.parse(rawNewVal);
      } catch {
        parsedVal = rawNewVal;
      }

      if (type === 'core') {
        playerRecord.core[field] = parsedVal;
      } else if (type === 'flag') {
        playerRecord.flags[field] = parsedVal;
      }
    }

    const selectedPlayerChanges = Array.from(playerUpdatesMap.values());

    if (selectedSettings.length === 0 && selectedPlayerChanges.length === 0) {
      ui.notifications.warn(game.i18n.localize('niks-copy-environment.import.nothingSelected'));
      return;
    }

    // Confirm dialog if missing modules are being imported
    const missingSelected = this.element.querySelectorAll('.module-card[data-type="missing"] .setting-checkbox:checked').length;
    if (missingSelected > 0) {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize('niks-copy-environment.badges.missing') },
        content: `<p>${game.i18n.format('niks-copy-environment.import.missingConfirmWarning', { count: missingSelected })}</p>`,
        rejectClose: false,
      });
      if (!confirmed) return;
    }

    try {
      this.close();

      const changed = await DataHelper.applyImport({
        selectedSettings,
        selectedPlayerChanges,
        supportingData: this.analysis.supportingData,
      });

      if (changed) {
        ui.notifications.info(game.i18n.localize('niks-copy-environment.updatedReloading'), { permanent: true });
        window.setTimeout(() => window.location.reload(), 4000);
      } else {
        ui.notifications.info(game.i18n.localize('niks-copy-environment.import.noChangesApplied'));
      }
    } catch (e) {
      console.error('Copy Environment | Import error:', e);
      ui.notifications.error(game.i18n.localize('niks-copy-environment.import.errorOccurred'));
    }
  }
}
