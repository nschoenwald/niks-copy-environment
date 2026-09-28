import { name as moduleName, log } from '../config.js';
import DataHelper, { MODULE_STATUS } from '../data-helper.js';
import Core from '../core.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class SettingsExportApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.scanData = DataHelper.scanExportData();
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.collapsedGroups = new Set();
  }

  static DEFAULT_OPTIONS = {
    id: 'niks-copy-environment-export',
    classes: ['niks-copy-environment-app'],
    tag: 'form',
    window: {
      title: 'niks-copy-environment.export.title',
      icon: 'fa-solid fa-file-export',
      resizable: true,
    },
    position: {
      width: 820,
      height: 700,
    },
    actions: {
      toggleAll: SettingsExportApp.#onToggleAll,
      toggleActiveOnly: SettingsExportApp.#onToggleActiveOnly,
      deselectAll: SettingsExportApp.#onDeselectAll,
      toggleGroup: SettingsExportApp.#onToggleGroup,
      toggleAccordion: SettingsExportApp.#onToggleAccordion,
      filterStatus: SettingsExportApp.#onFilterStatus,
      exportData: SettingsExportApp.#onExportData,
      close: SettingsExportApp.#onClose,
    },
  };

  static PARTS = {
    form: {
      template: 'modules/niks-copy-environment/templates/export-dialog.hbs',
    },
  };

  /** @override */
  async _prepareContext(options) {
    const counts = {
      total: 0,
      active: 0,
      inactive: 0,
      orphaned: 0,
      system: 0,
    };

    for (const g of this.scanData.groups) {
      counts.total += g.settings.length;
      if (g.type === MODULE_STATUS.ACTIVE) counts.active += g.settings.length;
      else if (g.type === MODULE_STATUS.INACTIVE) counts.inactive += g.settings.length;
      else if (g.type === MODULE_STATUS.ORPHANED) counts.orphaned += g.settings.length;
      else if (g.type === MODULE_STATUS.CORE || g.type === MODULE_STATUS.SYSTEM) counts.system += g.settings.length;
    }

    return {
      groups: this.scanData.groups,
      players: this.scanData.players,
      compendiumFoldersCount: this.scanData.compendiumFoldersCount,
      counts,
      currentFilter: this.currentFilter,
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

    // Apply any initial filters
    this._applyFilters();
    this._updateOverallCounts();
  }

  _applyFilters() {
    const groupCards = this.element.querySelectorAll('.module-card');
    const playerCard = this.element.querySelector('.players-card');

    for (const card of groupCards) {
      const type = card.dataset.type;
      const title = card.dataset.title?.toLowerCase() || '';
      const id = card.dataset.id?.toLowerCase() || '';

      const matchesStatus =
        this.currentFilter === 'all' ||
        (this.currentFilter === 'active' && type === MODULE_STATUS.ACTIVE) ||
        (this.currentFilter === 'inactive' && type === MODULE_STATUS.INACTIVE) ||
        (this.currentFilter === 'orphaned' && type === MODULE_STATUS.ORPHANED) ||
        (this.currentFilter === 'system' && (type === MODULE_STATUS.CORE || type === MODULE_STATUS.SYSTEM));

      let matchesSearch = true;
      if (this.searchQuery) {
        const matchesGroup = title.includes(this.searchQuery) || id.includes(this.searchQuery);
        let matchingSettingsCount = 0;

        const settingRows = card.querySelectorAll('.setting-row');
        for (const row of settingRows) {
          const key = row.dataset.key?.toLowerCase() || '';
          const name = row.dataset.name?.toLowerCase() || '';
          const match = matchesGroup || key.includes(this.searchQuery) || name.includes(this.searchQuery);
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
      const matchesFilter = this.currentFilter === 'all' || this.currentFilter === 'players';
      const matchesSearch = !this.searchQuery || playerCard.textContent.toLowerCase().includes(this.searchQuery);
      playerCard.classList.toggle('hidden-by-filter', !matchesFilter || !matchesSearch);
    }
  }

  _updateOverallCounts() {
    const selectedSettings = this.element.querySelectorAll('.setting-checkbox:checked').length;
    const totalSettings = this.element.querySelectorAll('.setting-checkbox').length;
    const selectedPlayers = this.element.querySelectorAll('.player-checkbox:checked').length;

    const countEl = this.element.querySelector('.selection-summary');
    if (countEl) {
      countEl.textContent = game.i18n.format('niks-copy-environment.export.summaryCount', {
        settings: selectedSettings,
        totalSettings,
        players: selectedPlayers,
      });
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
    this._updateOverallCounts();
  }

  static #onToggleAll(event, target) {
    const checkboxes = this.element.querySelectorAll('.setting-checkbox, .player-checkbox, .group-toggle');
    for (const cb of checkboxes) {
      cb.checked = true;
    }
    this._updateOverallCounts();
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
    this._updateOverallCounts();
  }

  static #onDeselectAll(event, target) {
    const checkboxes = this.element.querySelectorAll('input[type=checkbox]');
    for (const cb of checkboxes) {
      cb.checked = false;
    }
    this._updateOverallCounts();
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

  static #onExportData(event, target) {
    const selectedKeys = new Set();
    const settingCheckboxes = this.element.querySelectorAll('.setting-checkbox:checked');
    for (const cb of settingCheckboxes) {
      if (cb.dataset.key) selectedKeys.add(cb.dataset.key);
    }

    const selectedPlayerIds = new Set();
    const playerCheckboxes = this.element.querySelectorAll('.player-checkbox:checked');
    for (const cb of playerCheckboxes) {
      if (cb.dataset.id) selectedPlayerIds.add(cb.dataset.id);
    }

    const includeCompendiumFolders = this.element.querySelector('#include-compendium-folders')?.checked ?? true;

    if (selectedKeys.size === 0 && selectedPlayerIds.size === 0) {
      ui.notifications.warn(game.i18n.localize('niks-copy-environment.export.nothingSelected'));
      return;
    }

    try {
      const payload = DataHelper.buildExportPayload({
        selectedKeys,
        selectedPlayerIds,
        includeCompendiumFolders,
      });

      const filename = Core.getFilename('foundry-settings-export');
      foundry.utils.saveDataToFile(JSON.stringify(payload, null, 2), 'application/json', filename);

      ui.notifications.info(game.i18n.format('niks-copy-environment.export.success', { filename }));
      this.close();
    } catch (e) {
      console.error('Copy Environment | Export failed:', e);
      ui.notifications.error(game.i18n.localize('niks-copy-environment.export.failed'));
    }
  }
}
