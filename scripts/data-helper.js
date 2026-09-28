import { name as moduleName, log } from './config.js';
import Setting, { WorldSetting, PlayerSetting, Difference } from './setting.js';

export const MODULE_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ORPHANED: 'orphaned',
  MISSING: 'missing',
  CORE: 'core',
  SYSTEM: 'system',
});

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
   * Scans current world and client environment to prepare groups for the Exporter app.
   */
  static scanExportData() {
    const worldStorage = game.settings.storage.get('world');
    const systemId = game.system.id;
    const groups = new Map();

    const getOrCreateGroup = (namespace) => {
      if (groups.has(namespace)) return groups.get(namespace);

      let type = MODULE_STATUS.ORPHANED;
      let title = namespace;
      let version = '';
      let optOut = false;

      if (namespace === 'core') {
        type = MODULE_STATUS.CORE;
        title = 'Foundry Virtual Tabletop Core';
        version = game.version;
      } else if (namespace === systemId) {
        type = MODULE_STATUS.SYSTEM;
        title = game.system.title || namespace;
        version = game.system.version || '';
      } else {
        const mod = game.modules.get(namespace);
        if (mod) {
          type = mod.active ? MODULE_STATUS.ACTIVE : MODULE_STATUS.INACTIVE;
          title = mod.title || namespace;
          version = mod.version || '';
          optOut = Boolean(mod.flags?.noCopyEnvironmentSettings);
        } else {
          type = MODULE_STATUS.ORPHANED;
          title = `${namespace} (uninstalled)`;
        }
      }

      const group = {
        id: namespace,
        title,
        version,
        type,
        optOut,
        settings: [],
      };
      groups.set(namespace, group);
      return group;
    };

    // 1. Process all registered settings
    for (const [key, config] of game.settings.settings.entries()) {
      if (this.DEPRECATED_SETTINGS.has(key)) continue;

      const namespace = config.namespace;
      const group = getOrCreateGroup(namespace);
      if (group.optOut) continue;

      let value;
      try {
        value = game.settings.get(config.namespace, config.key);
      } catch (e) {
        log(false, `Could not retrieve setting ${key}:`, e);
        continue;
      }

      let isDefault = value === config.default;
      if (value && typeof value === 'object' && config.default && typeof config.default === 'object') {
        const diff1 = foundry.utils.diffObject(config.default, value);
        const diff2 = foundry.utils.diffObject(value, config.default);
        isDefault = foundry.utils.isEmpty(diff1) && foundry.utils.isEmpty(diff2);
      }

      const defaultSelected = !this.DEFAULT_UNCHECKED_SETTINGS.has(key) && (group.type !== MODULE_STATUS.INACTIVE);

      group.settings.push({
        key,
        name: config.name ? game.i18n.localize(config.name) : config.key,
        hint: config.hint ? game.i18n.localize(config.hint) : '',
        scope: config.scope,
        value,
        serializedValue: JSON.stringify(value),
        isDefault,
        defaultSelected,
      });
    }

    // 2. Scan world storage for orphaned settings that aren't currently registered in game.settings.settings
    if (worldStorage) {
      for (const settingDoc of worldStorage) {
        if (!settingDoc.key || this.DEPRECATED_SETTINGS.has(settingDoc.key)) continue;
        const [namespace] = settingDoc.key.split('.');
        const group = getOrCreateGroup(namespace);
        if (group.optOut) continue;

        // Check if already included from registered settings
        if (group.settings.some((s) => s.key === settingDoc.key)) continue;

        let parsedVal;
        try {
          parsedVal = JSON.parse(settingDoc.value);
        } catch {
          parsedVal = settingDoc.value;
        }

        group.settings.push({
          key: settingDoc.key,
          name: settingDoc.key,
          hint: game.i18n.localize('niks-copy-environment.export.orphanedHint'),
          scope: 'world',
          value: parsedVal,
          serializedValue: settingDoc.value,
          isDefault: false,
          defaultSelected: false,
        });
      }
    }

    // Sort settings within each group
    for (const group of groups.values()) {
      group.settings.sort((a, b) => a.key.localeCompare(b.key));
    }

    // Sort groups: Core first, then System, then Active, Inactive, Orphaned
    const order = {
      [MODULE_STATUS.CORE]: 1,
      [MODULE_STATUS.SYSTEM]: 2,
      [MODULE_STATUS.ACTIVE]: 3,
      [MODULE_STATUS.INACTIVE]: 4,
      [MODULE_STATUS.ORPHANED]: 5,
    };

    const sortedGroups = Array.from(groups.values())
      .filter((g) => g.settings.length > 0)
      .sort((a, b) => {
        const diff = (order[a.type] || 99) - (order[b.type] || 99);
        if (diff !== 0) return diff;
        return a.title.localeCompare(b.title);
      });

    // Players list
    const players = game.users.map((u) => {
      const normalizeColor = (c) => {
        try {
          return c ? (foundry.utils.Color?.from(c)?.css ?? c) : c;
        } catch {
          return c?.css ?? c;
        }
      };
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        roleName: Object.entries(CONST.USER_ROLES).find(([, r]) => r === u.role)?.[0] || 'PLAYER',
        color: normalizeColor(u.color),
        avatar: u.avatar,
        permissions: u.permissions,
        flags: u.flags,
        defaultSelected: true,
      };
    });

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
    const system = game.system ?? game.data?.system;

    const systemAuthors = Array.from(system?.authors ?? []).map((a) => (typeof a === 'string' ? a : a?.name ?? a)).filter(Boolean);
    if (!systemAuthors.length && system?.author) systemAuthors.push(system.author);

    // Exported settings array
    const exportedSettings = [];
    for (const key of selectedKeys) {
      if (this.DEPRECATED_SETTINGS.has(key)) continue;

      const [namespace, ...keyParts] = key.split('.');
      const subKey = keyParts.join('.');
      let valString = null;

      try {
        const val = game.settings.get(namespace, subKey);
        valString = JSON.stringify(val);
      } catch {
        // Fallback to world database storage
        const doc = worldStorage?.getSetting?.(key) ?? worldStorage?.find?.((s) => s.key === key);
        if (doc) valString = doc.value;
      }

      if (valString !== null) {
        exportedSettings.push({
          key,
          value: valString,
        });
      }
    }

    // Exported players
    const exportedPlayers = game.users
      .filter((u) => selectedPlayerIds.has(u.id))
      .map((userData) => ({
        name: userData.name,
        core: {
          avatar: userData.avatar,
          color: userData.color instanceof foundry.utils.Color ? userData.color.css : (userData.color?.css ?? userData.color),
          permissions: userData.permissions,
          role: userData.role,
        },
        flags: userData.flags,
      }));

    // Active modules list for environment reference
    const modulesMetadata = Array.from(game.modules.values()).map((m) => {
      const authors = Array.from(m.authors ?? []).map((a) => (typeof a === 'string' ? a : a?.name ?? a)).filter(Boolean);
      if (!authors.length && m.author) authors.push(m.author);
      return {
        id: m.id,
        title: m.title,
        version: m.version,
        active: m.active,
        authors: Array.from(new Set(authors)).join(', '),
        manifest: m.manifest,
      };
    });

    const supportingData = {
      compendiumFolders: includeCompendiumFolders
        ? game.folders.filter((f) => f.type === 'Compendium').map((f) => f.toObject())
        : [],
    };

    return {
      version: 2,
      generator: {
        module: moduleName,
        version: game.modules.get(moduleName)?.version || '14.2.0',
        coreVersion: game.version,
        system: {
          id: system?.id ?? system?.name,
          version: system?.version,
          title: system?.title,
          author: Array.from(new Set(systemAuthors)).join(', '),
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
        if (item.type === Setting.SupportingDataType) {
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

    const systemId = game.system.id;
    const groups = new Map();

    const getOrCreateGroup = (namespace) => {
      if (groups.has(namespace)) return groups.get(namespace);

      let type = MODULE_STATUS.MISSING;
      let title = namespace;
      let version = '';

      if (namespace === 'core') {
        type = MODULE_STATUS.CORE;
        title = 'Foundry Virtual Tabletop Core';
        version = game.version;
      } else if (namespace === systemId) {
        type = MODULE_STATUS.SYSTEM;
        title = game.system.title || namespace;
        version = game.system.version || '';
      } else {
        const mod = game.modules.get(namespace);
        if (mod) {
          type = mod.active ? MODULE_STATUS.ACTIVE : MODULE_STATUS.INACTIVE;
          title = mod.title || namespace;
          version = mod.version || '';
        } else {
          type = MODULE_STATUS.MISSING;
          title = `${namespace} (${game.i18n.localize('niks-copy-environment.badges.missing')})`;
        }
      }

      const group = {
        id: namespace,
        title,
        version,
        type,
        settings: [],
        hasChanges: false,
      };
      groups.set(namespace, group);
      return group;
    };

    // Analyze settings
    const selectedProperties = game.settings.get(moduleName, 'selected-properties') || {};

    for (const rawSetting of settingsList) {
      if (!rawSetting.key) continue;
      const [namespace] = rawSetting.key.split('.');
      const group = getOrCreateGroup(namespace);

      const worldSetting = new WorldSetting(rawSetting);
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
        rawSetting,
        worldSetting,
        isChanged,
        isSelected,
        oldString: worldSetting.difference.oldString ?? '—',
        newString: worldSetting.difference.newString ?? '—',
      });
    }

    // Sort groups
    const order = {
      [MODULE_STATUS.CORE]: 1,
      [MODULE_STATUS.SYSTEM]: 2,
      [MODULE_STATUS.ACTIVE]: 3,
      [MODULE_STATUS.INACTIVE]: 4,
      [MODULE_STATUS.MISSING]: 5,
    };

    const sortedGroups = Array.from(groups.values())
      .filter((g) => g.settings.length > 0)
      .sort((a, b) => {
        const diff = (order[a.type] || 99) - (order[b.type] || 99);
        if (diff !== 0) return diff;
        return a.title.localeCompare(b.title);
      });

    // Analyze players
    const analyzedPlayers = [];
    const notFoundPlayers = [];
    const notChangedPlayers = [];

    for (const rawPlayer of playersList) {
      const playerSetting = new PlayerSetting(rawPlayer);
      if (playerSetting.playerNotFound) {
        notFoundPlayers.push(rawPlayer.name);
      } else if (!playerSetting.hasChanges()) {
        notChangedPlayers.push(rawPlayer.name);
      } else {
        analyzedPlayers.push({
          name: rawPlayer.name,
          playerSetting,
          differences: Object.entries(playerSetting.playerDifferences).map(([field, diff]) => ({
            field,
            type: 'core',
            name: `${rawPlayer.name}--${field}`,
            oldString: diff.oldString,
            newString: diff.newString,
            isSelected: true,
          })),
          flagDifferences: Object.entries(playerSetting.playerFlagDifferences).map(([flagKey, diff]) => ({
            field: flagKey,
            type: 'flag',
            name: `${rawPlayer.name}--flag--${flagKey}`,
            oldString: diff.oldString,
            newString: diff.newString,
            isSelected: true,
          })),
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
      totalChanges: sortedGroups.reduce((acc, g) => acc + g.settings.filter((s) => s.isChanged).length, 0) + analyzedPlayers.length,
    };
  }

  /**
   * Applies the imported settings and player configurations to the world and client storage.
   */
  static async applyImport({ selectedSettings = [], selectedPlayerChanges = [], supportingData = {} }) {
    let changed = false;

    // 1. Process World and Client Settings
    if (selectedSettings.length > 0) {
      const updates = [];
      const creates = [];
      const worldStorage = game.settings.storage.get('world');

      for (const data of selectedSettings) {
        const config = game.settings.settings.get(data.key);

        if (config?.scope === 'client') {
          const storage = game.settings.storage.get('client');
          if (storage) {
            storage.setItem(data.key, data.value);
            changed = true;
          }
        } else if (game.user.isGM) {
          const existing = worldStorage?.getSetting?.(data.key)
            ?? game.data?.settings?.find((s) => s.key === data.key);

          // Handle compendium configuration folder ID remapping
          if (data.key === 'core.compendiumConfiguration') {
            try {
              let existingVal = existing?.value;
              if (!existingVal) {
                const currentSetting = game.settings.get('core', 'compendiumConfiguration');
                existingVal = currentSetting ? JSON.stringify(currentSetting) : '{}';
              }
              const existingCompendiumMap = typeof existingVal === 'string' ? JSON.parse(existingVal) : (existingVal || {});
              const newCompendiumMap = typeof data.value === 'string' ? JSON.parse(data.value) : (data.value || {});
              const missingEntries = new Map();

              for (const [key, value] of Object.entries(newCompendiumMap)) {
                if (game.folders.get(existingCompendiumMap[key]?.folder)) {
                  newCompendiumMap[key].folder = existingCompendiumMap[key].folder;
                } else {
                  missingEntries.set(key, value);
                }
              }

              for (const [key, value] of missingEntries) {
                const folder = await this.createFolderRecursive(value?.folder, supportingData?.compendiumFolders);
                if (folder?.id) {
                  newCompendiumMap[key].folder = folder.id;
                }
              }

              data.value = JSON.stringify(newCompendiumMap);
            } catch (e) {
              console.warn('Copy Environment | Could not process compendium configuration:', e);
            }
          }

          if (existing?._id) {
            updates.push({
              _id: existing._id,
              key: data.key,
              value: data.value,
            });
          } else {
            creates.push({
              key: data.key,
              value: data.value,
            });
          }
        }
      }

      const socket = foundry.helpers?.SocketInterface ?? globalThis.SocketInterface;
      if (updates.length > 0) {
        log(true, `Updating ${updates.length} world settings.`);
        await socket.dispatch('modifyDocument', {
          type: 'Setting',
          action: 'update',
          updates: updates,
          operation: { pack: null, parent: null, updates: updates },
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
    }

    // 2. Process Player Changes
    for (const playerUpdate of selectedPlayerChanges) {
      const user = game.users.getName(playerUpdate.name);
      if (!user) continue;

      const updateData = {};
      if (playerUpdate.core && !foundry.utils.isEmpty(playerUpdate.core)) {
        Object.assign(updateData, playerUpdate.core);
      }
      if (playerUpdate.flags && !foundry.utils.isEmpty(playerUpdate.flags)) {
        updateData.flags = playerUpdate.flags;
      }

      if (!foundry.utils.isEmpty(updateData)) {
        await user.update(updateData);
        changed = true;
        ui.notifications.info(game.i18n.format('niks-copy-environment.import.updatedPlayer', { name: user.name }));
      }
    }

    return changed;
  }

  static async createFolderRecursive(folderID, compendiumFolders = []) {
    if (!folderID) return undefined;
    if (game.folders.get(folderID)) return game.folders.get(folderID);

    const folderData = compendiumFolders.find((f) => f._id === folderID);
    if (!folderData) return undefined;

    if (folderData.folder && !game.folders.get(folderData.folder)) {
      const parentFolder = await this.createFolderRecursive(folderData.folder, compendiumFolders);
      if (parentFolder?.id) folderData.folder = parentFolder.id;
    }

    return Folder.create(folderData, { keepId: true });
  }
}
