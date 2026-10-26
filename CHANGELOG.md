# Changelog

All notable changes to **Nik's Copy Environment (`niks-copy-environment`)** are documented in this file.

## [14.3.0] - 2026-10-26
### Fixed
- **Import: Long Player Values Cut Off**:
  - Fixed player permissions and flags being saved cut off (ending in "...") when they were longer than the **Number of characters** preview limit. The full value is always imported now.
- **Import: Per-User Settings**:
  - Fixed per-user settings being imported as world-wide settings. They are now applied to the user who runs the import.
- **Import: Files Failing to Open**:
  - Fixed import files with a player entry that has no core data (only flags) failing to open.
- **Import: Settings Wrongly Marked as Changed**:
  - Settings that only differ in the order of their entries are no longer shown as changed.
  - Settings of uninstalled modules are now compared against the value stored in the world, instead of always showing as changed.
- **Import: Player Changes for Non-GMs**:
  - Non-GM users no longer get an error when an import file contains player changes. Those changes are skipped, since only a GM can change other users.
- **Import: Changed Filter**:
  - The **Changed** filter now also hides unchanged settings inside a module, not just modules without any changes.
- **Export & Import: Selection Counter and Module Checkboxes**:
  - The selection counter and the module checkboxes now update when you tick individual settings. A module checkbox shows a partial state when only some of its settings are ticked.
- **Export: Deselect All**:
  - **Deselect All** no longer unticks the **Include Compendium Folder Mappings** option.
- **Export & Import: Opening Twice**:
  - Opening a dialog a second time now replaces the old window instead of leaving a broken copy behind.
- **Copy as Text: Success Message**:
  - Now uses Foundry's clipboard helper and only shows the success message when copying actually worked.

### Added
- **Import: Player Avatars**:
  - Player avatars from the export file are now compared and can be imported.

### Changed
- **Translations: Status Badges**:
  - The Active, Inactive, Orphaned and Not Installed badges are now translated.
- **Code Cleanup**:
  - Removed the old, unused import window, its leftover translations and the duplicate `languages` folder. Nothing changes in how the module looks or behaves.
- **Module API**:
  - Macros can open the dialogs with `NiksCopyEnvironment.openExport()` and `NiksCopyEnvironment.openImport()`. The old `Core.exportGameSettings()` and `Core.importGameSettingsQuick()` have been removed.

### Improved
- **Performance**:
  - The export and import dialogs open faster in worlds with many settings.

## [14.2.1] - 2026-09-29
### Fixed
- **Styling: Other Windows Affected**:
  - Fixed the module's styles leaking into other windows and sheets, such as the level badge on the D&D 5e character sheet.
- **Module Not Loading**:
  - Fixed an error that stopped the module from loading.

## [14.2.0] - 2026-09-28
### Added
- **New Export Window**:
  - Preview every setting before exporting, with search and filters (**All**, **Active**, **Inactive**, **Orphaned**, **System / Core**, **Players**).
  - Settings are marked **Active** (installed and enabled), **Inactive** (installed but disabled) or **Orphaned** (left behind in the world by an uninstalled module).
  - Quick buttons: **Select All**, **Active Only** and **Deselect All**, plus a checkbox per module.
  - Option to include compendium folder mappings.
- **New Import Window**:
  - Compares the file against the modules installed in this world, marking them **Active**, **Inactive** or **Not Installed** with warnings.
  - Shows the new and current value of every setting side by side.
  - Works with both older and new export files.

## [14.1.0] - 2026-09-28
### Changed
- **Foundry V14 Compatibility**:
  - Updated the module for Foundry VTT v14, including the right-click menu in the Settings tab.
  - Deprecated core settings (`core.gridTemplates`, `core.coneTemplateType`) are no longer exported.
- **D&D 5e 6.x Compatibility**:
  - `dnd5e.systemMigrationVersion` and `dnd5e.firstRun` are unticked by default on import, so the target world's migration and first-run setup aren't disrupted.

### Fixed
- **Player Colors Always Changed**:
  - Fixed player colors always showing as changed on import.
- **Compendium Folders**:
  - Fixed a crash when importing compendium folders into a world that never changed its compendium configuration.

## [2.2.4]
### Added
- **Translations**: Polish translation by Lioheart. Italian and French translations enabled.

## [2.2.3]
### Changed
- **Module List Warning**:
  - It is now clearer when modules will not be enabled because the module configuration setting is unticked. See [issue #49](https://github.com/League-of-Foundry-Developers/foundryvtt-forien-copy-environment/issues/49).

### Added
- **Translations**: Italian by GregoryWarn and French by rectulo, plus machine translations of the new strings for German, Japanese, Portuguese, Italian and French.

## [2.2.2]
### Changed
- **World Time Unticked by Default**:
  - `core.time` and `pf2e.worldClock.worldCreatedOn` are unticked by default on import. They can still be selected. See [issue #53](https://github.com/League-of-Foundry-Developers/foundryvtt-forien-copy-environment/issues/53).

## [2.2.1]
### Changed
- **Foundry V12 Compatibility**.

## [2.2.0]
### Added
- **Compendium Folders**:
  - The compendium folder setup is exported again. Folders are matched to the new world, and missing folders are recreated from data included in the export.
  - Exports made before v2.2.0 don't include this folder data, so please export your world settings again. See [issue #45](https://github.com/League-of-Foundry-Developers/foundryvtt-forien-copy-environment/issues/45).

## [2.1.9]
### Added
- **Number of Characters Setting**:
  - Sets how many characters of each difference are shown (default 500). Helps with errors on very large export files. See [issue #43](https://github.com/League-of-Foundry-Developers/foundryvtt-forien-copy-environment/issues/43).
- **Translations**: Machine translations of the new setting for German, Japanese and Portuguese.

## [2.1.8]
### Changed
- **Compendium Configuration**: No longer exported, since folder IDs don't match between worlds.

## [2.1.7]
### Added
- **Export File Name**: The world name is added to the exported settings file.
- **Translations**: Portuguese by vithort.

### Changed
- **Foundry V11 Compatibility**.

## [2.1.6]
### Fixed
- **Invalid Settings**: Invalid settings are no longer exported. See [#35](https://github.com/League-of-Foundry-Developers/foundryvtt-forien-copy-environment/issues/35).

## [2.1.5]
### Changed
- **Non-GM Users**: Players can now use the module. They will see errors for settings they aren't allowed to change. See [#32](https://github.com/League-of-Foundry-Developers/foundryvtt-forien-copy-environment/issues/32).
- **Manifest**: Removed deprecated manifest fields. See [#33](https://github.com/League-of-Foundry-Developers/foundryvtt-forien-copy-environment/issues/33).

## [2.1.4]
### Added
- **Export File Name**: A timestamp is added to the exported file. See [#30](https://github.com/League-of-Foundry-Developers/foundryvtt-forien-copy-environment/issues/30).
- **Copy as JSON**: Re-added the JSON summary download, renamed from "Save as JSON". See [#29](https://github.com/League-of-Foundry-Developers/foundryvtt-forien-copy-environment/issues/29).

## [2.1.3]
### Fixed
- **Import With Players**: Fixed the importer not importing anything when the world had players other than the GM.

## [2.1.2]
### Changed
- **Reliability**: Better handling of module settings that previously broke the import, more logging, and a short wait so the server can save changes before the reload.
- **Save as JSON**: Removed from the right-click menu, since it was easily confused with exporting settings.

## [2.1.1]
### Fixed
- **Settings Stored as Objects**: Fixed these not being compared correctly, which also fixes importing the enabled modules list.

## [2.1.0]
### Added
- **Foundry V10 Compatibility**.
- **Client Settings**: Now exported and imported correctly. See [#10](https://github.com/League-of-Foundry-Developers/foundryvtt-forien-copy-environment/issues/10).
- **Grouped Settings**: Settings are grouped by module and collapsed by default. See [#13](https://github.com/League-of-Foundry-Developers/foundryvtt-forien-copy-environment/issues/13).
- **Remembered Selection**: Ticked and unticked settings are remembered between imports. See [#18](https://github.com/League-of-Foundry-Developers/foundryvtt-forien-copy-environment/issues/18).

### Changed
- **Sorting**: Settings in the import window are sorted.

## [2.0.7]
### Added
- **Translations**: German by brockhaus.
- **Foundry V9 Compatibility**.

## [2.0.6]
### Added
- **Translations**: Japanese by touge.

## [2.0.5]
### Fixed
- **Client Settings**: Fixed client settings not importing in Foundry 0.8.x.

## [2.0.4]
### Added
- **Module Opt-Out**: Module developers can keep their settings from being copied.
- **Bug Reporter**: Re-added Bug Reporter compatibility.

## [2.0.3]
### Changed
- **Foundry 0.8.4 Compatibility**.

## [2.0.2]
### Changed
- **Foundry 0.8.1 Compatibility**.

## [2.0.1]
### Changed
- **Single Export File**: World and player settings are combined in one file.
- **Import Selection**: World settings can be picked individually based on their differences.
- **Translations**: Localization support finished.

## [2.0.0]
### Added
- **League of Foundry Developers**: The module moved to [League of Foundry Developers](https://discord.gg/gzemMfHURH) stewardship.
- **Settings Menu**: Added a settings entry in addition to the right-click menu.
- **Player Settings**: Export and import of player settings, picked individually based on their differences.

### Changed
- **Foundry 0.8.0 Compatibility**.

## [1.1.1]
### Changed
- **Foundry 0.6.6 Compatibility**.

## [1.1.0]
### Added
- **Manifest Links**: Added manifest URLs to the JSON summary.
- **Game Settings**: Export and import of game settings. Non-GM users can only import client settings.

### Changed
- **Foundry 0.7.1 Compatibility**.

## [1.0.1]
### Added
- Initial release.
