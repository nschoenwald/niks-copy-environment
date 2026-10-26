import { name as moduleName, log } from './config.js';
import { WorldSetting, PlayerSetting, getMaxDiffLength, normalizeColor } from './setting.js';

export const MODULE_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ORPHANED: 'orphaned',
  MISSING: 'missing',
  CORE: 'core',
  SYSTEM: 'system',
});

/**
 * Marker type for the supporting data entry of legacy (v1) flat array exports.
 * @type {string}
 */
export const SUPPORTING_DATA_TYPE = '_supportingDataType';

const GROUP_ORDER = {
  [MODULE_STATUS.CORE]: 1,
  [MODULE_STATUS.SYSTEM]: 2,
  [MODULE_STATUS.ACTIVE]: 3,
  [MODULE_STATUS.INACTIVE]: 4,
  [MODULE_STATUS.ORPHANED]: 5,
  [MODULE_STATUS.MISSING]: 5,
};

/**
 * Sort comparator for setting groups: Core, System, Active, Inactive, Orphaned/Missing, then by title.
 */
function compareGroups(a, b) {
  const diff = (GROUP_ORDER[a.type] || 99) - (GROUP_ORDER[b.type] || 99);
  if (diff !== 0) return diff;
  return a.title.localeCompare(b.title);
}

/**
 * Format the authors of a package as a comma separated string.
 * @param {object} pkg  A system or module package
 * @returns {string}
 */
export function formatAuthors(pkg) {
  const authors = Array.from(pkg?.authors ?? [])
    .map((a) => (typeof a === 'string' ? a : a?.name))
    .filter(Boolean);
  return Array.from(new Set(authors)).join(', ');
}

export default class DataHelper {
  static DEPRECATED_SETTINGS = new Set([
    'core.gridTemplates',
    'core.coneTemplateType',
  ]);

  static DEFAULT_UNCHECKED_SETTINGS = new Set([
    'core.time',
    'pf2e.worldClock.worldCreatedOn',
    'dnd5e.systemMigrationVersion',
    'dnd5e.firstRun',
  ]);

  /**
   * Describe the package that owns a setting namespace.
   * @param {string} namespace
   * @param {string} unknownType   Status used when no installed package matches the namespace
   * @param {string} unknownTitle  Title used when no installed package matches the namespace
   * @returns {{id: string, title: string, version: string, type: string, optOut: boolean}}
   */
  static describeNamespace(namespace, unknownType, unknownTitle) {
    if (namespace === 'core') {
      return { id: namespace, title: 'Foundry Virtual Tabletop Core', version: game.version, type: MODULE_STATUS.CORE, optOut: false };
    }
    if (namespace === game.system.id) {
      return { id: namespace, title: game.system.title || namespace, version: game.system.version || '', type: MODULE_STATUS.SYSTEM, optOut: false };
    }
    const mod = game.modules.get(namespace);
    if (mod) {
      return {
        id: namespace,
        title: mod.title || namespace,
        version: mod.version || '',
        type: mod.active ? MODULE_STATUS.ACTIVE : MODULE_STATUS.INACTIVE,
        optOut: Boolean(mod.flags?.noCopyEnvironmentSettings),
      };
    }
    return { id: namespace, title: unknownTitle, version: '', type: unknownType, optOut: false };
  }

  /**
   * Scans current world and client environment to prepare groups for the Exporter app.
   */
  static scanExportData() {
    const worldStorage = game.settings.storage.get('world');
    const groups = new Map();

    const getOrCreateGroup = (namespace) => {
      let group = groups.get(namespace);
      if (!group) {
        group = {
          ...this.describeNamespace(namespace, MODULE_STATUS.ORPHANED, `${namespace} (uninstalled)`),
          settings: [],
        };
        groups.set(namespace, group);
      }
      return group;
    };

    // 1. Process all registered settings
    for (const [key, config] of game.settings.settings.entries()) {
      if (this.DEPRECATED_SETTINGS.has(key)) continue;

      const group = getOrCreateGroup(config.namespace);
      if (group.optOut) continue;

      let value;
      try {
        value = game.settings.get(config.namespace, config.key);
      } catch (e) {
        log(false, `Could not retrieve setting ${key}:`, e);
        continue;
      }

      let isDefault = value === config.default;
      if (!isDefault && value && typeof value === 'object' && config.default && typeof config.default === 'object') {
        try {
          isDefault = foundry.utils.equals(JSON.parse(JSON.stringify(value)), JSON.parse(JSON.stringify(config.default)));
        } catch {
          isDefault = false;
        }
      }

      group.settings.push({
        key,
        name: config.name ? game.i18n.localize(config.name) : config.key,
        hint: config.hint ? game.i18n.localize(config.hint) : '',
        scope: config.scope,
        isDefault,
        defaultSelected: !this.DEFAULT_UNCHECKED_SETTINGS.has(key) && (group.type !== MODULE_STATUS.INACTIVE),
      });
    }

    // 2. Scan world storage for orphaned world settings that aren't registered in game.settings.settings.
    // User-scoped Setting documents of every user also live in this collection, so skip those.
    if (worldStorage) {
      const seen = new Set();
      for (const settingDoc of worldStorage) {
        const key = settingDoc.key;
        if (!key || settingDoc.user || seen.has(key)) continue;
        if (game.settings.settings.has(key) || this.DEPRECATED_SETTINGS.has(key)) continue;
        seen.add(key);

        const [namespace] = key.split('.');
        const group = getOrCreateGroup(namespace);
        if (group.optOut) continue;

        group.settings.push({
          key,
          name: key,
          hint: game.i18n.localize('niks-copy-environment.export.orphanedHint'),
          scope: 'world',
          isDefault: false,
          defaultSelected: false,
        });
      }
    }

    const sortedGroups = Array.from(groups.values()).filter((g) => g.settings.length > 0);
    for (const group of sortedGroups) {
      group.settings.sort((a, b) => a.key.localeCompare(b.key));
    }
    sortedGroups.sort(compareGroups);

    const roleNames = Object.fromEntries(Object.entries(CONST.USER_ROLES).map(([name, role]) => [role, name]));
    const players = game.users.map((u) => ({
      id: u.id,
      name: u.name,
      roleName: roleNames[u.role] || 'PLAYER',
      color: normalizeColor(u.color),
    }));

    const compendiumFoldersCount = game.folders.filter((f) => f.type === 'Compendium').length;

    return {
      groups: sortedGroups,
      players,
      compendiumFoldersCount,
    };
  }

  /**
   * Generates the export payload from user selections.
   */
  static buildExportPayload({ selectedKeys = new Set(), selectedPlayerIds = new Set(), includeCompendiumFolders = true }) {
    const worldStorage = game.settings.storage.get('world');
    const system = game.system;

    // Exported settings array
    const exportedSettings = [];
    for (const key of selectedKeys) {
      if (this.DEPRECATED_SETTINGS.has(key)) continue;

      let valString = null;
      if (game.settings.settings.has(key)) {
        const [namespace, ...keyParts] = key.split('.');
        try {
          valString = JSON.stringify(game.settings.get(namespace, keyParts.join('.')));
        } catch (e) {
          console.error(`Copy Environment | Could not export setting ${key}:`, e);
        }
      } else {
        // Orphaned setting, read the raw value from the world database
        valString = worldStorage?.getItem(key) ?? null;
      }

      if (valString !== null && valString !== undefined) {
        exportedSettings.push({ key, value: valString });
      }
    }

    // Exported players
    const exportedPlayers = game.users
      .filter((u) => selectedPlayerIds.has(u.id))
      .map((user) => ({
        name: user.name,
        core: {
          avatar: user.avatar,
          color: normalizeColor(user.color),
          permissions: user.permissions,
          role: user.role,
        },
        flags: user.flags,
      }));

    // Modules list for environment reference
    const modulesMetadata = game.modules.map((m) => ({
      id: m.id,
      title: m.title,
      version: m.version,
      active: m.active,
      authors: formatAuthors(m),
      manifest: m.manifest,
    }));

    const supportingData = {
      compendiumFolders: includeCompendiumFolders
        ? game.folders.filter((f) => f.type === 'Compendium').map((f) => f.toObject())
        : [],
    };

    return {
      version: 2,
      generator: {
        module: moduleName,
        version: game.modules.get(moduleName)?.version,
        coreVersion: game.version,
        system: {
          id: system.id,
          version: system.version,
          title: system.title,
          author: formatAuthors(system),
        },
        exportedAt: new Date().toISOString(),
        worldId: game.world.id,
      },
      modules: modulesMetadata,
      settings: exportedSettings,
      players: exportedPlayers,
      supportingData,
    };
  }

  /**
   * Normalizes incoming raw file data (v1 flat array or v2 object) and compares with current world.
   */
  static analyzeImportData(raw) {
    let settingsList = [];
    let playersList = [];
    let supportingData = {};
    let metadata = null;

    if (Array.isArray(raw)) {
      // Legacy v1 flat array format
      for (const item of raw) {
        if (!item || typeof item !== 'object') continue;
        if (item.type === SUPPORTING_DATA_TYPE) {
          supportingData = foundry.utils.mergeObject(supportingData, item.value || {});
        } else if (item.key && item.value) {
          settingsList.push(item);
        } else if (item.name && (item.core || item.flags)) {
          playersList.push(item);
        }
      }
    } else if (raw && typeof raw === 'object') {
      // Modern v2 structured format
      settingsList = Array.isArray(raw.settings) ? raw.settings : [];
      playersList = Array.isArray(raw.players) ? raw.players : [];
      supportingData = raw.supportingData || {};
      metadata = raw.generator || null;
    } else {
      throw new Error(game.i18n.localize('niks-copy-environment.import.invalidFileError'));
    }

    const maxLength = getMaxDiffLength();
    const missingLabel = game.i18n.localize('niks-copy-environment.badges.missing');
    const groups = new Map();

    const getOrCreateGroup = (namespace) => {
      let group = groups.get(namespace);
      if (!group) {
        group = {
          ...this.describeNamespace(namespace, MODULE_STATUS.MISSING, `${namespace} (${missingLabel})`),
          settings: [],
          hasChanges: false,
        };
        groups.set(namespace, group);
      }
      return group;
    };

    // Analyze settings
    const selectedProperties = game.settings.get(moduleName, 'selected-properties') || {};

    for (const rawSetting of settingsList) {
      if (!rawSetting?.key || typeof rawSetting.key !== 'string') continue;
      const [namespace] = rawSetting.key.split('.');
      const group = getOrCreateGroup(namespace);

      let worldSetting;
      try {
        worldSetting = new WorldSetting(rawSetting, { maxLength });
      } catch (e) {
        console.error('Copy Environment | Could not analyze setting:', rawSetting.key, e);
        continue;
      }
      const isChanged = worldSetting.hasChanges();
      if (isChanged) group.hasChanges = true;

      // Default checked logic:
      // If user previously saved preference, respect it.
      // Otherwise: uncheck missing modules, uncheck default excluded (time, dnd5e migration), check others that have changes.
      let isSelected;
      if (typeof selectedProperties[rawSetting.key] !== 'undefined') {
        isSelected = selectedProperties[rawSetting.key];
      } else if (this.DEFAULT_UNCHECKED_SETTINGS.has(rawSetting.key) || group.type === MODULE_STATUS.MISSING) {
        isSelected = false;
      } else {
        isSelected = isChanged;
      }

      group.settings.push({
        key: rawSetting.key,
        value: rawSetting.value,
        isChanged,
        isSelected,
        oldString: worldSetting.difference.oldString ?? '—',
        newString: worldSetting.difference.newString ?? '—',
      });
    }

    const sortedGroups = Array.from(groups.values()).filter((g) => g.settings.length > 0).sort(compareGroups);

    // Analyze players
    const analyzedPlayers = [];
    const notFoundPlayers = [];
    const notChangedPlayers = [];

    for (const rawPlayer of playersList) {
      if (!rawPlayer?.name) continue;
      const playerSetting = new PlayerSetting(rawPlayer, { maxLength });
      if (playerSetting.playerNotFound) {
        notFoundPlayers.push(rawPlayer.name);
      } else if (!playerSetting.hasChanges()) {
        notChangedPlayers.push(rawPlayer.name);
      } else {
        const toEntries = (differences, type) => Object.entries(differences).map(([field, diff]) => ({
          field,
          type,
          oldString: diff.oldString,
          newString: diff.newString,
          newVal: diff.newVal,
        }));
        analyzedPlayers.push({
          name: rawPlayer.name,
          differences: toEntries(playerSetting.playerDifferences, 'core'),
          flagDifferences: toEntries(playerSetting.playerFlagDifferences, 'flag'),
        });
      }
    }

    return {
      metadata,
      groups: sortedGroups,
      players: analyzedPlayers,
      notFoundPlayers,
      notChangedPlayers,
      supportingData,
    };
  }

  /**
   * Applies the imported settings and player configurations to the world and client storage.
   */
  static async applyImport({ selectedSettings = [], selectedPlayerChanges = [], supportingData = {} }) {
    let changed = false;

    // 1. Process World, User and Client Settings
    const updates = [];
    const creates = [];
    const worldStorage = game.settings.storage.get('world');

    for (const data of selectedSettings) {
      const config = game.settings.settings.get(data.key);

      if (config?.scope === CONST.SETTING_SCOPES.CLIENT) {
        game.settings.storage.get('client')?.setItem(data.key, data.value);
        changed = true;
      } else if (config?.scope === CONST.SETTING_SCOPES.USER) {
        // User-scoped settings are stored per user, so they can only be applied to the importing user.
        try {
          await game.settings.set(config.namespace, config.key, JSON.parse(data.value));
          changed = true;
        } catch (e) {
          console.error(`Copy Environment | Could not import user setting ${data.key}:`, e);
        }
      } else if (game.user.isGM) {
        let value = data.value;
        if (data.key === 'core.compendiumConfiguration') {
          value = await this.remapCompendiumConfiguration(value, supportingData?.compendiumFolders);
        }

        const existing = worldStorage?.getSetting(data.key);
        if (existing?._id) {
          updates.push({ _id: existing._id, key: data.key, value });
        } else {
          creates.push({ key: data.key, value });
        }
      }
    }

    const socket = foundry.helpers.SocketInterface;
    if (updates.length > 0) {
      log(true, `Updating ${updates.length} world settings.`);
      await socket.dispatch('modifyDocument', {
        type: 'Setting',
        action: 'update',
        updates,
        operation: { pack: null, parent: null, updates },
      });
      changed = true;
    }

    if (creates.length > 0) {
      log(true, `Creating ${creates.length} world settings.`);
      await socket.dispatch('modifyDocument', {
        type: 'Setting',
        action: 'create',
        data: creates,
        operation: { pack: null, parent: null, data: creates },
      });
      changed = true;
    }

    // 2. Process Player Changes (only GMs may modify other users)
    if (selectedPlayerChanges.length && !game.user.isGM) {
      log(true, 'Skipping player changes, only GMs can update users.');
      return changed;
    }

    for (const playerUpdate of selectedPlayerChanges) {
      const user = game.users.getName(playerUpdate.name);
      if (!user) continue;

      const updateData = { ...playerUpdate.core };
      if (!foundry.utils.isEmpty(playerUpdate.flags ?? {})) {
        updateData.flags = playerUpdate.flags;
      }
      if (foundry.utils.isEmpty(updateData)) continue;

      try {
        await user.update(updateData);
        changed = true;
        ui.notifications.info(game.i18n.format('niks-copy-environment.import.updatedPlayer', { name: user.name }));
      } catch (e) {
        console.error(`Copy Environment | Could not update user ${user.name}:`, e);
      }
    }

    return changed;
  }

  /**
   * The Compendium Configuration setting maps compendiums to folders, and folder IDs differ between worlds.
   * Keep existing folder mappings and recreate missing folders from the supporting data where possible.
   * @param {string} value                  The imported setting value (JSON string)
   * @param {object[]} [compendiumFolders]  Exported compendium folder data
   * @returns {Promise<string>}             The remapped setting value (JSON string)
   */
  static async remapCompendiumConfiguration(value, compendiumFolders = []) {
    try {
      const existingMap = game.settings.get('core', 'compendiumConfiguration') ?? {};
      const newMap = typeof value === 'string' ? JSON.parse(value) : (value || {});

      for (const [key, config] of Object.entries(newMap)) {
        const existingFolderId = existingMap[key]?.folder;
        if (existingFolderId && game.folders.get(existingFolderId)) {
          config.folder = existingFolderId;
          continue;
        }
        const folder = await this.createFolderRecursive(config?.folder, compendiumFolders);
        if (folder?.id) config.folder = folder.id;
      }

      return JSON.stringify(newMap);
    } catch (e) {
      console.warn('Copy Environment | Could not process compendium configuration:', e);
      return value;
    }
  }

  static async createFolderRecursive(folderID, compendiumFolders = []) {
    if (!folderID) return undefined;
    const existing = game.folders.get(folderID);
    if (existing) return existing;

    const folderData = compendiumFolders?.find((f) => f._id === folderID);
    if (!folderData) return undefined;

    if (folderData.folder && !game.folders.get(folderData.folder)) {
      const parentFolder = await this.createFolderRecursive(folderData.folder, compendiumFolders);
      folderData.folder = parentFolder?.id ?? null;
    }

    log(false, `Creating missing folder "${folderData.name}" with ID ${folderID}`);
    return foundry.documents.Folder.implementation.create(folderData, { keepId: true });
  }
}
