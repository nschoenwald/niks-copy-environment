import DataHelper, { MODULE_STATUS } from '../data-helper.js';
import Core from '../core.js';
import SettingsAppBase from './base-app.js';

export default class SettingsExportApp extends SettingsAppBase {
  constructor(options = {}) {
    super(options);
    this.scanData = DataHelper.scanExportData();
  }

  static DEFAULT_OPTIONS = {
    id: 'niks-copy-environment-export',
    window: {
      title: 'niks-copy-environment.export.title',
      icon: 'fa-solid fa-file-export',
    },
    position: {
      width: 820,
      height: 700,
    },
    actions: {
      exportData: SettingsExportApp.#onExportData,
    },
  };

  static PARTS = {
    form: {
      template: 'modules/niks-copy-environment/templates/export-dialog.hbs',
    },
  };

  static PLAYER_CHECKBOX = '.player-checkbox';

  static SUMMARY_KEY = 'niks-copy-environment.export.summaryCount';

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const counts = {
      total: 0,
      active: 0,
      inactive: 0,
      orphaned: 0,
      system: 0,
    };

    for (const g of this.scanData.groups) {
      const n = g.settings.length;
      counts.total += n;
      if (g.type === MODULE_STATUS.ACTIVE) counts.active += n;
      else if (g.type === MODULE_STATUS.INACTIVE) counts.inactive += n;
      else if (g.type === MODULE_STATUS.ORPHANED) counts.orphaned += n;
      else if (g.type === MODULE_STATUS.CORE || g.type === MODULE_STATUS.SYSTEM) counts.system += n;
    }

    return Object.assign(context, {
      groups: this.scanData.groups,
      players: this.scanData.players,
      compendiumFoldersCount: this.scanData.compendiumFoldersCount,
      counts,
    });
  }

  static #onExportData(event, target) {
    const selectedKeys = new Set();
    for (const cb of this.element.querySelectorAll('.setting-checkbox:checked')) {
      if (cb.dataset.key) selectedKeys.add(cb.dataset.key);
    }

    const selectedPlayerIds = new Set();
    for (const cb of this.element.querySelectorAll('.player-checkbox:checked')) {
      if (cb.dataset.id) selectedPlayerIds.add(cb.dataset.id);
    }

    const includeCompendiumFolders = this.element.querySelector('.include-compendium-folders')?.checked ?? true;

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
      Core.download(payload, filename);

      ui.notifications.info(game.i18n.format('niks-copy-environment.export.success', { filename }));
      this.close();
    } catch (e) {
      console.error('Copy Environment | Export failed:', e);
      ui.notifications.error(game.i18n.localize('niks-copy-environment.export.failed'));
    }
  }
}
