import {name} from './config.js';
import Core from './core.js';

Hooks.once('init', function () {
  game.settings.register(name, 'selected-properties', {
    scope: 'client',
    config: false,
    type: Object,
    default: {
      'core.time': false,
      'pf2e.worldClock.worldCreatedOn': false,
    },
  });

  game.settings.register(name, 'diff-length', {
    scope: 'world',
    config: true,
    type: Number,
    default: 500,
    name: "niks-copy-environment.settings.max-diff",
    hint: "niks-copy-environment.settings.max-diff-hint",
    requiresReload: false,
  });
});

Hooks.once('devModeReady', ({registerPackageDebugFlag}) => {
  registerPackageDebugFlag(name);
});

Hooks.on('renderSettings', function (app, html, data) {
  // In V14, the Settings sidebar is an ApplicationV2 and `html` is a native HTMLElement.
  // Ensure we have an HTMLElement for the ContextMenu container.
  const container = html instanceof HTMLElement ? html : html[0] ?? html;

  new foundry.applications.ux.ContextMenu.implementation(container, 'section.info, section.general-information, [data-setting-id]', [
    {
      name: game.i18n.localize('niks-copy-environment.menu.copy'),
      icon: 'far fa-copy',
      callback: () => {
        try {
          Core.copyAsText();
        } catch (e) {
          console.error('Copy Environment | Error copying game settings to clipboard', e);
        }
      },
    },
    {
      name: game.i18n.localize('niks-copy-environment.menu.save'),
      icon: 'fas fa-copy',
      callback: () => {
        try {
          Core.saveSummaryAsJSON();
        } catch (e) {
          console.error('Copy Environment | Error copying game settings to JSON', e);
        }
      },
    },
    {
      name: game.i18n.localize('niks-copy-environment.menu.export'),
      icon: 'fas fa-file-export',
      callback: () => {
        try {
          Core.exportGameSettings();
        } catch (e) {
          console.error('Copy Environment | Error exporting game settings', e);
        }
      },
    },
    {
      name: game.i18n.localize('niks-copy-environment.menu.import'),
      icon: 'fas fa-file-import',
      callback: () => {
        try {
          Core.importGameSettingsQuick();
        } catch (e) {
          console.error('Copy Environment | Error importing game settings', e);
        }
      },
    },
  ]);
});
