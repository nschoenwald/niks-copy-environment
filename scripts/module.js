import { name } from './config.js';
import Core from './core.js';
import DataHelper from './data-helper.js';
import SettingsExportApp from './apps/export-app.js';
import SettingsImportApp from './apps/import-app.js';

Hooks.once('init', function () {
  // Expose module API
  globalThis.NiksCopyEnvironment = {
    Core,
    DataHelper,
    SettingsExportApp,
    SettingsImportApp,
  };

  game.settings.register(name, 'selected-properties', {
    scope: 'client',
    config: false,
    type: Object,
    default: {
      'core.time': false,
      'pf2e.worldClock.worldCreatedOn': false,
      'dnd5e.systemMigrationVersion': false,
      'dnd5e.firstRun': false,
    },
  });

  game.settings.register(name, 'diff-length', {
    scope: 'world',
    config: true,
    type: Number,
    default: 500,
    name: 'niks-copy-environment.settings.max-diff',
    hint: 'niks-copy-environment.settings.max-diff-hint',
    requiresReload: false,
  });
});

Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag(name);
});

function openExportApp() {
  new SettingsExportApp().render({ force: true });
}

function openImportFilePicker() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.addEventListener('change', async function () {
    const file = this.files?.[0];
    if (!file) return;
    try {
      const content = await foundry.utils.readTextFromFile(file);
      const data = JSON.parse(content);
      new SettingsImportApp(data).render({ force: true });
    } catch (e) {
      console.error('Copy Environment | Could not parse import file:', e);
      ui.notifications.error(game.i18n.localize('niks-copy-environment.import.invalidFileError'));
    }
  });
  input.click();
}

Hooks.on('renderSettings', function (app, html, data) {
  // In V14, the Settings sidebar is an ApplicationV2 and `html` is a native HTMLElement.
  const container = html instanceof HTMLElement ? html : html[0] ?? html;

  // Prevent duplicate ContextMenu attachments on re-renders of the Settings tab
  if (container._copyEnvironmentContextMenu) return;
  container._copyEnvironmentContextMenu = true;

  const ContextMenuCls = foundry.applications?.ux?.ContextMenu?.implementation ?? globalThis.ContextMenu;

  const menuItems = [
    {
      name: game.i18n.localize('niks-copy-environment.menu.copy'),
      label: game.i18n.localize('niks-copy-environment.menu.copy'),
      icon: 'far fa-copy',
      callback: () => {
        try {
          Core.copyAsText();
        } catch (e) {
          console.error('Copy Environment | Error copying to clipboard:', e);
        }
      },
      onClick: () => {
        try {
          Core.copyAsText();
        } catch (e) {
          console.error('Copy Environment | Error copying to clipboard:', e);
        }
      },
    },
    {
      name: game.i18n.localize('niks-copy-environment.menu.save'),
      label: game.i18n.localize('niks-copy-environment.menu.save'),
      icon: 'fas fa-copy',
      callback: () => {
        try {
          Core.saveSummaryAsJSON();
        } catch (e) {
          console.error('Copy Environment | Error saving summary JSON:', e);
        }
      },
      onClick: () => {
        try {
          Core.saveSummaryAsJSON();
        } catch (e) {
          console.error('Copy Environment | Error saving summary JSON:', e);
        }
      },
    },
    {
      name: game.i18n.localize('niks-copy-environment.menu.export'),
      label: game.i18n.localize('niks-copy-environment.menu.export'),
      icon: 'fas fa-file-export',
      callback: () => openExportApp(),
      onClick: () => openExportApp(),
    },
    {
      name: game.i18n.localize('niks-copy-environment.menu.import'),
      label: game.i18n.localize('niks-copy-environment.menu.import'),
      icon: 'fas fa-file-import',
      callback: () => openImportFilePicker(),
      onClick: () => openImportFilePicker(),
    },
  ];

  new ContextMenuCls(container, 'section.info, section.general-information, [data-setting-id]', menuItems, {
    jQuery: false,
  });
});
