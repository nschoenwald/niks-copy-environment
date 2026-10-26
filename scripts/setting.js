import { name as moduleName } from './config.js';

/**
 * Read the configured maximum diff display length.
 * @returns {number} 0 means "no limit".
 */
export function getMaxDiffLength() {
  const value = Number(game.settings.get(moduleName, 'diff-length'));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Parse a JSON string, returning the raw input if it is not valid JSON.
 * @param {*} value
 * @returns {*}
 */
function parseJSON(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Normalize a value to its plain JSON representation (e.g. DataModel instances, Color objects),
 * which is the same form in which the value was exported.
 * @param {*} value
 * @returns {*}
 */
function toPlainJSON(value) {
  if (value === undefined) return undefined;
  const json = JSON.stringify(value);
  return json === undefined ? undefined : JSON.parse(json);
}

/**
 * Normalize a user color to a css string so Color objects and hex strings compare equal.
 * @param {*} c
 * @returns {*}
 */
export function normalizeColor(c) {
  try {
    return c ? (foundry.utils.Color.from(c)?.css ?? c) : c;
  } catch {
    return c?.css ?? c;
  }
}

/**
 * WorldSetting represents a world, user or client level setting from an import file.
 */
export class WorldSetting {
  /**
   * @param {{key: string, value: string}} setting  The exported setting (value is a JSON string)
   * @param {object} [options]
   * @param {number} [options.maxLength]            Maximum display length of difference strings
   */
  constructor(setting, { maxLength = getMaxDiffLength() } = {}) {
    if (!setting?.key) {
      throw new Error('Invalid data');
    }

    this.key = setting.key;
    this.value = setting.value;
    this.group = this.key.split('.').shift();
    this.difference = this.calculateDifference(maxLength);
  }

  hasChanges() {
    return this.difference.hasChanges();
  }

  /**
   * Compares the parsed JSON setting data to handle object key order differences.
   * @param {number} maxLength
   * @returns {Difference}
   */
  calculateDifference(maxLength) {
    const [namespace, ...keyParts] = this.key.split('.');
    let existing;
    if (game.settings.settings.has(this.key)) {
      try {
        existing = toPlainJSON(game.settings.get(namespace, keyParts.join('.')));
      } catch (e) {
        console.error('Copy Environment | Could not read current setting value:', this.key, e);
      }
    } else {
      // Not registered (module not installed or not active), compare against the stored world value.
      const stored = game.settings.storage.get('world')?.getItem(this.key);
      existing = stored === null || stored === undefined ? undefined : parseJSON(stored);
    }

    const newValue = parseJSON(this.value);
    if (foundry.utils.equals(existing, newValue)) {
      return new Difference(this.key, null, null, maxLength);
    }
    return new Difference(this.key, existing, newValue, maxLength);
  }
}

/**
 * PlayerSetting represents a player level setting.
 */
export class PlayerSetting {
  /**
   * Fields of the `core` export block that are compared and can be imported.
   * @type {string[]}
   */
  static CORE_FIELDS = ['avatar', 'color', 'permissions', 'role'];

  /**
   * Create a player setting from exported data.
   * @param {object} setting
   * @param {object} [options]
   * @param {number} [options.maxLength]  Maximum display length of difference strings
   */
  constructor(setting, { maxLength = getMaxDiffLength() } = {}) {
    if (!setting) {
      throw new Error('Invalid data');
    }

    this.name = setting.name;
    this.playerNotFound = false;
    this.playerDifferences = {};
    this.playerFlagDifferences = {};

    const user = game.users.getName(this.name);
    if (!user) {
      this.playerNotFound = true;
      return;
    }

    const core = setting.core ?? {};
    for (const field of PlayerSetting.CORE_FIELDS) {
      if (!(field in core)) continue;
      let current = toPlainJSON(user[field]);
      let incoming = core[field];
      if (field === 'color') {
        current = normalizeColor(user.color);
        incoming = normalizeColor(incoming);
      }
      if (!foundry.utils.equals(current, incoming)) {
        this.playerDifferences[field] = new Difference(field, current, incoming, maxLength);
      }
    }

    const userFlags = user.flags ?? {};
    const flagDiff = foundry.utils.diffObject(userFlags, setting.flags ?? {});
    for (const [prop, value] of Object.entries(flagDiff)) {
      this.playerFlagDifferences[prop] = new Difference(prop, userFlags[prop], value, maxLength);
    }
  }

  /**
   * Returns whether this player setting differs from a player of the same name in the current world.
   * @returns {boolean}
   */
  hasChanges() {
    return this.playerNotFound || this.hasDataChanges();
  }

  /**
   * Returns whether this player setting has different data values than a player of the same name in the current world.
   * Note that if there is not a matching player, there are no data changes.
   * @see hasChanges
   * @returns {boolean}
   */
  hasDataChanges() {
    return !foundry.utils.isEmpty(this.playerDifferences) || !foundry.utils.isEmpty(this.playerFlagDifferences);
  }
}

/**
 * Difference represents the difference between the existing setting and the proposed setting.
 */
export class Difference {
  /**
   * Create a setting difference.
   * @param {string} name
   * @param {*} oldValue
   * @param {*} newValue
   * @param {number} [maxLength]  Maximum display length of the difference strings, 0 for unlimited
   */
  constructor(name, oldValue, newValue, maxLength = getMaxDiffLength()) {
    this.name = name;
    if (oldValue !== newValue) {
      this.oldVal = oldValue;
      this.oldString = Difference.truncate(JSON.stringify(oldValue), maxLength);
      this.newVal = newValue;
      this.newString = Difference.truncate(JSON.stringify(newValue), maxLength);
    }
  }

  static truncate(str, maxLength) {
    if (maxLength && str?.length > maxLength) {
      return str.substring(0, maxLength) + '...';
    }
    return str;
  }

  hasChanges() {
    return this.oldVal !== this.newVal;
  }
}
