import { log } from './config.js';
import { formatAuthors } from './data-helper.js';

/**
 * Environment summary helpers (copy as text / save as JSON) and file utilities.
 */
export default class Core {
  /**
   * Download data as a pretty-printed JSON file.
   * @param {*} data
   * @param {string} filename
   */
  static download(data, filename) {
    if (!filename) {
      log(false, 'Missing filename on download request');
      return;
    }
    foundry.utils.saveDataToFile(JSON.stringify(data, null, 2), 'application/json', filename);
  }

  /**
   * @returns {Module[]} Active modules
   */
  static getActiveModules() {
    return game.modules.filter((m) => m.active);
  }

  static getText() {
    const system = game.system;
    const withAuthors = (pkg) => {
      const authors = formatAuthors(pkg);
      return authors ? ` (${authors})` : '';
    };

    let text = `Core Version: ${game.version}\n\n`;
    text += `System: ${system.id} ${system.version ?? ''}${withAuthors(system)} \n\n`;
    text += `Modules: \n`;
    for (const m of Core.getActiveModules()) {
      text += `${m.id} ${m.version}${withAuthors(m)}\n`;
    }
    text += `\n${game.i18n.localize('niks-copy-environment.message')}`;

    log(false, text);
    return text;
  }

  static async copyAsText() {
    try {
      await game.clipboard.copyPlainText(Core.getText());
      ui.notifications.info(game.i18n.localize('niks-copy-environment.copiedToClipboard'));
    } catch (err) {
      console.error('Copy Environment | Failed to copy to clipboard', err);
    }
  }

  static saveSummaryAsJSON() {
    const system = game.system;
    const data = {
      core: {
        version: game.version,
      },
      system: {
        id: system.id,
        version: system.version,
        author: formatAuthors(system),
        manifest: system.manifest,
      },
      modules: Core.getActiveModules().map((m) => ({
        id: m.id,
        version: m.version,
        author: formatAuthors(m),
        manifest: m.manifest,
      })),
    };

    Core.download(data, Core.getFilename('foundry-environment'));
  }

  static getFilename(filename) {
    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    return `${filename}-${date}-${time}-${game.world.id}.json`;
  }
}
