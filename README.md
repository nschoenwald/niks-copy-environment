# Nik's Copy Environment

[![Foundry VTT](https://img.shields.io/badge/Foundry%20VTT-V14-orange.svg)](https://foundryvtt.com)
[![Systems](https://img.shields.io/badge/Systems-Any-blue.svg)](https://foundryvtt.com/packages/systems)
[![Latest Release](https://img.shields.io/github/v/release/nschoenwald/niks-copy-environment?color=purple)](https://github.com/nschoenwald/niks-copy-environment/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/nschoenwald/niks-copy-environment/total)](https://github.com/nschoenwald/niks-copy-environment/releases)

Copy your Foundry setup (core, system and module versions) in one click, and move world, user and player settings between worlds with a preview of every change. Works with **any game system** in **Foundry VTT v14**, and is tuned for **D&D 5e 6.x**.

![](https://i.gyazo.com/8f41b4e7f52e8f560f9265774a9849db.gif)

---

## ✨ Features

- **Where to find it**: Open the **Settings** tab in the sidebar and **right-click** the information below the "General Information" header.
- **Copy as text**: Copies your core version, system and all active modules (with versions and authors) to the clipboard. Handy for bug reports.
- **Copy as JSON**: Downloads the same summary as a JSON file, including each package's manifest link.
- **Export Settings**:
  - Pick exactly which settings and players to export, with search and filters.
  - Settings are grouped by module and marked **Active**, **Inactive** or **Orphaned** (left behind by an uninstalled module).
  - Settings still at their default value are marked, so you can see what you actually changed.
  - Quick buttons: **Select All**, **Active Only** and **Deselect All**.
  - Optionally includes your compendium folders, so they can be rebuilt in the new world.
- **Import Settings**:
  - Shows the new and current value of every setting side by side, with a **Changed** filter.
  - Modules are marked **Active**, **Inactive** or **Not Installed**, with a warning before you import settings for modules that aren't installed.
  - Choose individual world, user and client settings, and individual player changes (color, role, avatar, permissions and flags).
  - Your choices are remembered for the next import.
  - Warns you if you skip the module list, so modules don't end up disabled by accident.
  - Older export files from Forien's Copy Environment still work.

---

## ⚙️ For GMs

- **Who can import what**:
  - **World** settings and **player** changes can only be imported by a GM.
  - **User** settings are applied to the user doing the import.
  - **Client** settings are saved in the importing browser.
- **Safe defaults**: World time, the pf2e world creation date and the D&D 5e migration version and first-run flag are unticked by default, so importing doesn't disrupt the target world.
- **Number of characters**: Limits how much of each value the import preview shows (default 500, 0 for no limit). Very long values are only shortened in the preview and are always imported in full.
- **Reload**: After an import, the world reloads automatically after a few seconds.

---

## 🧑‍💻 For Module Developers

- **Opt out**: Add this to your module's `module.json` to keep your settings out of exports. Whether your module is enabled is still copied, but its settings aren't.
  ```json
  "flags": {
    "noCopyEnvironmentSettings": true
  }
  ```
- **API**: Available on `globalThis.NiksCopyEnvironment` after `init`:
  - `NiksCopyEnvironment.openExport()` opens the export dialog.
  - `NiksCopyEnvironment.openImport()` asks for an export file and opens the import dialog.
  - `NiksCopyEnvironment.Core.copyAsText()` and `Core.saveSummaryAsJSON()` copy or download the environment summary.

---

## 🌐 Languages

🇬🇧 English · 🇩🇪 Deutsch (thanks brockhaus) · 🇫🇷 Français (thanks rectulo) · 🇮🇹 Italiano (thanks [@GregoryWarn](https://github.com/GregoryWarn)) · 🇯🇵 日本語 (thanks touge) · 🇵🇱 Polski (thanks Lioheart) · 🇧🇷 Português (thanks vithort)

---

## 📦 Installation

In Foundry, go to **Add-on Modules → Install Module**, search for **"Nik's Copy Environment"** and click **Install**.

Or paste this manifest URL:
```
https://github.com/nschoenwald/niks-copy-environment/releases/latest/download/module.json
```

Requires **Foundry VTT v14**. Works with any game system.

---

## Other Modules by Nik

### 🎲 D&D 5e Specific
* **[Nik's DnD5e Tweaks](https://github.com/nschoenwald/niks-dnd5e-tweaks)** – Consolidated collection of quality-of-life enhancements and combat automation tweaks for DnD5e.

### ⚔️ Combat & Token Tools
* **[Nik's Action HUD](https://github.com/nschoenwald/niks-action-hud)** – Sleek, modern canvas-docked Action HUD for quick access to attacks, spells, inventory, and utility rolls.
* **[Nik's Token Tags](https://github.com/nschoenwald/niks-token-tags)** – Automatically numbers duplicate combatant NPCs (A, B, C…) with color-coded letter overlays.
* **[Nik's Shared NPC Initiative](https://github.com/nschoenwald/niks-shared-npc-initiative)** – Groups NPCs of the same type in combat so they share a single initiative roll.
* **[Nik's Movement Control](https://github.com/nschoenwald/niks-movement-control)** – GM controls to toggle player movement and automatically restrict/allow movement on combat start and end.
* **[Nik's Tiny Change Logs](https://github.com/nschoenwald/niks-tiny-changelogs)** – Compact, single-line chat messages logging token HP and Temp HP changes.

### 🎲 Visuals & Display
* **[Nik's Dynamic Roll Area](https://github.com/nschoenwald/niks-dynamic-roll-area)** – Dynamically restricts Dice So Nice 3D dice rolling area to exclude the sidebar / chat log across all screen resolutions and window sizes.

### ⚙️ Utilities & System Management
* **[Nik's Settings Locks](https://github.com/nschoenwald/niks-settings-locks)** – Soft-lock and hard-lock client settings and keybindings across all connected players.
* **[Nik's Compendium Search Tweaks](https://github.com/nschoenwald/niks-compendium-search-tweaks)** – Configure which compendium packs are included or excluded from native sidebar search.
* **[Nik's Show & Tell](https://github.com/nschoenwald/niks-show-and-tell)** – Share popout images to chat and paste image files directly into chat messages.
* **[Nik's Zoom / Pan Options](https://github.com/nschoenwald/niks-zoom-pan-options)** – Touchpad and scroll wheel pan/zoom controls and canvas navigation enhancements.
* **[Nik's Scene Transformations](https://github.com/nschoenwald/niks-scene-transformations)** – Rotate scenes or add playable space around them, with tokens, walls, lights, tiles and regions moved along so everything stays in place.

---

## 🙏 Credits

Based on [Forien's Copy Environment](https://github.com/League-of-Foundry-Developers/foundryvtt-forien-copy-environment) by **Forien** and **Blair McMillan**, maintained by the [League of Foundry Developers](https://discord.gg/gzemMfHURH). Not affiliated with Foundry Gaming LLC.
