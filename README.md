# ⬡ RIFT WARDEN
### Summon · Possess · Dominate

A full-featured active-idle tower defense game with collectible monsters,
a direct-control Possess system, an in-run shop, 5 currencies, 12 monsters,
3 maps, and persistent cloud-style saves — all running in a single browser tab.

---

## HOW TO RUN

### On PC (Windows / Mac / Linux)
1. Unzip the folder anywhere you like.
2. Open **index.html** in any modern browser:
   - Chrome / Edge → recommended (best canvas performance)
   - Firefox → fully supported
   - Safari → fully supported
3. That's it. No server, no install, no internet required after download.

> Tip: On Chrome you can right-click `index.html` → "Open with" → Chrome,
> or drag it straight into an open Chrome window.

### On Android
1. Transfer the whole unzipped folder to your phone (USB cable, or put
   it in Google Drive / any cloud and download it).
2. Open a file manager app (e.g. Files by Google).
3. Navigate to the folder and tap **index.html**.
4. Your browser (Chrome) opens it directly.  
   If tapping doesn't open it, tap → "Open with" → Chrome.
5. For the best experience: in Chrome's address bar tap the ⋮ menu →
   **"Add to Home screen"** — this makes it feel like a native app with
   its own icon, full-screen mode, and no browser chrome.

> Works offline once downloaded. All saves go to the browser's local
> storage (tied to that browser on that device).

### On iPhone / iPad
1. Put the folder in iCloud Drive, AirDrop it, or transfer via the
   Files app.
2. Tap **index.html** in the Files app → opens in Safari.
3. Tap the Share button (□↑) → **"Add to Home Screen"** for a full-screen
   app-like experience with its own icon.

> Note: Safari on iOS requires the file to be opened from a local path
> (Files app works perfectly). Do not use a mail attachment preview.

---

## SAVING YOUR PROGRESS

Saves live in the browser's `localStorage` — tied to the browser you play in
on that device. As long as you:
- Use the **same callsign** when you log in
- Play in the **same browser on the same device**

…your progress is always there. To move saves between devices, you'd need to
export them (not yet built — planned feature).

---

## HOW TO PLAY

### Core loop
1. **Log in** with any callsign (your save slot).
2. From the **Hub**, visit the **Roster** to see your monsters, and **Maps**
   to pick a battlefield.
3. On the **Pre-Run screen**, pick up to 4 monsters from your collection
   and 2 spells to bring into battle.
4. On the **battlefield**, tap any empty tile to place a unit from your team.
5. Your units auto-attack on AI. You earn gold and shards passively.

### The Possess System (key mechanic)
- Tap a placed unit (or its slot in the team bar) to **possess** it.
- A glowing ring appears around it — that's your control link.
- While possessed:
  - **Tap the battlefield** → the unit moves to that point
  - **Tap near an enemy** → the unit focuses attacks on that enemy
  - **Special button** → triggers the unit's unique ability
- Active play earns **2–3.5× more gold** than idle play.
- The **Focus meter** fills the longer you stay active, boosting rewards further.

### Between waves
- Every 5 waves, the **Rift Market** opens — buy buffs, repairs, and boosts
  with your Shards.
- Shards convert to Gold at run end (20% conversion).

### Spells
- Tap a spell button at the bottom of the screen.
- Some cast instantly (Overclock, Soul Leech); others require you to tap
  a point on the battlefield (Ashfall, Permafrost).

### Currencies at a glance
| Currency | Icon | Earned by | Spent on |
|---|---|---|---|
| Gold | ◈ | Completing runs, offline trickle | Upgrading monsters |
| Orbs | ◉ | Map clears, login, events | Rift Portal pulls |
| Essence | ✦ | Recycled duplicate pulls | Star upgrades (coming soon) |
| Crystals | ◆ | Achievements (coming soon) | Premium cosmetics |
| Shards | ▲ | During runs, per kill | In-run shop |

### Monsters (12 at launch)
| Name | Rarity | Role | Starts unlocked? |
|---|---|---|---|
| Gorpax | Common | Anchor | ✓ |
| Buzz | Common | Ravager | ✓ |
| Splotch | Common | Weaver | ✓ |
| Pip | Uncommon | Conduit | Pull from Portal |
| Noctis | Uncommon | Whisper | Pull from Portal |
| Mirrek | Uncommon | Artillerist | Pull from Portal |
| Vix | Rare | Ravager | Pull from Portal |
| Zara | Rare | Weaver | Pull from Portal |
| Thornback | Rare | Anchor | Pull from Portal |
| Kalux | Epic | Artillerist | Pull from Portal |
| The Librarian | Epic | Whisper | Pull from Portal |
| Solenne | Legendary | Conduit | Pull from Portal |

### Roles explained
- **Anchor** — tanky, slow, holds the front line
- **Ravager** — fast single-target DPS
- **Weaver** — slows and debuffs enemies
- **Artillerist** — long-range splash damage
- **Whisper** — stealth ambushers, high burst
- **Conduit** — heals and buffs nearby allies

---

## ROADMAP (not yet built, in the GDD)
- 2 more worlds (32 total maps)
- Hard & Nightmare modes per map
- Star-up system using Essence
- Relic Forge (active at Warden Rank 5)
- Endless mode with seasonal leaderboard
- Co-op Relic Hunt (2-player)
- Battle Pass & cosmetic skins

---

## FILES
```
rift-warden/
├── index.html    — all screen markup
├── style.css     — full stylesheet
├── data.js       — all game data (monsters, enemies, maps, spells)
├── game.js       — full game engine (~2000 lines)
└── README.md     — this file
```

All logic is vanilla JavaScript, no frameworks or build steps.
Open index.html and it runs.

---

*Rift Warden v0.1 — built July 2026*
