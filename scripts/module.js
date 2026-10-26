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
    openExport: openExportApp,
    openImport: openImportFilePicker,
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
  return SettingsExportApp.open();
}

function openImportFilePicker() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    let data;
    try {
      data = JSON.parse(await foundry.utils.readTextFromFile(file));
    } catch (e) {
      console.error('Copy Environment | Could not parse import file:', e);
      ui.notifications.error(game.i18n.localize('niks-copy-environment.import.invalidFileError'));
      return;
    }
    try {
      await SettingsImportApp.open(data);
    } catch (e) {
      console.error('Copy Environment | Could not open import dialog:', e);
      ui.notifications.error(game.i18n.localize('niks-copy-environment.import.errorOccurred'));
    }
  });
  input.click();
}

Hooks.on('renderSettings', function (app, html) {
  // The Settings sidebar element persists across re-renders, so only attach the ContextMenu once.
  if (html._copyEnvironmentContextMenu) return;
  html._copyEnvironmentContextMenu = true;

  const menuItems = [
    {
      label: 'niks-copy-environment.menu.copy',
      icon: 'far fa-copy',
      onClick: () => Core.copyAsText(),
    },
    {
      label: 'niks-copy-environment.menu.save',
      icon: 'fas fa-copy',
      onClick: () => {
        try {
          Core.saveSummaryAsJSON();
        } catch (e) {
          console.error('Copy Environment | Error saving summary JSON:', e);
        }
      },
    },
    {
      label: 'niks-copy-environment.menu.export',
      icon: 'fas fa-file-export',
      onClick: () => openExportApp(),
    },
    {
      label: 'niks-copy-environment.menu.import',
      icon: 'fas fa-file-import',
      onClick: () => openImportFilePicker(),
    },
  ];

  new foundry.applications.ux.ContextMenu.implementation(html, 'section.info', menuItems, {
    jQuery: false,
  });
});
