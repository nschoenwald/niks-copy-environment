import { MODULE_STATUS } from '../data-helper.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Shared behavior of the export and import dialogs: search, status filters, bulk selection and group toggles.
 */
export default class SettingsAppBase extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.currentFilter = 'all';
    this.searchQuery = '';
  }

  static DEFAULT_OPTIONS = {
    classes: ['niks-copy-environment-app'],
    tag: 'form',
    window: {
      resizable: true,
    },
    actions: {
      toggleAll: SettingsAppBase.#onToggleAll,
      toggleActiveOnly: SettingsAppBase.#onToggleActiveOnly,
      deselectAll: SettingsAppBase.#onDeselectAll,
      toggleGroup: SettingsAppBase.#onToggleGroup,
      toggleAccordion: SettingsAppBase.#onToggleAccordion,
      filterStatus: SettingsAppBase.#onFilterStatus,
    },
  };

  /**
   * CSS selector of the per-player checkboxes in this dialog.
   * @type {string}
   */
  static PLAYER_CHECKBOX = '.player-checkbox';

  /**
   * Localization key of the selection summary, formatted with {settings, totalSettings, players}.
   * @type {string}
   */
  static SUMMARY_KEY = '';

  /**
   * Selector matching every selectable checkbox, excluding unrelated options such as footer settings.
   * @type {string}
   */
  get selectableCheckboxes() {
    return `.setting-checkbox, ${this.constructor.PLAYER_CHECKBOX}, .group-toggle`;
  }

  /**
   * Render a fresh instance, closing any other instance with the same id so it doesn't become orphaned.
   * @param {...*} args  Constructor arguments
   * @returns {Promise<SettingsAppBase>}
   */
  static async open(...args) {
    await foundry.applications.instances.get(this.DEFAULT_OPTIONS.id)?.close();
    return new this(...args).render({ force: true });
  }

  /** @override */
  async _prepareContext(options) {
    return { currentFilter: this.currentFilter };
  }

  /** @override */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    // The application element persists across re-renders, so delegated listeners are bound only once.
    this.element.addEventListener('change', (event) => {
      if (event.target.matches('input[type=checkbox]')) this._updateSelectionState();
    });
    this.element.addEventListener('input', (event) => {
      if (!event.target.matches('.search-input')) return;
      this.searchQuery = event.target.value.toLowerCase().trim();
      this._applyFilters();
    });
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const searchInput = this.element.querySelector('.search-input');
    if (searchInput) searchInput.value = this.searchQuery;
    this._applyFilters();
    this._updateSelectionState();
  }

  /**
   * Does a module card match the given status filter?
   * @param {HTMLElement} card
   * @param {string} filter
   * @returns {boolean}
   */
  _matchesStatus(card, filter) {
    const type = card.dataset.type;
    switch (filter) {
      case 'all':
        return true;
      case 'changed':
        return card.dataset.hasChanges === 'true';
      case 'system':
        return type === MODULE_STATUS.CORE || type === MODULE_STATUS.SYSTEM;
      default:
        return type === filter;
    }
  }

  _applyFilters() {
    const query = this.searchQuery;
    const changedOnly = this.currentFilter === 'changed';

    for (const card of this.element.querySelectorAll('.module-card')) {
      const matchesStatus = this._matchesStatus(card, this.currentFilter);
      const matchesGroup = !query
        || (card.dataset.title?.toLowerCase() ?? '').includes(query)
        || (card.dataset.id?.toLowerCase() ?? '').includes(query);

      let visibleRows = 0;
      for (const row of card.querySelectorAll('.setting-row')) {
        const matchesRow = matchesGroup
          || (row.dataset.key?.toLowerCase() ?? '').includes(query)
          || (row.dataset.name?.toLowerCase() ?? '').includes(query);
        const hiddenByFilter = changedOnly && row.dataset.changed === 'false';
        row.classList.toggle('hidden-by-search', !matchesRow);
        row.classList.toggle('hidden-by-filter', hiddenByFilter);
        if (matchesRow && !hiddenByFilter) visibleRows++;
      }

      card.classList.toggle('hidden-by-filter', !matchesStatus || visibleRows === 0);
    }

    const playerCard = this.element.querySelector('.players-card');
    if (playerCard) {
      const matchesFilter = ['all', 'players', 'changed'].includes(this.currentFilter);
      const matchesSearch = !query || playerCard.textContent.toLowerCase().includes(query);
      playerCard.classList.toggle('hidden-by-filter', !matchesFilter || !matchesSearch);
    }
  }

  /**
   * Refresh the selection summary and the checked / indeterminate state of the group toggles.
   */
  _updateSelectionState() {
    const playerSelector = this.constructor.PLAYER_CHECKBOX;
    const countEl = this.element.querySelector('.selection-summary');
    if (countEl) {
      countEl.textContent = game.i18n.format(this.constructor.SUMMARY_KEY, {
        settings: this.element.querySelectorAll('.setting-checkbox:checked').length,
        totalSettings: this.element.querySelectorAll('.setting-checkbox').length,
        players: this.element.querySelectorAll(`${playerSelector}:checked`).length,
      });
    }

    for (const card of this.element.querySelectorAll('.module-card, .players-card')) {
      const groupToggle = card.querySelector('.group-toggle');
      if (!groupToggle) continue;
      const boxes = card.querySelectorAll(`.setting-checkbox, ${playerSelector}`);
      const checked = Array.from(boxes).filter((cb) => cb.checked).length;
      groupToggle.checked = boxes.length > 0 && checked === boxes.length;
      groupToggle.indeterminate = checked > 0 && checked < boxes.length;
    }
  }

  static #onToggleAccordion(event, target) {
    const card = target.closest('.module-card, .players-card');
    const content = card?.querySelector('.module-settings-list, .players-list');
    if (!content) return;
    const collapsed = content.classList.toggle('collapsed');
    const icon = card.querySelector('.collapse-toggle i');
    icon?.classList.toggle('fa-chevron-down', !collapsed);
    icon?.classList.toggle('fa-chevron-right', collapsed);
  }

  static #onToggleGroup(event, target) {
    const card = target.closest('.module-card, .players-card');
    if (card) {
      for (const cb of card.querySelectorAll(`.setting-checkbox, ${this.constructor.PLAYER_CHECKBOX}`)) {
        cb.checked = target.checked;
      }
    }
    this._updateSelectionState();
  }

  static #onToggleAll(event, target) {
    for (const cb of this.element.querySelectorAll(this.selectableCheckboxes)) {
      cb.checked = true;
    }
    this._updateSelectionState();
  }

  static #onToggleActiveOnly(event, target) {
    for (const card of this.element.querySelectorAll('.module-card')) {
      const type = card.dataset.type;
      const isAllowed = type === MODULE_STATUS.ACTIVE || type === MODULE_STATUS.CORE || type === MODULE_STATUS.SYSTEM;
      for (const cb of card.querySelectorAll('.setting-checkbox')) {
        cb.checked = isAllowed;
      }
    }
    this._updateSelectionState();
  }

  static #onDeselectAll(event, target) {
    for (const cb of this.element.querySelectorAll(this.selectableCheckboxes)) {
      cb.checked = false;
    }
    this._updateSelectionState();
  }

  static #onFilterStatus(event, target) {
    const filter = target.dataset.filter || 'all';
    this.currentFilter = filter;
    for (const btn of this.element.querySelectorAll('.filter-pill')) {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    }
    this._applyFilters();
  }
}
