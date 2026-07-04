# RIFT WARDEN — Game Design Document v0.1
### "Summon. Possess. Dominate."

---

## 1. CONCEPT SUMMARY

**Genre:** Active-idle tower defense / collectible monster strategy  
**Platform:** Mobile (iOS + Android) + PC via the same build  
**Core pitch:** You are a Rift Warden — an outcast sorcerer who tears creatures from parallel dimensions to defend your stolen Rift Crystal. Unlike pure idle TDs, you can *possess* any unit at any time, turning that monster into a player-controlled weapon while the rest of your team auto-defends.

**The Summoners Greed problem we're solving:**  
SG is a great *concept* with a painful *execution*. Its two big failures are (1) nothing to do during a run and (2) progression gates that demand hours of idle time for marginal gains. This design solves both directly.

---

## 2. WHAT WE KEEP FROM SUMMONERS GREED

| SG element | Why we keep it |
|---|---|
| You're the villain / defender | Fresh angle, humor, good character contrast |
| Lots of collectible monsters (40–60+) | Drives collection motivation, long-tail retention |
| Multiple rarities (Common → Mythic) | Gacha / pull excitement, clear power ceiling per rarity |
| Spells cast manually | One of SG's best moments — we expand it greatly |
| Multiple currencies that each mean something | Prevents "only one thing to earn" boredom |
| Cute + weird original character designs | Personality differentiator vs generic TDs |
| Waves of enemies across different maps | Clear structure, satisfying cadence |

---

## 3. WHAT WE FIX

### Problem 1 — Nothing to do per run
**SG approach:** Place units before wave 1, then watch.  
**Our fix:** The **Possess System**. You tap any unit to take direct control of it. Its AI turns off; you aim, move, and trigger its special attack manually. The unit's damage is multiplied by 1.5–3x while possessed depending on how well you play. Switching possession is instant but there's a 2-second "inhabit" animation used for cooldown feel.

### Problem 2 — Idle sessions of 1+ hour for trivial gain
**SG approach:** Offline coins accumulate but meaningful items require hours of active-run time.  
**Our fix:** Two-tier offline earnings:
- **Passive trickle** (works offline forever, low rate) — never the primary income
- **Run rewards** (for completing a run, even partly) — the big payouts, achieved in 8–20 minutes of active play per session
- You never *need* to leave the app open. An 8-minute active session pays better than 3 hours of leaving it open.

### Problem 3 — Progression feels stuck
**SG approach:** Level up monsters with gold, star them up with duplicates — both gated behind RNG pulls and insane gold sinks.  
**Our fix:** Three parallel progress tracks so you're always moving on *something*:
1. **Monster power** (pull dupes, use Essence to star up)
2. **Map mastery** (each map has 3 modes; completing Hard unlocks new permanent passive)
3. **Warden rank** (account XP from any activity — grants Shard bonuses, new spells, unit slots)

---

## 4. CURRENCIES — ALL FIVE, ALL MEANINGFUL

### 4a. SHARDS (in-run, session currency)
- **What they are:** Earned during a run per wave cleared, enemy killed, possession combo hit
- **Used for:** In-run shop purchases between waves (see Section 8)
- **Carry-over:** 20% of unspent Shards convert to Gold at run end
- **Why this works:** Gives you micro-decisions every 3–5 waves, not just "watch"

### 4b. GOLD (meta soft currency)
- **What it is:** Primary out-of-run upgrade currency
- **Earned by:** Completing runs, daily quests, Warden rank-ups, offline trickle
- **Spent on:** Monster level upgrades (XP bars, not random), spell upgrades, map entry boosts
- **Key design:** Gold costs are predictable. You can see exactly how many runs to the next level. No RNG on spend.

### 4c. ORBS (gacha pulls)
- **What they are:** Premium-ish pull currency, but earnable F2P
- **Earned by:** Completing a map for the first time, daily login, weekly challenge, Hard mode clears, specific achievements
- **Spent on:** Monster summons from the Rift Portal
- **Rate guarantee:** Every 10-pull has at least 1 Rare. Every 40-pull has at least 1 Epic. Every 80-pull has at least 1 Legendary. Counter resets on hit but is preserved between sessions.
- **No pay wall:** An active player earns ~12–18 Orbs/day without paying. One 10-pull per week minimum F2P.

### 4d. ESSENCE (upgrade fuel from recycling)
- **What it is:** You get Essence by recycling duplicate pulls or unwanted monsters
- **Spent on:** Star-up system — 3 stars = bigger sprite, new ability unlock, +25% stats
- **Protects against bad luck:** Even a run of bad pulls generates Essence toward a guaranteed star-up

### 4e. RELICS (rare, permanent power)
- **What they are:** Unique artifacts earned from: first-time map clears on Hard, weekly challenge top-10, event rewards
- **Spent on:** Relic Forge — equip up to 3 Relics on your Warden, each granting a global passive (e.g., "+1 unit slot," "possessed units restore 10 HP/sec," "wave 10+ enemies drop double Shards")
- **Never sold or traded** — they feel earned and permanent

---

## 5. MONSTER ROSTER — DESIGN PHILOSOPHY

### 5a. Roster size and pacing
- **Launch:** 48 monsters across 6 rarities
- **Post-launch:** +4 per month via themed events (e.g., "The Deep Sea Breach" adds 4 ocean-themed units)
- **All designs are original.** No generic skeletons or fire golems. Each unit has a name, a 3-line backstory tooltip, and a design brief that makes it visually readable at small sizes (important on mobile).

### 5b. The six rarities
| Rarity | Color | Count (launch) | Obtain via |
|---|---|---|---|
| Common | Grey | 10 | Any pull, first 5 runs |
| Uncommon | Green | 10 | 10-pull, daily quest |
| Rare | Blue | 10 | 10-pull guarantee, Hard clears |
| Epic | Purple | 9 | 40-pull guarantee, events |
| Legendary | Gold | 7 | 80-pull guarantee, story milestones |
| Mythic | Prismatic | 2 | Seasonal events only, not gacha |

### 5c. Monster roles (6 types, color-coded)
1. **Anchors** (bronze frame) — High HP, slow attack, hold the front line. Can be possessed for a powerful taunt that freezes nearby enemies.
2. **Ravagers** (red frame) — Single-target DPS, fast attack. Possessed: burst dash with a hit.
3. **Weavers** (purple frame) — Slow/debuff specialists. Possessed: player aims a web shot that roots a group.
4. **Artillerists** (yellow frame) — AOE splash, long cooldown. Possessed: you drag-aim a mortar arc.
5. **Whispers** (teal frame) — Stealth and ambush; emerge from ground to surprise flankers. Possessed: you choose their emerge timing.
6. **Conduits** (white frame) — Buff/heal adjacent units. Possessed: you direct their aura manually, choosing which ally to supercharge.

### 5d. Sample roster entries (flavor / design intent)

**Gorpax** (Common / Anchor) — "A boulder given legs and a grudge." Big grey rock creature with stubby arms and one enormous flat foot. Slow and chunky. When possessed: stomps and sends a shockwave forward.

**Vix** (Rare / Ravager) — "A fox from the Mirror Dimension who reflects damage back as light." Sleek silver fox with geometric patterns on its fur. Possessed: launches a dash that passes through enemies leaving a mirror shard that deals DOT.

**The Librarian** (Epic / Whisper) — "It reads your enemies' attack patterns before they happen." Tiny creature in an oversized coat carrying a floating book. Possessed: you flip to a page to cast one of three random spells from a book menu.

**Solenne** (Legendary / Conduit) — "A cathedral bell that chose to walk away." Bell-shaped body with golden crack veins, two delicate arms. Possessed: you ring her manually, releasing a healing pulse whose size depends on your tap rhythm (timed mechanic).

---

## 6. MAPS AND LEVEL STRUCTURE

### 6a. Campaign worlds (4 at launch, +2 post-launch)
| World | Theme | Maps | Enemy archetype |
|---|---|---|---|
| **The Crumbling Keep** | Ruined castle | 8 maps | Knights, Archers, Siege weaponry |
| **The Fungal Depths** | Bioluminescent cave | 8 maps | Spore walkers, Mycelium giants, Blind hunters |
| **The Shattered Coast** | Coastal cliffs + ships | 8 maps | Sailors, Sea-monks, Kraken hand-units |
| **The Clockwork District** | Steampunk city | 8 maps | Automata, Engineers, Speed-rollers |

**32 campaign maps at launch.** Each map = 3 modes:
- **Normal:** Baseline. Completing unlocks Hard.
- **Hard:** Faster enemies, 2 extra waves, 1 extra elite per stage. Unlocks Nightmare + grants a permanent passive bonus specific to that map (e.g., "Crumbling Keep 3 Hard: all Anchor units gain +8% HP globally").
- **Nightmare:** Remixed enemy patterns, enemy spells, one unique mechanic per map (e.g., "Enemies that survive 5 seconds gain a shield"). Rewards an exclusive cosmetic or Relic.

That's **96 distinct challenges** at launch — compared to SG's campaign feeling complete quickly.

### 6b. Map structure per run
- 20–35 waves per Normal map (8–14 minutes active)
- 35–50 waves on Hard (14–20 minutes active)
- Every 5th wave = Elite wave (buffed variants, bigger reward)
- Every 10th wave = Mini-boss with a unique mechanic

### 6c. Other modes
- **Endless Rift** — Infinite waves on a rotating map. Leaderboard by wave reached. Seasonal resets.
- **Incursion** — Daily 10-wave challenge, single fixed loadout, 3-star rating. Quick (5–8 mins), great rewards.
- **Relic Hunt** — Weekly special map where specific Relics drop. Only available 48h/week.

---

## 7. THE POSSESS SYSTEM (active play loop)

This is the core design differentiator.

### 7a. How it works
1. You enter a run with up to **6 placed units** on the grid (unlocking more slots is a Warden rank reward).
2. All units auto-attack on AI. You can start a wave and do nothing — it plays out like SG.
3. **Tap any unit** → you inhabit it (0.4s flash animation). The unit's name and HP appear at the top. Its AI switches off.
4. **Move:** Drag anywhere on screen to move the unit. It moves toward your finger at its speed.
5. **Basic attack:** Tap enemies to direct attacks. The unit auto-fires at your tap target.
6. **Special attack:** A button appears (bottom right). Each unit has a unique special. You aim/trigger it manually.
7. **Un-possess:** Tap the unit portrait top-left or tap another unit. AI resumes.

### 7b. Possession bonuses
- **Possession streak:** Staying possessed through a wave without the unit dying gives a streak multiplier. At 3 waves: +10% Shards. At 5 waves: +25%. At 10 waves: +50% and a Shard bomb drop.
- **Combo system:** Manually killing 3 enemies within 2 seconds triggers a Combo Pop — the next enemy killed drops double Shards.
- **Focus gauge** (like the prototype): A global meter that fills while you're possessed. At full, it boosts ALL units +30% damage for 8 seconds, then drains.

### 7c. The idle option is still valid
Players who don't want to possess anything still progress — just ~40% slower per-session. The idle floor is high enough to feel functional, but the active ceiling is high enough to feel rewarding.

---

## 8. IN-RUN SHOP (wave breaks)

Between every 5 waves, a 12-second break opens the **Rift Market** — a little travelling merchant.

- **3 random offers appear.** You buy with Shards.
- Offer types: temporary unit buff (this run only), a reposition token (move 1 placed unit), a consumable spell charge, a "Haste" rune (next wave spawns 1s faster = more Shards/min), or a unit stat swap (switch one on-field unit for one from your roster — no orb cost).
- **The merchant adapts:** If your run is struggling (HP < 50%), he's more likely to offer defensive items. If you're dominating, he tilts toward offense/speed.

This gives you 4–7 meaningful decisions per Normal run. No run feels identical.

---

## 9. SPELLS (active player abilities)

You bring **2 spells** into each run, chosen from your unlocked spell deck before entering.

| Spell | Type | Mechanic |
|---|---|---|
| **Ashfall** | Damage | Tap-drag a line across screen; fire rains along it |
| **Permafrost** | CC | Tap target area; everything in radius frozen for 4s |
| **Rift Tear** | Utility | Opens a second path that enemies can get stuck in for 6s |
| **Overclock** | Buff | All units fire 2x for 6 seconds |
| **Void Pull** | CC | Tap an enemy; it slides backward 3 grid cells |
| **Soul Leech** | Sustain | Drain HP from all on-screen enemies, restore 20 base HP |
| **Mirror Wall** | Block | Places a temporary wall that blocks the path for 8s |
| **Swarm** | Damage | Releases a homing locust cloud that chains between enemies |

Spells have cooldowns (40–90s). They're never "win buttons" — they're accelerants.

Spells are **leveled with Gold** (separate from units). A max-level Ashfall has a shorter cooldown and wider line.

---

## 10. PROGRESSION — MAKING SURE IT ALWAYS MOVES

The SG problem: you can hit a wall and feel like nothing is happening.  
Our solution: **three parallel progress rails** and a **catch-up system**.

### Rail 1 — Monster power
- Level units 1→50 with Gold (cost curve is visible and predictable)
- Star 0→3 with Essence (from recycling dupes, buy with Orbs at bad-luck protection rates)
- Evolution (at 3 stars + specific Relic): unlocks 4th ability and visual upgrade

### Rail 2 — Map mastery
- 32 maps × 3 modes = 96 clears
- Each Hard clear grants a small global permanent bonus
- Nightmare clears grant cosmetics + Relics
- You can always find a map you haven't Hardmoded yet

### Rail 3 — Warden rank
- XP from any activity (waves cleared, daily quests, Incursions, even just opening the game)
- Rank 1→100 (account lifetime level)
- Every rank grants something: a Shard boost, a new spell, +1 monster slot, cosmetic, or Orb

### Catch-up system
- Fail the same map 3× in a row → **Rift Mercy** triggers: 20% HP boost for that map for 24h
- After 7 days of login, you always get 2 free Orbs per day guaranteed
- "Pity runs": after 5 consecutive runs with no new unique unit drop, next run guarantees one from any rarity

---

## 11. SESSION DESIGN — "10-MINUTE LOOP" PRINCIPLE

Every feature is designed so a player can open the game, do something meaningful, and close it in 10 minutes:

| Action | Time | Reward |
|---|---|---|
| Complete a Normal run | 8–14 min | Gold, Shards→Gold, Warden XP, Orb progress |
| Complete an Incursion | 5–8 min | Orbs, Relic dust, daily quest tick |
| Level up 2–3 units | 2 min | Visible stat increase, sometimes triggers Warden rank |
| Collect offline trickle | 30 sec | Small Gold, maybe a Shard cache |
| Spin the daily Rift Portal (1 free pull) | 1 min | Monster or Essence |

**The 10-minute player gets 70% of the progress of the 60-minute player.** The last 30% is for people who genuinely want more content, not a tax for idle waiting.

---

## 12. ACCOUNT SYSTEM

- **Login:** Username/password or Google/Apple sign-in
- **Cross-device sync:** Cloud save per account, real-time (not just on app close)
- **Offline earnings:** Passive trickle calculates from last-seen timestamp on login. Capped at 4 hours of offline time (prevents "set it and forget it" replacing active play).
- **Offline earnings rate:** Scales with Warden rank, so veteran players still benefit without grinding.
- **Session continuity:** If a run is interrupted (call, close app), it saves mid-run state. You resume exactly where you were.

---

## 13. ART DIRECTION

SG's cartoon style is correct for this genre. We keep colorful + readable + slightly irreverent, but push the designs to be more **dimensionally varied** — SG's units can look samey at small scale. Our design rules:

- **Silhouette first**: Every unit must be identifiable by silhouette alone at 64×64 pixels
- **3 design pillars per unit**: A strong shape (round/spiky/angular), a signature color (1 dominant, 1 accent), and one "weird" detail that makes it memorable (e.g., Gorpax has a tiny flower growing from his shoulder he refuses to acknowledge)
- **Enemies are humans** (guards, knights, mages, adventurers) — this keeps the "you're the monster defending against intruders" tone clear and funny
- **No generic color-swap reskins** as "new" characters. If a Legendary looks like an upgraded Common, that's a failure.

---

## 14. MONETIZATION (F2P done right)

- **No ads shown during gameplay.** Opt-in ads in the lobby for a bonus Orb or Gold cache (max 3/day)
- **Battle Pass** (monthly, $4.99): Gives ~40% more Orbs over the month, 1 exclusive cosmetic skin, 2 early event unlocks. Does NOT give power, only collection pace
- **Orb packs** (IAP): Offered but never pressure-sold. No timers on the screen during play
- **No energy system.** Runs are free to start anytime. Play as much as you want
- **No pay-to-win stat buyouts.** Paid players get more cosmetics and collection pace, not a stat wall

---

## 15. BUILD ROADMAP

### Phase 0 — Vertical Slice (prototype)
✅ Prototype already built (the UPLINK demo):
- Core possess mechanic (hero control), tower auto-play, focus meter, account save
- This proves the active/idle split works

### Phase 1 — Core Loop (8–12 weeks)
- 10 monsters (2 per role), 5 maps (one world), 3 spells
- In-run shop with 3 offer types
- Gold + Orbs + Essence implemented
- Possess system fully built with combo feedback

### Phase 2 — Depth (6–8 weeks)
- Full launch roster (48 monsters)
- All 4 worlds (32 maps)
- All spell types
- Warden rank system
- Relics (10 at launch)

### Phase 3 — Live ops (ongoing)
- Monthly event with 4 new monsters
- Incursion mode
- Endless Rift + seasonal leaderboards
- Battle Pass

### Tech stack recommendation
- **Engine:** Unity (best mobile TD precedent, good 2D pipeline, C2DX is also viable)
- **Backend:** Firebase for account/cloud save, leaderboards via PlayFab or GameSparks
- **Art pipeline:** Vector-first (Adobe Illustrator → exported sprite sheets) so units scale cleanly across screen sizes
- **Multiplayer:** Not at launch. Consider co-op Relic Hunts in Phase 4.

---

## 16. WHAT MAKES THIS DIFFERENT IN ONE SENTENCE

*Summoners Greed made collecting feel good but playing feel pointless — Rift Warden makes collecting feel good and playing feel like the actual game.*

---
*Document version 0.1 — July 2026*
*Next: Phase 1 sprint breakdown + monster design sheet template*
