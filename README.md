# FoundryVTT - Nik's Copy Environment

![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/League-of-Foundry-Developers/foundryvtt-forien-copy-environment) ![GitHub Releases](https://img.shields.io/github/downloads/League-of-Foundry-Developers/foundryvtt-forien-copy-environment/latest/total) ![GitHub Releases](https://img.shields.io/github/downloads/League-of-Foundry-Developers/foundryvtt-forien-copy-environment/total) ![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fforien-copy-environment&colorB=4aa94a) ![Foundry Version](https://img.shields.io/badge/dynamic/json.svg?url=https://github.com/League-of-Foundry-Developers/foundryvtt-forien-copy-environment/releases/latest/download/module.json&label=foundry%20version&query=$.compatibleCoreVersion&colorB=blueviolet) ![Forien's Copy Environment](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2FLeague-of-Foundry-Developers%2Fleague-repo-status%2Fshields-endpoint%2Fforien-copy-environment.json)



**NOTE** This is an unofficial forked version of the module maintained by the League of Foundry Developers to provide module continuity while Forien is unavailable.

**[Compatibility]**: *FoundryVTT* 14+

**[Systems]**: *any* (optimized for DnD5e v6+)

This module allows for fast copy/save environment data such as core version or list of installed modules and their versions. Supports copying as TXT or saving as JSON.

Module also allows to export (save/backup) current game settings and then import (restore) them. Non-GM users can only import client-side settings.

### Usage

Go to Settings tab in Sidebar and **right click** on data **below** "General Information" header

![](https://i.gyazo.com/8f41b4e7f52e8f560f9265774a9849db.gif)

## Features

* Copy Environment (core, system and module versions) to clipboard
* Save Environment (including manifest links) as a JSON file
* Export game settings (both 'world' and 'client' scopes)
* Import game settings ('client' ones, and if you are GM also 'world' ones - you will be able to choose which ones you want to import)

*Please note that importing 'world' scope settings en masse as GM might cause some issues to connected players. I advise players should logout before attempting to import World Settings*

## Info for Module Developers

### How do I opt out?

Perhaps you have a module that you don't want the settings being copied between worlds. You can add the following to your module manifest file to opt out of having the settings copied. The `active` state of your module will still be copied, just the settings won't.

1. Add `noCopyEnvironmentSettings: true` to your manifest json inside of the `flags` field of the manifest.

module.json
```md
  "flags": {
    "noCopyEnvironmentSettings": true
  }
```

## Contact

[League of Foundry Developers](https://discord.gg/gzemMfHURH) ~~If you wish to contact me for any reason, reach me out on Discord using my tag: `Forien#2130`~~

## Translations

- Japanese by touge
- German by brockhaus
- Portuguese by vithort
- Italian by GregoryWarn
- French by rectulo

## Support

If you wish to support module development, please consider [becoming Patron](https://www.patreon.com/foundryworkshop) or donating [through Paypal](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=6P2RRX7HVEMV2&source=url). Thanks!

---

## Other Modules by Nik

### 🎲 D&D 5e Specific
* **[Nik's DnD5e Tweaks](https://github.com/nschoenwald/niks-dnd5e-tweaks)** – Consolidated collection of quality-of-life enhancements and combat automation tweaks for DnD5e.

### ⚔️ Combat & Token Tools
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
