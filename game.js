'use strict';
/* ============================================================
   GAME.JS — Rift Warden core engine
   ============================================================ */

// ================================================================
// CONSTANTS
// ================================================================
const CELL   = 60;
const COLS   = 16;
const ROWS   = 9;
const CW     = COLS * CELL; // 960
const CH     = ROWS * CELL; // 540

const ACTIVE_WINDOW_MS   = 5000;
const FOCUS_RAMP_SEC     = 10;
const FOCUS_DRAIN_SEC    = 0.5;
const FOCUS_MAX_BONUS    = 2.5;
const IDLE_TRICKLE       = 0.3;   // gold/sec while idle
const HERO_GOLD_MULT     = 2.0;   // bonus when you possess
const MAX_OFFLINE_SEC    = 4*3600;
const WAVE_BREAK_MS      = 3000;
const SHOP_EVERY_WAVES   = 5;

// ================================================================
// GLOBAL STATE
// ================================================================
let SAVE = initSave();
let RUN  = null;  // active run state
let currentScreen = 'screen-login';
let activeMapId   = null;
let toastTimer    = null;
let viewedMonster = null;

// Pre-run selections
let prerunUnits  = [];  // [monsterId, ...]
let prerunSpells = [];  // [spellId, ...]

// Canvas
const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');
canvas.width  = CW;
canvas.height = CH;

let lastFrame = 0;
let rafId = null;

// ================================================================
// SAVE / LOAD
// ================================================================
function initSave() {
  return {
    username: '', gold: 200, orbs: 15, essence: 0, crystals: 0,
    wardenRank: 1, wardenXP: 0,
    pullPity: 0,
    collection: {
      gorpax: { level:1, stars:0, owned:true  },
      buzz:   { level:1, stars:0, owned:true  },
      splotch:{ level:1, stars:0, owned:true  },
      pip:    { level:1, stars:0, owned:false },
      noctis: { level:1, stars:0, owned:false },
      mirrek: { level:1, stars:0, owned:false },
      vix:    { level:1, stars:0, owned:false },
      zara:   { level:1, stars:0, owned:false },
      thornback:{ level:1, stars:0, owned:false },
      kalux:  { level:1, stars:0, owned:false },
      librarian:{ level:1, stars:0, owned:false },
      solenne:{ level:1, stars:0, owned:false }
    },
    spellLevels: { ashfall:1, permafrost:1, overclock:1, voidpull:1, soulleech:1, mirrorwall:1 },
    mapProgress: {},
    relics: [],
    bestWaves: {},
    totalRuns: 0,
    lastSeen: Date.now(),
    settings: {}
  };
}

function saveToDB() {
  if (!SAVE.username) return;
  try {
    localStorage.setItem('rw:save:' + SAVE.username, JSON.stringify(SAVE));
  } catch(e) { console.warn('Save failed (storage full?):', e); }
}

async function loadFromDB(username) {
  try {
    const raw = localStorage.getItem('rw:save:' + username);
    if (raw) {
      const loaded = JSON.parse(raw);
      return Object.assign(initSave(), loaded);
    }
  } catch(e) {}
  return null;
}

// ================================================================
// SCREEN ROUTING
// ================================================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  currentScreen = id;

  if (id === 'screen-hub')       refreshHub();
  if (id === 'screen-roster')    renderRoster('all');
  if (id === 'screen-mapselect') renderMapSelect();
}

// ================================================================
// LOGIN
// ================================================================
document.getElementById('login-btn').addEventListener('click', doLogin);
document.getElementById('login-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

async function doLogin() {
  let name = document.getElementById('login-name').value.trim();
  if (!name) name = 'Warden' + Math.floor(Math.random() * 9000 + 1000);
  name = name.slice(0, 18);

  const existing = await loadFromDB(name);
  if (existing) {
    SAVE = existing;
    const offSec = Math.min(MAX_OFFLINE_SEC, Math.max(0, (Date.now() - (SAVE.lastSeen||Date.now())) / 1000));
    const idleRate = IDLE_TRICKLE * (1 + SAVE.wardenRank * 0.05);
    const earned = Math.floor(idleRate * offSec);
    SAVE.gold += earned;
    SAVE.lastSeen = Date.now();
    saveToDB();
    if (earned > 0) showToast(`Welcome back, ${name}! Your defenders earned +${earned} Gold while you were away.`, 5000);
    else showToast(`Rift link re-established, ${name}.`, 2500);
  } else {
    SAVE.username = name;
    SAVE.lastSeen = Date.now();
    saveToDB();
    showToast(`New Warden registered: ${name}`, 2500);
  }

  SAVE.username = name;
  document.getElementById('hub-username').textContent = name;
  showScreen('screen-hub');
}

// ================================================================
// HUB
// ================================================================
function refreshHub() {
  document.getElementById('hub-username').textContent = SAVE.username;
  document.getElementById('hud-gold').textContent    = Math.floor(SAVE.gold);
  document.getElementById('hud-orbs').textContent    = SAVE.orbs;
  document.getElementById('hud-essence').textContent = SAVE.essence;
  document.getElementById('hud-crystals').textContent= SAVE.crystals;
  document.getElementById('hub-rank-num').textContent= SAVE.wardenRank;

  const xpNeeded = rankXPNeeded(SAVE.wardenRank);
  document.getElementById('hub-rank-xp').textContent = `${SAVE.wardenXP} / ${xpNeeded} XP`;
  document.getElementById('hub-rank-fill').style.width = Math.min(100, SAVE.wardenXP / xpNeeded * 100) + '%';

  const ownedCount = Object.values(SAVE.collection).filter(c => c.owned).length;
  document.getElementById('hub-roster-count').textContent = `${ownedCount} / ${Object.keys(SAVE.collection).length} monsters`;
  document.getElementById('hub-relic-count').textContent  = `${SAVE.relics.length} Relics`;

  const daily = document.getElementById('daily-info');
  daily.innerHTML = `<b>Daily:</b> Free 10-pull available · Active sessions earn 3× vs idle · Best wave: ${Math.max(...Object.values(SAVE.bestWaves||{0:0}),0) || '—'}`;
}

function rankXPNeeded(rank) { return Math.floor(200 * Math.pow(1.35, rank - 1)); }

function grantXP(amount) {
  SAVE.wardenXP += amount;
  const needed = rankXPNeeded(SAVE.wardenRank);
  if (SAVE.wardenXP >= needed) {
    SAVE.wardenXP -= needed;
    SAVE.wardenRank++;
    showToast(`🏆 Warden Rank ${SAVE.wardenRank} reached!`, 3500);
  }
}

// ================================================================
// PORTAL (GACHA)
// ================================================================
function openPortal() {
  document.getElementById('portal-orbs').textContent = SAVE.orbs;
  document.getElementById('portal-pity').textContent = SAVE.pullPity;
  document.getElementById('portal-result').classList.add('hidden');
  document.getElementById('overlay-portal').classList.remove('hidden');
}
function closePortal() {
  document.getElementById('overlay-portal').classList.add('hidden');
  refreshHub();
}

function doPull(count) {
  const cost = count === 1 ? 10 : 90;
  if (SAVE.orbs < cost) { showToast('Not enough Orbs!', 2000); return; }
  SAVE.orbs -= cost;

  const results = [];
  for (let i = 0; i < count; i++) {
    SAVE.pullPity++;
    const mId = getRandomPull(SAVE.pullPity);
    const def  = MONSTER_DEFS[mId];
    const col  = SAVE.collection[mId];
    let isNew  = false;
    if (!col.owned) { col.owned = true; isNew = true; SAVE.pullPity = 0; }
    else { SAVE.essence += rarityEssence(def.rarity); }
    if (['rare','epic','legendary'].includes(def.rarity)) SAVE.pullPity = 0;
    results.push({ def, isNew });
  }

  const resultEl = document.getElementById('portal-result');
  resultEl.classList.remove('hidden');
  resultEl.innerHTML = '';
  for (const r of results) {
    const row = document.createElement('div');
    row.className = 'pull-item';
    const c = document.createElement('canvas');
    c.width = 48; c.height = 48;
    drawMonsterOnCanvas(c.getContext('2d'), r.def, 24, 24, 20);
    const info = document.createElement('div');
    info.className = 'pull-item-info';
    info.innerHTML = `<div class="pull-item-name">${r.def.name}${r.isNew ? ' <span style="color:var(--green)">NEW!</span>' : ''}</div>
      <div class="pull-item-rarity rarity-${r.def.rarity}">${cap(r.def.rarity)}${!r.isNew ? ` → +${rarityEssence(r.def.rarity)} Essence` : ''}</div>`;
    row.appendChild(c); row.appendChild(info);
    resultEl.appendChild(row);
  }
  document.getElementById('portal-orbs').textContent = SAVE.orbs;
  document.getElementById('portal-pity').textContent = SAVE.pullPity;
  saveToDB();
}
function rarityEssence(r) { return { common:1, uncommon:3, rare:8, epic:20, legendary:50 }[r] || 1; }

// ================================================================
// FORGE (stub)
// ================================================================
function openForge() {
  if (SAVE.wardenRank < 5) { showToast('Relic Forge unlocks at Warden Rank 5. Keep playing!', 2800); return; }
  const msg = SAVE.relics.length === 0
    ? 'No Relics yet — clear maps on Hard mode to earn them.'
    : 'Relics: ' + SAVE.relics.map(id => RELIC_DEFS[id]?.name || id).join(', ');
  showToast(msg, 3500);
}

// ================================================================
// ROSTER
// ================================================================
let currentRosterFilter = 'all';
function filterRoster(role, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentRosterFilter = role;
  renderRoster(role);
}

function renderRoster(roleFilter) {
  const grid = document.getElementById('roster-grid');
  grid.innerHTML = '';
  const list = Object.values(MONSTER_DEFS)
    .filter(m => roleFilter === 'all' || m.role === roleFilter);

  for (const m of list) {
    const col  = SAVE.collection[m.id];
    const owned = col && col.owned;
    const card = document.createElement('div');
    card.className = 'roster-card' + (owned ? '' : ' locked');
    card.onclick = () => openMonsterDetail(m.id);

    const c = document.createElement('canvas');
    c.width = 70; c.height = 70;
    drawMonsterOnCanvas(c.getContext('2d'), m, 35, 35, 28, owned ? 1 : 0.35);
    card.appendChild(c);

    const rarityDot = document.createElement('div');
    rarityDot.className = 'roster-card-rarity';
    rarityDot.style.background = rarityColor(m.rarity);
    card.appendChild(rarityDot);

    const name = document.createElement('div');
    name.className = 'roster-card-name';
    name.textContent = m.name;
    card.appendChild(name);

    const role = document.createElement('div');
    role.className = `roster-card-role role-${m.role}`;
    role.textContent = cap(m.role);
    card.appendChild(role);

    if (owned) {
      const stars = document.createElement('div');
      stars.className = 'roster-card-stars';
      for (let i = 0; i < 3; i++) {
        const s = document.createElement('span');
        s.className = 'roster-star' + (i < (col.stars||0) ? ' lit' : '');
        s.textContent = '★';
        stars.appendChild(s);
      }
      card.appendChild(stars);
    } else {
      const lock = document.createElement('div');
      lock.style.cssText = 'font-size:11px;color:var(--text-dim)';
      lock.textContent = '🔒 Locked';
      card.appendChild(lock);
    }

    grid.appendChild(card);
  }
}

// ================================================================
// MONSTER DETAIL OVERLAY
// ================================================================
function openMonsterDetail(mId) {
  viewedMonster = mId;
  const m   = MONSTER_DEFS[mId];
  const col = SAVE.collection[mId];
  const owned = col && col.owned;

  const dc  = document.getElementById('monster-detail-canvas');
  dc.width = 120; dc.height = 120;
  drawMonsterOnCanvas(dc.getContext('2d'), m, 60, 60, 48, owned ? 1 : 0.4);

  const info = document.getElementById('monster-detail-info');
  const lv   = col ? col.level : 1;
  const upgCost = monsterUpgradeCost(mId);
  const scaledHp  = Math.floor(m.hp * (1 + lv * 0.12));
  const scaledDmg = Math.floor(m.damage * (1 + lv * 0.10));

  info.innerHTML = `
    <div class="monster-detail-name">${m.name}</div>
    <div class="monster-detail-role rarity-${m.rarity} role-${m.role}">${cap(m.rarity)} · ${cap(m.role)}</div>
    <div class="monster-detail-desc">"${m.desc}"</div>
    <div class="monster-detail-stats">
      <div class="detail-stat"><span>Level</span><b>${lv}</b></div>
      <div class="detail-stat"><span>HP</span><b>${scaledHp}</b></div>
      <div class="detail-stat"><span>Damage</span><b>${scaledDmg}</b></div>
      <div class="detail-stat"><span>Range</span><b>${m.range}px</b></div>
      <div class="detail-stat"><span>Atk Speed</span><b>${(1000/m.atkSpeed).toFixed(1)}/s</b></div>
      <div class="detail-stat"><span>Special</span><b>${m.special.name}</b></div>
      <div class="detail-stat" style="color:var(--text-muted);font-size:10px"><span colspan="2">${m.special.desc}</span></div>
    </div>`;

  document.getElementById('upgrade-cost').textContent = upgCost;
  document.getElementById('monster-upgrade-btn').disabled = !owned || SAVE.gold < upgCost;
  document.getElementById('overlay-monster').classList.remove('hidden');
}
function closeMonsterDetail() {
  document.getElementById('overlay-monster').classList.add('hidden');
  viewedMonster = null;
}
function upgradeMonster() {
  if (!viewedMonster) return;
  const cost = monsterUpgradeCost(viewedMonster);
  if (SAVE.gold < cost) { showToast('Not enough Gold!', 2000); return; }
  SAVE.gold -= cost;
  SAVE.collection[viewedMonster].level++;
  grantXP(20);
  saveToDB();
  openMonsterDetail(viewedMonster); // refresh
  refreshHub();
  showToast(`${MONSTER_DEFS[viewedMonster].name} upgraded to level ${SAVE.collection[viewedMonster].level}!`, 2500);
}
function monsterUpgradeCost(mId) {
  const lv = SAVE.collection[mId]?.level || 1;
  return Math.floor(50 * Math.pow(1.4, lv - 1));
}

// ================================================================
// MAP SELECT
// ================================================================
function renderMapSelect() {
  const list = document.getElementById('map-list');
  list.innerHTML = '';
  for (const map of Object.values(MAP_DEFS)) {
    const prog = SAVE.mapProgress[map.id] || {};
    const locked = map.locked && !(prog.normalCleared);
    const card = document.createElement('div');
    card.className = 'map-card';
    if (locked) card.style.opacity = '0.5';
    card.innerHTML = `
      <div class="map-card-icon">${map.icon}</div>
      <div class="map-card-body">
        <div class="map-card-title">${map.name}</div>
        <div class="map-card-world">${map.world}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${map.desc}</div>
        <div class="map-card-progress">
          <span class="mode-badge ${prog.normalCleared?'cleared':''}">Normal${prog.normalCleared?' ✓':''}</span>
          <span class="mode-badge ${prog.hardCleared?'cleared':''}">Hard${prog.hardCleared?' ✓':''}</span>
          <span class="mode-badge ${prog.nightmareCleared?'cleared':''}">Nightmare${prog.nightmareCleared?' ✓':''}</span>
        </div>
      </div>`;
    if (!locked) {
      card.style.cursor = 'pointer';
      card.onclick = () => openPreRun(map.id);
    } else {
      card.title = 'Clear Normal mode to unlock';
    }
    list.appendChild(card);
  }
}

// ================================================================
// PRE-RUN (LOADOUT)
// ================================================================
function openPreRun(mapId) {
  activeMapId  = mapId;
  prerunUnits  = [];
  prerunSpells = [];
  const map = MAP_DEFS[mapId];
  document.getElementById('prerun-title').textContent = map.name;

  // Unit grid
  const uGrid = document.getElementById('prerun-unit-grid');
  uGrid.innerHTML = '';
  const owned = Object.values(MONSTER_DEFS).filter(m => SAVE.collection[m.id]?.owned);
  for (const m of owned) {
    const card = document.createElement('div');
    card.className = 'prerun-unit-card';
    card.dataset.id = m.id;
    const c = document.createElement('canvas');
    c.width = 52; c.height = 52;
    drawMonsterOnCanvas(c.getContext('2d'), m, 26, 26, 22);
    card.appendChild(c);
    const nm = document.createElement('div');
    nm.className = 'prerun-unit-name';
    nm.textContent = m.name;
    card.appendChild(nm);
    card.onclick = () => togglePrerunUnit(m.id, card);
    uGrid.appendChild(card);
  }

  // Spell grid
  const sGrid = document.getElementById('prerun-spell-grid');
  sGrid.innerHTML = '';
  for (const sp of Object.values(SPELL_DEFS)) {
    const card = document.createElement('div');
    card.className = 'prerun-spell-card';
    card.dataset.id = sp.id;
    card.innerHTML = `<div class="prerun-spell-icon">${sp.icon}</div>
      <div class="prerun-spell-name">${sp.name}</div>
      <div class="prerun-spell-desc">${sp.desc}</div>`;
    card.onclick = () => togglePrerunSpell(sp.id, card);
    sGrid.appendChild(card);
  }

  refreshPrerunSlots();
  showScreen('screen-prerun');
}

function togglePrerunUnit(id, card) {
  if (prerunUnits.includes(id)) {
    prerunUnits = prerunUnits.filter(u => u !== id);
    card.classList.remove('selected');
  } else {
    if (prerunUnits.length >= 4) { showToast('Maximum 4 units per run.', 1800); return; }
    prerunUnits.push(id);
    card.classList.add('selected');
  }
  refreshPrerunSlots();
}

function togglePrerunSpell(id, card) {
  if (prerunSpells.includes(id)) {
    prerunSpells = prerunSpells.filter(s => s !== id);
    card.classList.remove('selected');
  } else {
    if (prerunSpells.length >= 2) { showToast('Maximum 2 spells per run.', 1800); return; }
    prerunSpells.push(id);
    card.classList.add('selected');
  }
  refreshPrerunSlots();
}

function refreshPrerunSlots() {
  const uRow = document.getElementById('prerun-selected-units');
  uRow.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const slot = document.createElement('div');
    if (i < prerunUnits.length) {
      const m = MONSTER_DEFS[prerunUnits[i]];
      slot.className = 'prerun-slot filled';
      const c = document.createElement('canvas');
      c.width = 40; c.height = 40;
      drawMonsterOnCanvas(c.getContext('2d'), m, 20, 20, 17);
      slot.appendChild(c);
    } else {
      slot.className = 'prerun-slot';
      slot.textContent = (i+1);
    }
    uRow.appendChild(slot);
  }

  const sRow = document.getElementById('prerun-selected-spells');
  sRow.innerHTML = '';
  for (let i = 0; i < 2; i++) {
    const slot = document.createElement('div');
    if (i < prerunSpells.length) {
      const sp = SPELL_DEFS[prerunSpells[i]];
      slot.className = 'prerun-slot filled';
      slot.style.fontSize = '24px';
      slot.textContent = sp.icon;
    } else {
      slot.className = 'prerun-slot';
      slot.textContent = (i+1);
    }
    sRow.appendChild(slot);
  }

  const btn = document.getElementById('start-run-btn');
  btn.disabled = prerunUnits.length === 0;
}

// ================================================================
// START RUN
// ================================================================
function startRun() {
  if (prerunUnits.length === 0) { showToast('Pick at least 1 unit!', 1800); return; }
  if (prerunSpells.length === 0) prerunSpells = [Object.keys(SPELL_DEFS)[0]]; // default spell

  const map = MAP_DEFS[activeMapId];
  const pathPx = buildPath(map.waypoints);
  const pathSet = buildPathSet(map.waypoints);

  RUN = {
    mapId: activeMapId,
    mapDef: map,
    wave: 0,
    phase: 'intermission', // 'intermission' | 'wave' | 'shop'
    shards: 0,
    goldEarned: 0,
    baseHP: 100 + (SAVE.relics.includes('life_stone') ? 20 : 0),
    baseMaxHP: 100 + (SAVE.relics.includes('life_stone') ? 20 : 0),
    enemies: [],
    units: [],          // placed PlacedUnit objects
    teamDefs: prerunUnits.map(id => MONSTER_DEFS[id]),
    equippedSpells: prerunSpells.map(id => ({ def: SPELL_DEFS[id], currentCd: 0 })),
    particles: [],
    effects: [],
    pathPx,
    pathSet,
    possessedIdx: -1,   // index into RUN.units
    possessTarget: null,// { x, y } pixel
    spawnQueue: [],
    spawnTimer: 0,
    waveEndTimer: 0,
    focusMeter: 0,
    lastInputTime: 0,
    combo: 0,
    comboTimer: 0,
    runDmgMult: 1,
    runSpdMult: 1,
    hasteActive: false,
    essenceLure: false,
    repositionTokens: 0,
    repositionSource: null,  // unit index being repositioned
    placingUnitIdx: -1,      // team index being placed (-1 = not placing)
    overclockTimer: 0,
    mirrorWalls: [],
    score: 0
  };

  buildGameUI();
  showScreen('screen-game');
  document.getElementById('overlay-result').classList.add('hidden');
  document.getElementById('overlay-shop').classList.add('hidden');

  if (rafId) cancelAnimationFrame(rafId);
  lastFrame = 0;
  rafId = requestAnimationFrame(loop);

  // Show wave banner then start wave 1
  setTimeout(() => beginNextWave(), 400);
}

// ================================================================
// BUILD GAME UI (team bar + spells)
// ================================================================
function buildGameUI() {
  // Team bar
  const teamBar = document.getElementById('team-bar');
  teamBar.innerHTML = '';
  RUN.teamDefs.forEach((m, i) => {
    const slot = document.createElement('div');
    slot.className = 'team-slot has-monster';
    slot.id = 'team-slot-' + i;
    const c = document.createElement('canvas');
    c.width = 36; c.height = 36;
    drawMonsterOnCanvas(c.getContext('2d'), m, 18, 18, 15);
    slot.appendChild(c);
    const lbl = document.createElement('div');
    lbl.className = 'team-slot-label';
    lbl.textContent = m.name.slice(0,5);
    slot.appendChild(lbl);
    slot.onclick = () => onTeamSlotClick(i);
    teamBar.appendChild(slot);
  });

  // Spell bar
  const spellBar = document.getElementById('spell-bar');
  spellBar.innerHTML = '';
  RUN.equippedSpells.forEach((es, i) => {
    const btn = document.createElement('button');
    btn.className = 'spell-btn ready';
    btn.id = 'spell-btn-' + i;
    btn.innerHTML = `<span class="spell-icon">${es.def.icon}</span>
      <span>${es.def.name}</span>
      <div class="spell-cd-overlay" id="spell-cd-${i}"></div>`;
    btn.onclick = () => castSpell(i);
    spellBar.appendChild(btn);
  });
}

// ================================================================
// WAVE MANAGEMENT
// ================================================================
function beginNextWave() {
  RUN.wave++;
  const map   = RUN.mapDef;
  const total = map.normalWaves;
  RUN.phase = 'wave';
  document.getElementById('hud-wave').textContent = RUN.wave;

  showWaveBanner(`WAVE ${RUN.wave}`, 1500);

  // Build spawn queue
  const pool = map.normalEnemyPool;
  const count = Math.min(4 + RUN.wave * 2, 35);
  RUN.spawnQueue = [];

  for (let i = 0; i < count; i++) {
    // Every 5th wave: add an elite
    if (RUN.wave % 5 === 0 && i === Math.floor(count / 2)) {
      RUN.spawnQueue.push(ENEMY_DEFS[map.eliteType]);
    } else if (RUN.wave === total) {
      // Last wave: boss
      if (i === 0) RUN.spawnQueue.push(ENEMY_DEFS[map.bossType]);
      else {
        const eId = pool[Math.floor(Math.random() * pool.length)];
        RUN.spawnQueue.push(ENEMY_DEFS[eId]);
      }
    } else {
      // Weight toward harder enemies as waves progress
      const bias = Math.min(pool.length - 1, Math.floor(RUN.wave / 5));
      const idx  = Math.min(pool.length - 1, Math.floor(Math.random() * (bias + 1) + Math.random() * pool.length / 2));
      const eId  = pool[Math.min(idx, pool.length-1)];
      RUN.spawnQueue.push(ENEMY_DEFS[eId]);
    }
  }

  RUN.spawnTimer = RUN.hasteActive ? 400 : 650;
  RUN.waveEndTimer = 0;
  RUN.hasteActive = false;
}

function checkWaveComplete() {
  if (RUN.phase !== 'wave') return;
  if (RUN.spawnQueue.length > 0) return;
  if (RUN.enemies.length > 0) return;

  RUN.phase = 'intermission';
  const isShopWave = RUN.wave % SHOP_EVERY_WAVES === 0;
  const bonus = Math.floor(20 + RUN.wave * 3);
  RUN.shards += bonus;
  showWaveBanner(`Wave ${RUN.wave} cleared! +${bonus} Shards`, 2000);

  SAVE.bestWaves[activeMapId] = Math.max(SAVE.bestWaves[activeMapId]||0, RUN.wave);

  grantXP(5 + RUN.wave);
  saveToDB();

  const maxWaves = RUN.mapDef.normalWaves;

  setTimeout(() => {
    if (RUN.wave >= maxWaves) {
      triggerVictory();
    } else if (isShopWave) {
      openShop();
    } else {
      beginNextWave();
    }
  }, 2200);
}

// ================================================================
// SHOP
// ================================================================
function openShop() {
  RUN.phase = 'shop';
  // Generate 3 random offers
  const pool = [...SHOP_OFFER_DEFS];
  shuffle(pool);
  const offers = pool.slice(0, 3);

  document.getElementById('shop-wave').textContent  = RUN.wave;
  document.getElementById('shop-shards-val').textContent = Math.floor(RUN.shards);

  const offerEl = document.getElementById('shop-offers');
  offerEl.innerHTML = '';
  offers.forEach((offer, i) => {
    const div = document.createElement('div');
    div.className = 'shop-offer';
    div.innerHTML = `
      <div class="shop-offer-icon">${offer.icon}</div>
      <div class="shop-offer-body">
        <div class="shop-offer-name">${offer.name}</div>
        <div class="shop-offer-desc">${offer.desc}</div>
      </div>
      <div class="shop-offer-cost">▲ ${offer.cost}</div>`;
    div.onclick = () => buyOffer(i, offer, div);
    offerEl.appendChild(div);
  });

  document.getElementById('overlay-shop').classList.remove('hidden');
}

function buyOffer(i, offer, el) {
  if (el.classList.contains('purchased')) return;
  if (RUN.shards < offer.cost) { showToast('Not enough Shards!', 1800); return; }
  RUN.shards -= offer.cost;
  offer.apply(RUN);
  el.classList.add('purchased');
  el.style.opacity = '0.5';
  document.getElementById('shop-shards-val').textContent = Math.floor(RUN.shards);
}

function closeShop() {
  document.getElementById('overlay-shop').classList.add('hidden');
  beginNextWave();
}

// ================================================================
// SPELLS
// ================================================================
let spellAiming = null; // { spellIdx, type }

function castSpell(idx) {
  const es = RUN.equippedSpells[idx];
  if (!es || es.currentCd > 0) return;

  const sp = es.def;
  if (sp.type === 'buff' || sp.type === 'drain') {
    executeSpell(idx, null);
  } else {
    // Need aim
    spellAiming = { idx };
    showToast(`${sp.icon} ${sp.name}: tap a point on the battlefield`, 2000);
    canvas.style.cursor = 'crosshair';
  }
}

function executeSpell(idx, pt) {
  const es = RUN.equippedSpells[idx];
  const sp = es.def;
  es.currentCd = sp.cooldown;
  spellAiming = null;

  switch (sp.type) {
    case 'buff': {
      if (sp.id === 'overclock') {
        RUN.overclockTimer = sp.duration;
        addFloatText(CW/2, CH/2-60, '⚡ OVERCLOCK!', '#FFFF00', 1.5);
      }
      break;
    }
    case 'drain': {
      let totalDrain = 0;
      for (const en of RUN.enemies) {
        const dmg = Math.min(en.hp, sp.drainPerEnemy);
        damageEnemy(en, dmg, 'spell');
        totalDrain += dmg;
      }
      RUN.baseHP = Math.min(RUN.baseMaxHP, RUN.baseHP + sp.baseHpRestore);
      addFloatText(CW/2, CH/2-40, `+${sp.baseHpRestore} BASE HP`, '#CC44CC', 1.4);
      break;
    }
    case 'line': {
      if (!pt) return;
      // Ashfall: damage line (use click point as center, horizontal)
      spawnEffect({ type:'line', x:0, y:pt.y, width:CW, height:40, color:sp.color, life:1, maxLife:1 });
      for (const en of [...RUN.enemies]) {
        if (Math.abs(en.y - pt.y) < 30) damageEnemy(en, sp.damage, 'spell');
      }
      break;
    }
    case 'aoe': {
      if (!pt) return;
      const r = 90;
      spawnEffect({ type:'circle', x:pt.x, y:pt.y, radius:r, color:sp.color, life:1, maxLife:1 });
      for (const en of [...RUN.enemies]) {
        const dx = en.x-pt.x, dy = en.y-pt.y;
        if (dx*dx+dy*dy <= r*r) { en.frozen = sp.freezeDuration; }
      }
      break;
    }
    case 'target': {
      if (!pt) return;
      // Find closest enemy to tap
      let best = null, bestD = 99999;
      for (const en of RUN.enemies) {
        const d = dist(en.x, en.y, pt.x, pt.y);
        if (d < bestD) { bestD = d; best = en; }
      }
      if (best && bestD < 80) {
        // Push back: reduce seg progress
        best.seg = Math.max(0, best.seg - 3);
        best.x = RUN.pathPx[best.seg].x;
        best.y = RUN.pathPx[best.seg].y;
        spawnEffect({ type:'pulse', x:best.x, y:best.y, radius:50, color:sp.color, life:1, maxLife:1 });
        addFloatText(best.x, best.y-20, 'VOID PULL!', sp.color, 1.2);
      } else {
        showToast('No enemy close enough to that point.', 1600);
        es.currentCd = 0; // refund
      }
      break;
    }
    case 'wall': {
      if (!pt) return;
      const col = Math.floor(pt.x / CELL), row = Math.floor(pt.y / CELL);
      RUN.mirrorWalls.push({ col, row, timer: sp.duration });
      break;
    }
  }
}

// ================================================================
// POSSESS SYSTEM
// ================================================================
function possessUnit(unitIdx) {
  if (unitIdx < 0 || unitIdx >= RUN.units.length) return;
  RUN.possessedIdx = unitIdx;
  RUN.lastInputTime = performance.now();
  updatePossessUI();
}

function releasePossess() {
  RUN.possessedIdx = -1;
  updatePossessUI();
}

function updatePossessUI() {
  const bar = document.getElementById('possess-bar');
  if (RUN.possessedIdx >= 0 && RUN.possessedIdx < RUN.units.length) {
    const u = RUN.units[RUN.possessedIdx];
    bar.classList.remove('hidden');
    document.getElementById('possess-name').textContent = u.def.name;
    const specialDef = u.def.special;
    document.getElementById('possess-special-name').textContent = specialDef.name;
    updateSpecialCD(u);
  } else {
    bar.classList.add('hidden');
  }
  // Update team slots
  RUN.units.forEach((u, i) => {
    const slot = document.getElementById('team-slot-' + teamDefIndex(u));
    if (slot) {
      slot.classList.toggle('possessed', i === RUN.possessedIdx);
    }
  });
}

function updateSpecialCD(u) {
  const btn = document.getElementById('possess-special-btn');
  const cdEl = document.getElementById('possess-special-cd');
  if (u.specialCd <= 0) {
    btn.classList.add('ready');
    cdEl.textContent = 'READY';
  } else {
    btn.classList.remove('ready');
    cdEl.textContent = (u.specialCd/1000).toFixed(1)+'s';
  }
}

function triggerSpecial() {
  if (RUN.possessedIdx < 0) return;
  const u = RUN.units[RUN.possessedIdx];
  if (u.specialCd > 0) return;
  u.specialCd = u.def.special.cd;

  const sp = u.def;
  switch (sp.id) {
    case 'gorpax':
      aoeAttack(u.x, u.y, 120, 40, 'unit');
      spawnEffect({ type:'pulse', x:u.x, y:u.y, radius:120, color:'#8B9BB4', life:1, maxLife:1 });
      freezeInRadius(u.x, u.y, 100, 1500);
      break;
    case 'buzz':
      dashAttack(u, 180);
      break;
    case 'splotch':
      aoeAttack(u.x, u.y, 100, 0, 'unit'); // no damage, just slow
      for (const en of RUN.enemies) {
        if (dist(en.x,en.y,u.x,u.y) < 100) en.frozen = (en.frozen||0) + 4000;
      }
      spawnEffect({ type:'pulse', x:u.x, y:u.y, radius:100, color:'#7CCD7C', life:1, maxLife:1 });
      break;
    case 'pip':
      buffNearbyAllies(u, 80, 1.8, 5000);
      spawnEffect({ type:'pulse', x:u.x, y:u.y, radius:80, color:'#FFE8A3', life:1, maxLife:1 });
      break;
    case 'noctis':
      u.stealthTimer = 3000;
      u.stealthBuff  = true;
      break;
    case 'mirrek':
      for (let a = -60; a <= 60; a += 30) {
        const rad = a * Math.PI / 180;
        spawnProjectile(u.x, u.y, Math.cos(rad)*200, Math.sin(rad)*200, 25, '#CD853F', 'unit');
      }
      break;
    case 'vix':
      dashAttack(u, 220, 2);
      break;
    case 'zara':
      aoeAttack(u.x, u.y, 130, 0, 'unit');
      freezeInRadius(u.x, u.y, 130, 3000);
      spawnEffect({ type:'pulse', x:u.x, y:u.y, radius:130, color:'#DA70D6', life:1, maxLife:1 });
      break;
    case 'thornback':
      u.shieldTimer = 4000;
      spawnEffect({ type:'pulse', x:u.x, y:u.y, radius:60, color:'#556B2F', life:1, maxLife:1 });
      break;
    case 'kalux':
      // Mega mortar: AOE at possess target or nearest enemy
      const tgt = RUN.possessTarget || nearestEnemyPos(u.x, u.y) || {x:u.x, y:u.y-150};
      aoeAttack(tgt.x, tgt.y, 100, 80, 'unit');
      spawnEffect({ type:'circle', x:tgt.x, y:tgt.y, radius:100, color:'#20B2AA', life:1, maxLife:1 });
      break;
    case 'librarian':
      // 3 homing pages
      for (const en of RUN.enemies.slice(0,3)) {
        spawnHomingProjectile(u.x, u.y, en, 15, '#B8860B', 'unit', 2000);
      }
      break;
    case 'solenne':
      const healPer = 8;
      for (const pu of RUN.units) {
        pu.hp = Math.min(pu.maxHp, pu.hp + healPer * RUN.enemies.length);
      }
      spawnEffect({ type:'pulse', x:u.x, y:u.y, radius:CW/2, color:'#FFD700', life:0.5, maxLife:0.5 });
      addFloatText(u.x, u.y - 30, `+${healPer * RUN.enemies.length} HP`, '#FFD700');
      break;
  }
  RUN.lastInputTime = performance.now();
  updateSpecialCD(u);
}

// ================================================================
// TEAM SLOT CLICK
// ================================================================
function onTeamSlotClick(teamIdx) {
  if (!RUN) return;
  const mDef = RUN.teamDefs[teamIdx];

  // If repositioning
  if (RUN.repositionTokens > 0 && RUN.repositionSource !== null) {
    // swap two placed units
    const srcUnitIdx = RUN.repositionSource;
    const placed = RUN.units.find(u => teamDefIndex(u) === teamIdx && u !== RUN.units[srcUnitIdx]);
    if (placed) {
      // swap positions
      const u1 = RUN.units[srcUnitIdx];
      const [c1,r1,c2,r2] = [u1.col,u1.row,placed.col,placed.row];
      u1.col = c2; u1.row = r2; u1.x = c2*CELL+CELL/2; u1.y = r2*CELL+CELL/2;
      placed.col = c1; placed.row = r1; placed.x = c1*CELL+CELL/2; placed.y = r1*CELL+CELL/2;
      RUN.repositionTokens--;
      RUN.repositionSource = null;
      showToast('Units repositioned!', 1800);
      return;
    }
    RUN.repositionSource = null;
  }

  // Check if already placed
  const alreadyPlaced = RUN.units.findIndex(u => u.teamIdx === teamIdx);
  if (alreadyPlaced >= 0) {
    // Possess it
    possessUnit(alreadyPlaced);
    updatePossessUI();
    return;
  }

  // Start placing
  RUN.placingUnitIdx = teamIdx;
  document.getElementById('place-monster-name').textContent = mDef.name;
  document.getElementById('place-prompt').classList.remove('hidden');
}

function cancelPlace() {
  RUN.placingUnitIdx = -1;
  document.getElementById('place-prompt').classList.add('hidden');
}

function placeUnit(col, row) {
  if (RUN.placingUnitIdx < 0) return;
  const key = col+','+row;
  if (RUN.pathSet.has(key)) { showToast("Can't place on the path.", 1600); return; }
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
  if (RUN.units.some(u => u.col === col && u.row === row)) { showToast("Tile occupied.", 1600); return; }

  // Check mirror walls
  if (RUN.mirrorWalls.some(w => w.col === col && w.row === row)) { showToast("Blocked by Mirror Wall.", 1600); return; }

  const mDef = RUN.teamDefs[RUN.placingUnitIdx];
  const col_c = SAVE.collection[mDef.id];
  const lv = col_c ? col_c.level : 1;
  const dmgMult = 1 + lv * 0.10;
  const hpMult  = 1 + lv * 0.12;

  const u = {
    def: mDef,
    teamIdx: RUN.placingUnitIdx,
    col, row,
    x: col*CELL+CELL/2,
    y: row*CELL+CELL/2,
    hp: Math.floor(mDef.hp * hpMult),
    maxHp: Math.floor(mDef.hp * hpMult),
    atkCd: 0,
    specialCd: 0,
    stealthTimer: 0,
    stealthBuff: false,
    shieldTimer: 0,
    buffTimer: 0,
    buffMult: 1,
    dmgMult,
    target: null
  };

  const placedTeamIdx = RUN.placingUnitIdx;
  RUN.units.push(u);
  RUN.placingUnitIdx = -1;
  document.getElementById('place-prompt').classList.add('hidden');

  const slot = document.getElementById('team-slot-' + placedTeamIdx);
  if (slot) slot.classList.add('placed');
}

function teamDefIndex(u) { return u.teamIdx; }

// ================================================================
// PATH BUILDING
// ================================================================
function buildPath(waypoints) {
  return waypoints.map(([c,r]) => ({ x: c*CELL+CELL/2, y: r*CELL+CELL/2 }));
}

function buildPathSet(waypoints) {
  const set = new Set();
  for (let i = 0; i < waypoints.length-1; i++) {
    let [c1,r1] = waypoints[i];
    let [c2,r2] = waypoints[i+1];
    c1 = Math.max(0, c1); c2 = Math.max(0, c2);
    if (r1 === r2) {
      for (let c = Math.min(c1,c2); c <= Math.max(c1,c2); c++) set.add(c+','+r1);
    } else {
      for (let r = Math.min(r1,r2); r <= Math.max(r1,r2); r++) set.add(c1+','+r);
    }
  }
  return set;
}

// ================================================================
// COMBAT HELPERS
// ================================================================
function aoeAttack(cx, cy, radius, dmg, source) {
  for (const en of [...RUN.enemies]) {
    if (dist(en.x,en.y,cx,cy) <= radius) damageEnemy(en, dmg, source);
  }
}
function freezeInRadius(cx, cy, radius, ms) {
  for (const en of RUN.enemies) {
    if (dist(en.x,en.y,cx,cy) <= radius) en.frozen = (en.frozen||0) + ms;
  }
}
function dashAttack(u, range, mult=1.5) {
  // Move unit toward nearest enemy in range, hitting all in path
  const tgt = nearestEnemy(u.x, u.y, range);
  if (!tgt) return;
  const dx = tgt.x-u.x, dy = tgt.y-u.y, d = Math.hypot(dx,dy)||1;
  const nx = u.x + dx/d * Math.min(range, d);
  const ny = u.y + dy/d * Math.min(range, d);
  // Hit anything along the line
  for (const en of [...RUN.enemies]) {
    if (pointToSegDist(en.x,en.y, u.x,u.y, nx,ny) < 18) {
      damageEnemy(en, u.def.damage * mult * u.dmgMult, 'unit');
    }
  }
  u.x = clamp(nx, CELL/2, CW-CELL/2);
  u.y = clamp(ny, CELL/2, CH-CELL/2);
}
function buffNearbyAllies(u, radius, mult, ms) {
  for (const ally of RUN.units) {
    if (ally === u) continue;
    if (dist(ally.x,ally.y,u.x,u.y) <= radius) {
      ally.buffMult = mult;
      ally.buffTimer = ms;
    }
  }
}

function nearestEnemy(x, y, range=99999) {
  let best=null, bd=range*range;
  for (const en of RUN.enemies) {
    const d2 = (en.x-x)**2+(en.y-y)**2;
    if (d2 < bd) { bd=d2; best=en; }
  }
  return best;
}
function nearestEnemyPos(x,y) {
  const en = nearestEnemy(x,y);
  return en ? {x:en.x, y:en.y} : null;
}

function damageEnemy(en, dmg, source) {
  if (en.shield > 0) {
    const absorbed = Math.min(en.shield, dmg);
    en.shield -= absorbed;
    dmg -= absorbed;
    if (dmg <= 0) { addFloatText(en.x, en.y-12, 'SHIELD', '#AA88FF'); return; }
  }
  en.hp -= dmg;
  if (en.hp <= 0) killEnemy(en, source);
}

function killEnemy(en, source) {
  RUN.enemies = RUN.enemies.filter(e => e !== en);
  const base = ENEMY_DEFS[en.typeId]?.reward || 3;
  const active = isActive();
  const focusBonus = 1 + RUN.focusMeter * FOCUS_MAX_BONUS;
  const possBonus  = (RUN.possessedIdx>=0 && source==='unit') ? HERO_GOLD_MULT : 1;
  const shardBoost = SAVE.relics.includes('shard_magnet') ? 1.3 : 1;
  const earned = Math.floor(base * focusBonus * possBonus * shardBoost);

  if (RUN.essenceLure) {
    SAVE.essence += 1;
  } else {
    RUN.shards += earned;
    RUN.goldEarned += earned;
  }

  addFloatText(en.x, en.y-12, '+'+earned, source==='unit' ? '#4FD1C5' : '#F2A65A');

  // Combo
  RUN.combo++;
  RUN.comboTimer = 2500;
  if (RUN.combo >= 5) addFloatText(en.x, en.y-28, 'COMBO ×'+RUN.combo, '#FFD700', 1.2);
}

// ================================================================
// UNIT AI
// ================================================================
function updateUnitAI(u, dt) {
  u.atkCd -= dt * 1000;
  u.specialCd = Math.max(0, u.specialCd - dt * 1000);
  u.stealthTimer = Math.max(0, (u.stealthTimer||0) - dt*1000);
  u.shieldTimer  = Math.max(0, (u.shieldTimer||0)  - dt*1000);
  u.buffTimer    = Math.max(0, (u.buffTimer||0)     - dt*1000);
  if (u.buffTimer <= 0) u.buffMult = 1;

  const isPossessed = RUN.units.indexOf(u) === RUN.possessedIdx;

  if (isPossessed) {
    // Player-controlled
    if (RUN.possessTarget) {
      const dx = RUN.possessTarget.x - u.x;
      const dy = RUN.possessTarget.y - u.y;
      const d  = Math.hypot(dx,dy);
      const step = u.def.speed * dt;
      if (d < 4 || step >= d) {
        u.x = RUN.possessTarget.x; u.y = RUN.possessTarget.y;
        RUN.possessTarget = null;
      } else {
        u.x += dx/d*step; u.y += dy/d*step;
      }
    }
    // Attack targeted enemy
    if (u.atkCd <= 0) {
      const en = u.target || nearestEnemy(u.x, u.y, u.def.range * 1.3);
      if (en) {
        const d2 = (en.x-u.x)**2+(en.y-u.y)**2;
        const r  = u.def.range * 1.3;
        if (d2 <= r*r) {
          const mult = (u.stealthBuff ? 3 : 1) * u.dmgMult * u.buffMult *
            RUN.runDmgMult * (SAVE.relics.includes('possession_lens') ? 1.25 : 1) *
            (RUN.overclockTimer>0 ? 2 : 1);
          const dmg = Math.floor(u.def.damage * mult);
          damageEnemy(en, dmg, 'unit');
          if (u.def.slow) en.frozen = (en.frozen||0) + 600;
          u.stealthBuff = false;
          spawnProjectile(u.x, u.y, en.x, en.y, dmg, u.def.color, 'unit');
          u.atkCd = u.def.atkSpeed * (RUN.runSpdMult) * (RUN.overclockTimer>0 ? 0.5 : 1);
        }
      }
    }
    // HP regen if relic
    if (SAVE.relics.includes('regen_core')) {
      u.hp = Math.min(u.maxHp, u.hp + 8 * dt);
    }
    updatePossessHPBar(u);
    return;
  }

  // AI mode: find nearest enemy in range and attack
  if (u.atkCd <= 0) {
    const en = nearestEnemy(u.x, u.y, u.def.range);
    if (en) {
      const mult = u.dmgMult * u.buffMult * RUN.runDmgMult * (RUN.overclockTimer>0 ? 2 : 1);
      const dmg  = Math.floor(u.def.damage * mult);
      damageEnemy(en, dmg, 'unit');
      if (u.def.slow) en.frozen = (en.frozen||0) + 600;
      if (u.def.splash) aoeAttack(en.x, en.y, u.def.splash, Math.floor(dmg*0.5), 'unit');
      spawnProjectile(u.x, u.y, en.x, en.y, dmg, u.def.color, 'unit');
      u.atkCd = u.def.atkSpeed * RUN.runSpdMult * (RUN.overclockTimer>0 ? 0.5 : 1);
    } else {
      u.atkCd = 100;
    }
  }

  // Conduit aura
  if (u.def.aura) {
    for (const ally of RUN.units) {
      if (ally === u) continue;
      if (dist(ally.x,ally.y,u.x,u.y) <= u.def.aura.range) {
        if (u.def.aura.hpRegen) ally.hp = Math.min(ally.maxHp, ally.hp + u.def.aura.hpRegen * dt);
        if (u.def.aura.damageBoost && ally.buffTimer <= 0) {
          ally.buffMult = Math.max(ally.buffMult, 1 + u.def.aura.damageBoost);
        }
      }
    }
  }
}

function updatePossessHPBar(u) {
  const fill = document.getElementById('possess-hp-fill');
  if (fill) fill.style.width = Math.max(0, u.hp/u.maxHp*100)+'%';
  updateSpecialCD(u);
}

// ================================================================
// ENEMY AI
// ================================================================
function updateEnemy(en, dt) {
  if ((en.frozen||0) > 0) {
    en.frozen -= dt * 1000;
    return;
  }

  const path = RUN.pathPx;
  if (en.seg >= path.length - 1) {
    // Reached end → damage base
    RUN.baseHP -= ENEMY_DEFS[en.typeId]?.damage || 6;
    RUN.enemies = RUN.enemies.filter(e => e !== en);
    addFloatText(path[path.length-1].x, path[path.length-1].y - 20, 'BREACH!', '#E24E4E', 1.4);
    if (RUN.baseHP <= 0) { RUN.baseHP = 0; triggerDefeat(); }
    return;
  }

  // Check mirror wall blocking path
  const tgt = path[en.seg+1];
  const midCol = Math.floor((tgt.x) / CELL);
  const midRow = Math.floor((tgt.y) / CELL);
  if (RUN.mirrorWalls.some(w => w.col === midCol && w.row === midRow)) {
    // Stall
    return;
  }

  const dx = tgt.x - en.x, dy = tgt.y - en.y;
  const d  = Math.hypot(dx, dy);
  const step = en.speed * dt;
  if (step >= d || d < 2) {
    en.x = tgt.x; en.y = tgt.y; en.seg++;
  } else {
    en.x += dx/d*step; en.y += dy/d*step;
  }
}

// ================================================================
// PROJECTILES & EFFECTS
// ================================================================
const projectiles    = []; // { x,y,tx,ty, speed, color, damage, source }
const homingProjs    = []; // { x,y, target, speed, color, damage, source, life }

function spawnProjectile(fx, fy, tx, ty, dmg, color, source) {
  const dx=tx-fx, dy=ty-fy, d=Math.hypot(dx,dy)||1;
  projectiles.push({ x:fx, y:fy, dx:dx/d, dy:dy/d, tx, ty, speed:400, color, dmg, source, life:1 });
}
function spawnHomingProjectile(fx,fy,target,dmg,color,source,maxLife) {
  homingProjs.push({ x:fx, y:fy, target, speed:300, color, dmg, source, life:maxLife, maxLife });
}
function spawnEffect(e) { RUN.effects.push(e); }

function updateProjectiles(dt) {
  for (let i = projectiles.length-1; i >= 0; i--) {
    const p = projectiles[i];
    const step = p.speed * dt;
    const dx = p.tx-p.x, dy = p.ty-p.y, d = Math.hypot(dx,dy);
    if (d <= step+4) { projectiles.splice(i,1); continue; }
    p.x += p.dx*step; p.y += p.dy*step;
    p.life -= dt*1.5;
    if (p.life <= 0) projectiles.splice(i,1);
  }
  for (let i = homingProjs.length-1; i >= 0; i--) {
    const p = homingProjs[i];
    p.life -= dt*1000;
    if (p.life <= 0 || !RUN.enemies.includes(p.target)) { homingProjs.splice(i,1); continue; }
    const dx = p.target.x-p.x, dy = p.target.y-p.y, d=Math.hypot(dx,dy)||1;
    const step = p.speed*dt;
    if (d <= step+8) {
      damageEnemy(p.target, p.dmg, p.source);
      p.target.frozen = (p.target.frozen||0)+2000;
      homingProjs.splice(i,1);
    } else {
      p.x += dx/d*step; p.y += dy/d*step;
    }
  }
}

// ================================================================
// PARTICLES (floating text)
// ================================================================
const floatTexts = [];
function addFloatText(x, y, text, color='#FFFFFF', scale=1) {
  floatTexts.push({ x, y, text, color, scale, life:1.0, vy:-40 });
}
function updateFloatTexts(dt) {
  for (let i = floatTexts.length-1; i>=0; i--) {
    const f = floatTexts[i];
    f.life -= dt*0.9;
    f.y += f.vy*dt;
    if (f.life <= 0) floatTexts.splice(i,1);
  }
}

// ================================================================
// EFFECTS
// ================================================================
function updateEffects(dt) {
  for (let i = RUN.effects.length-1; i>=0; i--) {
    const e = RUN.effects[i];
    e.life -= dt*1.5;
    if (e.type==='pulse' || e.type==='circle') {
      e.radius = e.radius || 0;
      if (e.type==='pulse') e.radius = Math.min(e.maxRadius||100, e.radius + 200*dt);
    }
    if (e.life <= 0) RUN.effects.splice(i,1);
  }
  // Mirror walls
  for (let i = RUN.mirrorWalls.length-1; i>=0; i--) {
    RUN.mirrorWalls[i].timer -= dt*1000;
    if (RUN.mirrorWalls[i].timer <= 0) RUN.mirrorWalls.splice(i,1);
  }
  // Overclock
  if (RUN.overclockTimer > 0) RUN.overclockTimer -= dt*1000;
}

// ================================================================
// FOCUS METER
// ================================================================
function isActive() {
  return (performance.now() - RUN.lastInputTime) < ACTIVE_WINDOW_MS;
}
function updateFocus(dt) {
  if (isActive()) {
    RUN.focusMeter = Math.min(1, RUN.focusMeter + dt/FOCUS_RAMP_SEC);
  } else {
    RUN.focusMeter = Math.max(0, RUN.focusMeter - dt*FOCUS_DRAIN_SEC);
  }
  const active = isActive();
  const fill = document.getElementById('focus-fill');
  const lbl  = document.getElementById('focus-label');
  const mult = document.getElementById('focus-mult');
  if (fill) fill.style.width = (RUN.focusMeter*100)+'%';
  if (lbl) { lbl.textContent = active ? 'ACTIVE' : 'IDLE'; lbl.style.color = active ? 'var(--cyan)' : 'var(--text-muted)'; }
  if (mult) { mult.textContent = '×'+(1+RUN.focusMeter*FOCUS_MAX_BONUS).toFixed(1); }

  // Idle trickle
  RUN._idleAccum = (RUN._idleAccum||0) + IDLE_TRICKLE*dt;
  if (RUN._idleAccum >= 1) {
    const whole = Math.floor(RUN._idleAccum);
    RUN.shards += whole; RUN.goldEarned += whole;
    RUN._idleAccum -= whole;
  }
}

// ================================================================
// COMBO
// ================================================================
function updateCombo(dt) {
  if (RUN.comboTimer > 0) {
    RUN.comboTimer -= dt*1000;
    if (RUN.comboTimer <= 0) RUN.combo = 0;
  }
}

// ================================================================
// SPAWN
// ================================================================
function updateSpawn(dt) {
  if (RUN.phase !== 'wave') return;
  if (RUN.spawnQueue.length === 0) return;
  RUN.spawnTimer -= dt*1000;
  if (RUN.spawnTimer > 0) return;

  const eDef = RUN.spawnQueue.shift();
  const path = RUN.pathPx;
  const hpScale = 1 + (RUN.wave-1)*0.12;
  RUN.enemies.push({
    typeId: eDef.id,
    x: path[0].x, y: path[0].y,
    seg: 0,
    hp: Math.floor(eDef.hp * hpScale),
    maxHp: Math.floor(eDef.hp * hpScale),
    shield: eDef.shield ? Math.floor(eDef.shield * hpScale * 0.5) : 0,
    speed: eDef.speed * (0.95+Math.random()*0.1),
    reward: eDef.reward,
    size: eDef.size,
    color: eDef.color, accent: eDef.accentColor,
    isElite: eDef.isElite||false, isBoss: eDef.isBoss||false,
    frozen: 0
  });

  RUN.spawnTimer = RUN.hasteActive ? 350 : 700 - Math.min(400, RUN.wave*8);
}

// ================================================================
// MAIN GAME LOOP
// ================================================================
function loop(ts) {
  if (!lastFrame) lastFrame = ts;
  const dt = Math.min((ts-lastFrame)/1000, 0.05);
  lastFrame = ts;

  if (RUN && currentScreen === 'screen-game' && RUN.phase !== 'shop') {
    updateFocus(dt);
    updateCombo(dt);
    updateSpawn(dt);

    for (const u of RUN.units) updateUnitAI(u, dt);
    for (const en of [...RUN.enemies]) updateEnemy(en, dt);

    updateProjectiles(dt);
    updateFloatTexts(dt);
    updateEffects(dt);
    updateSpellUI();
    updateHUD();

    checkWaveComplete();

    draw();
  }

  rafId = requestAnimationFrame(loop);
}

// ================================================================
// HUD UPDATE
// ================================================================
function updateHUD() {
  document.getElementById('run-gold').textContent   = Math.floor(RUN.goldEarned);
  document.getElementById('run-shards').textContent = Math.floor(RUN.shards);
  document.getElementById('hud-hp-val').textContent = Math.max(0, Math.floor(RUN.baseHP));
  document.getElementById('hud-hp-fill').style.width = Math.max(0, RUN.baseHP/RUN.baseMaxHP*100)+'%';
  document.getElementById('hud-wave').textContent   = RUN.wave;
}

function updateSpellUI() {
  RUN.equippedSpells.forEach((es, i) => {
    const btn = document.getElementById('spell-btn-'+i);
    const cd  = document.getElementById('spell-cd-'+i);
    if (!btn) return;
    if (es.currentCd > 0) {
      es.currentCd -= 16;
      btn.classList.remove('ready'); btn.classList.add('on-cooldown');
      if (cd) cd.style.width = Math.max(0, (1 - es.currentCd/es.def.cooldown)*100)+'%';
    } else {
      btn.classList.add('ready'); btn.classList.remove('on-cooldown');
      if (cd) cd.style.width = '100%';
    }
  });
}

// ================================================================
// DRAWING
// ================================================================
function draw() {
  const map = RUN.mapDef;
  ctx.fillStyle = map.bgColor;
  ctx.fillRect(0,0,CW,CH);

  drawGrid(map);
  drawPath(map);
  drawMirrorWalls();
  drawEffects();
  drawUnits();
  drawEnemies();
  drawProjectiles();
  drawHomingProjs();
  drawFloatTexts();
  drawSpellAimIndicator();
}

function drawGrid(map) {
  ctx.strokeStyle = map.gridColor || 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 1;
  for (let c=0; c<=COLS; c++) { ctx.beginPath(); ctx.moveTo(c*CELL,0); ctx.lineTo(c*CELL,CH); ctx.stroke(); }
  for (let r=0; r<=ROWS; r++) { ctx.beginPath(); ctx.moveTo(0,r*CELL); ctx.lineTo(CW,r*CELL); ctx.stroke(); }
}

function drawPath(map) {
  ctx.fillStyle = map.pathColor || 'rgba(255,255,255,0.07)';
  RUN.pathSet.forEach(key => {
    const [c,r] = key.split(',').map(Number);
    if (c>=0 && c<COLS && r>=0 && r<ROWS) ctx.fillRect(c*CELL+1, r*CELL+1, CELL-2, CELL-2);
  });
  // Draw path line
  ctx.beginPath();
  const p0 = RUN.pathPx[0];
  ctx.moveTo(p0.x, p0.y);
  for (let i=1; i<RUN.pathPx.length; i++) ctx.lineTo(RUN.pathPx[i].x, RUN.pathPx[i].y);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 3; ctx.stroke();

  // Entry/exit markers
  const last = RUN.pathPx[RUN.pathPx.length-1];
  ctx.beginPath(); ctx.arc(last.x, last.y, 18, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(226,78,78,0.25)'; ctx.fill();
  ctx.strokeStyle = 'rgba(226,78,78,0.6)'; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle = '#E24E4E'; ctx.font = 'bold 11px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('BASE', last.x, last.y);
}

function drawMirrorWalls() {
  for (const w of RUN.mirrorWalls) {
    ctx.fillStyle = 'rgba(170,200,255,0.25)';
    ctx.strokeStyle = '#AACCFF';
    ctx.lineWidth = 2;
    ctx.fillRect(w.col*CELL+2, w.row*CELL+2, CELL-4, CELL-4);
    ctx.strokeRect(w.col*CELL+2, w.row*CELL+2, CELL-4, CELL-4);
  }
}

function drawUnits() {
  for (let i=0; i<RUN.units.length; i++) {
    const u = RUN.units[i];
    const possessed = i === RUN.possessedIdx;
    const now = performance.now();

    // Overclock glow
    if (RUN.overclockTimer > 0) {
      ctx.beginPath(); ctx.arc(u.x, u.y, 28, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(255,255,0,0.4)'; ctx.lineWidth=4; ctx.stroke();
    }

    // Buff glow
    if (u.buffTimer > 0) {
      ctx.beginPath(); ctx.arc(u.x, u.y, 26, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(255,200,50,0.5)'; ctx.lineWidth=3; ctx.stroke();
    }

    // Stealth
    if (u.stealthTimer > 0) {
      ctx.globalAlpha = 0.3 + Math.sin(now/150)*0.15;
    }

    // Shield glow
    if (u.shieldTimer > 0) {
      ctx.beginPath(); ctx.arc(u.x, u.y, 30, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(100,200,100,0.5)'; ctx.lineWidth=3; ctx.stroke();
    }

    // Draw monster sprite
    drawMonsterOnCanvas(ctx, u.def, u.x, u.y, 20);

    ctx.globalAlpha = 1;

    // Possess ring (the signature visual)
    const ringR = 26 + Math.sin(now/200)*2.5;
    ctx.beginPath(); ctx.arc(u.x, u.y, ringR, 0, Math.PI*2);
    if (possessed) {
      ctx.strokeStyle = u.def.color;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.6 + Math.sin(now/140)*0.3;
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.4;
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Range circle while possessed
    if (possessed) {
      ctx.beginPath(); ctx.arc(u.x, u.y, u.def.range*1.3, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth=1; ctx.stroke();
    }

    // HP bar
    const bw = 28, bh = 4;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(u.x-bw/2, u.y-24, bw, bh);
    const hpRatio = Math.max(0, u.hp/u.maxHp);
    ctx.fillStyle = hpRatio>0.5 ? '#9FE85A' : hpRatio>0.25 ? '#F2A65A' : '#E24E4E';
    ctx.fillRect(u.x-bw/2, u.y-24, bw*hpRatio, bh);

    // Aura circle (conduit)
    if (u.def.aura) {
      ctx.beginPath(); ctx.arc(u.x, u.y, u.def.aura.range, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(255,230,100,0.1)'; ctx.lineWidth=1; ctx.stroke();
    }
  }
}

function drawEnemies() {
  for (const en of RUN.enemies) {
    const eDef = ENEMY_DEFS[en.typeId] || ENEMY_DEFS.peasant;
    const r = en.size;
    const frozen = (en.frozen||0) > 0;

    // Boss/elite glow
    if (en.isBoss) {
      ctx.beginPath(); ctx.arc(en.x, en.y, r+8, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(220,20,60,0.4)'; ctx.lineWidth=3; ctx.stroke();
    } else if (en.isElite) {
      ctx.beginPath(); ctx.arc(en.x, en.y, r+5, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(212,175,55,0.4)'; ctx.lineWidth=2; ctx.stroke();
    }

    // Body
    ctx.beginPath(); ctx.arc(en.x, en.y, r, 0, Math.PI*2);
    ctx.fillStyle = frozen ? '#88CCFF' : en.color;
    ctx.fill();

    // Helmet/details
    ctx.beginPath(); ctx.arc(en.x, en.y-r*0.2, r*0.5, Math.PI, 0);
    ctx.fillStyle = en.accent; ctx.fill();

    // Shield indicator
    if (en.shield > 0) {
      ctx.beginPath(); ctx.arc(en.x, en.y, r+3, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(180,100,255,0.7)'; ctx.lineWidth=2; ctx.stroke();
    }

    // HP bar
    const bw = r*2+4, bh = 4;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(en.x-bw/2, en.y-r-10, bw, bh);
    ctx.fillStyle = en.isBoss ? '#DC143C' : en.isElite ? '#D4AF37' : '#E24E4E';
    ctx.fillRect(en.x-bw/2, en.y-r-10, bw*Math.max(0, en.hp/en.maxHp), bh);

    // Freeze indicator
    if (frozen) {
      ctx.font = '12px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('❄', en.x, en.y);
    }
  }
}

function drawProjectiles() {
  for (const p of projectiles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
    ctx.fillStyle = p.color; ctx.fill();
    ctx.globalAlpha = 1;
  }
}
function drawHomingProjs() {
  for (const p of homingProjs) {
    ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI*2);
    ctx.fillStyle = p.color; ctx.fill();
  }
}

function drawEffects() {
  for (const e of RUN.effects) {
    ctx.globalAlpha = Math.max(0, e.life);
    if (e.type === 'pulse' || e.type === 'circle') {
      ctx.beginPath(); ctx.arc(e.x, e.y, e.radius||0, 0, Math.PI*2);
      ctx.strokeStyle = e.color; ctx.lineWidth = e.type==='circle'?3:2; ctx.stroke();
    } else if (e.type === 'line') {
      ctx.fillStyle = e.color;
      ctx.fillRect(e.x, e.y - (e.height||20)/2, e.width||CW, e.height||20);
    }
    ctx.globalAlpha = 1;
  }
}

function drawFloatTexts() {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const f of floatTexts) {
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.font = `bold ${Math.floor(12*f.scale)}px monospace`;
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function drawSpellAimIndicator() {
  if (!spellAiming) return;
  // Crosshair on canvas center as hint
  ctx.strokeStyle = 'rgba(255,200,50,0.3)';
  ctx.lineWidth = 1; ctx.setLineDash([6,4]);
  ctx.strokeRect(4, 4, CW-8, CH-8);
  ctx.setLineDash([]);
}

// ================================================================
// MONSTER RENDERER (procedural, works on any canvas context)
// ================================================================
function drawMonsterOnCanvas(c, def, cx, cy, radius, alpha=1) {
  c.globalAlpha = alpha;
  const r = radius;

  switch(def.role) {
    case 'anchor': drawAnchor(c, def, cx, cy, r); break;
    case 'ravager': drawRavager(c, def, cx, cy, r); break;
    case 'weaver': drawWeaver(c, def, cx, cy, r); break;
    case 'artillerist': drawArtillerist(c, def, cx, cy, r); break;
    case 'whisper': drawWhisper(c, def, cx, cy, r); break;
    case 'conduit': drawConduit(c, def, cx, cy, r); break;
    default: drawGeneric(c, def, cx, cy, r);
  }

  c.globalAlpha = 1;
}

function drawAnchor(c, def, cx, cy, r) {
  // Large round boulder shape
  c.beginPath(); c.arc(cx, cy+r*0.1, r, 0, Math.PI*2);
  c.fillStyle = def.color; c.fill();
  // Crack detail
  c.strokeStyle = def.accent; c.lineWidth = Math.max(1,r*0.08);
  c.beginPath(); c.moveTo(cx-r*0.3, cy-r*0.2); c.lineTo(cx, cy+r*0.1); c.lineTo(cx+r*0.4, cy-r*0.1); c.stroke();
  // Eyes
  c.fillStyle = def.eyeColor;
  c.beginPath(); c.arc(cx-r*0.3, cy-r*0.2, r*0.12, 0, Math.PI*2); c.fill();
  c.beginPath(); c.arc(cx+r*0.3, cy-r*0.2, r*0.12, 0, Math.PI*2); c.fill();
}
function drawRavager(c, def, cx, cy, r) {
  // Angular diamond shape
  c.beginPath();
  c.moveTo(cx, cy-r); c.lineTo(cx+r*0.7, cy); c.lineTo(cx, cy+r*0.8); c.lineTo(cx-r*0.7, cy); c.closePath();
  c.fillStyle = def.color; c.fill();
  c.strokeStyle = def.accent; c.lineWidth=Math.max(1,r*0.1); c.stroke();
  // Wing slashes
  c.strokeStyle = def.eyeColor; c.lineWidth=Math.max(1,r*0.07);
  c.beginPath(); c.moveTo(cx-r*0.5, cy-r*0.5); c.lineTo(cx-r*0.1, cy); c.stroke();
  c.beginPath(); c.moveTo(cx+r*0.5, cy-r*0.5); c.lineTo(cx+r*0.1, cy); c.stroke();
  // Eye
  c.fillStyle = def.eyeColor; c.beginPath(); c.arc(cx, cy-r*0.1, r*0.15, 0, Math.PI*2); c.fill();
}
function drawWeaver(c, def, cx, cy, r) {
  // Oval with legs
  c.beginPath(); c.ellipse(cx, cy, r*0.8, r, 0, 0, Math.PI*2);
  c.fillStyle = def.color; c.fill();
  // Legs
  c.strokeStyle = def.accent; c.lineWidth=Math.max(1,r*0.08);
  for (let i=-1; i<=1; i+=1) {
    const bx = cx-r*0.7*Math.sign(i||1);
    c.beginPath(); c.moveTo(bx*0.3+cx*0.7, cy+i*r*0.3); c.lineTo(bx, cy+i*r*0.6); c.stroke();
    c.beginPath(); c.moveTo(bx*0.3+cx*0.7, cy-i*r*0.2); c.lineTo(bx, cy-i*r*0.5); c.stroke();
  }
  // Eyes
  c.fillStyle = def.eyeColor;
  [-0.3,-0.1,0.1,0.3].forEach(ox => {
    c.beginPath(); c.arc(cx+ox*r, cy-r*0.2, r*0.1, 0, Math.PI*2); c.fill();
  });
}
function drawArtillerist(c, def, cx, cy, r) {
  // Boxy body
  c.fillStyle = def.color;
  c.fillRect(cx-r*0.8, cy-r*0.7, r*1.6, r*1.4);
  // Cannon barrel
  c.fillStyle = def.accent;
  c.fillRect(cx+r*0.2, cy-r*0.15, r*0.9, r*0.3);
  // Eye port
  c.fillStyle = def.eyeColor;
  c.fillRect(cx-r*0.5, cy-r*0.25, r*0.5, r*0.4);
  // Treads
  c.fillStyle = def.accent;
  c.fillRect(cx-r*0.8, cy+r*0.55, r*1.6, r*0.25);
}
function drawWhisper(c, def, cx, cy, r) {
  // Semi-transparent ghost form
  c.globalAlpha *= 0.75;
  c.beginPath(); c.ellipse(cx, cy, r*0.65, r, 0, 0, Math.PI*2);
  c.fillStyle = def.color; c.fill();
  c.globalAlpha /= 0.75;
  // Tail wisps
  c.strokeStyle = def.accent; c.lineWidth=Math.max(1,r*0.07);
  c.beginPath(); c.moveTo(cx-r*0.3, cy+r*0.6); c.quadraticCurveTo(cx-r*0.6, cy+r*1.1, cx-r*0.2, cy+r); c.stroke();
  c.beginPath(); c.moveTo(cx, cy+r*0.6); c.quadraticCurveTo(cx+r*0.1, cy+r*1.2, cx, cy+r); c.stroke();
  c.beginPath(); c.moveTo(cx+r*0.3, cy+r*0.6); c.quadraticCurveTo(cx+r*0.6, cy+r*1.1, cx+r*0.2, cy+r); c.stroke();
  // Eyes (glowing)
  const g = c.createRadialGradient(cx-r*0.2, cy-r*0.1, 0, cx-r*0.2, cy-r*0.1, r*0.18);
  g.addColorStop(0, def.eyeColor); g.addColorStop(1, 'transparent');
  c.fillStyle = g; c.beginPath(); c.arc(cx-r*0.2, cy-r*0.1, r*0.18, 0, Math.PI*2); c.fill();
  const g2 = c.createRadialGradient(cx+r*0.2, cy-r*0.1, 0, cx+r*0.2, cy-r*0.1, r*0.18);
  g2.addColorStop(0, def.eyeColor); g2.addColorStop(1, 'transparent');
  c.fillStyle = g2; c.beginPath(); c.arc(cx+r*0.2, cy-r*0.1, r*0.18, 0, Math.PI*2); c.fill();
}
function drawConduit(c, def, cx, cy, r) {
  // Round with radiating lines (aura feel)
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI*2);
  const g = c.createRadialGradient(cx, cy, r*0.2, cx, cy, r);
  g.addColorStop(0, def.eyeColor); g.addColorStop(1, def.color);
  c.fillStyle = g; c.fill();
  // Rays
  c.strokeStyle = def.color; c.lineWidth=Math.max(1,r*0.07);
  for (let i=0; i<8; i++) {
    const a = i*Math.PI/4;
    c.beginPath(); c.moveTo(cx+Math.cos(a)*r*0.7, cy+Math.sin(a)*r*0.7);
    c.lineTo(cx+Math.cos(a)*r*1.2, cy+Math.sin(a)*r*1.2); c.stroke();
  }
  // Center dot
  c.fillStyle = def.eyeColor; c.beginPath(); c.arc(cx, cy, r*0.2, 0, Math.PI*2); c.fill();
}
function drawGeneric(c, def, cx, cy, r) {
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI*2);
  c.fillStyle = def.color; c.fill();
  c.fillStyle = def.eyeColor;
  c.beginPath(); c.arc(cx-r*0.3, cy-r*0.2, r*0.12, 0, Math.PI*2); c.fill();
  c.beginPath(); c.arc(cx+r*0.3, cy-r*0.2, r*0.12, 0, Math.PI*2); c.fill();
}

// ================================================================
// INPUT HANDLING
// ================================================================
function getCanvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width  / rect.width;
  const sy = canvas.height / rect.height;
  const src = e.changedTouches ? e.changedTouches[0] : e;
  return {
    x: (src.clientX - rect.left) * sx,
    y: (src.clientY - rect.top)  * sy
  };
}

canvas.addEventListener('pointerdown', e => {
  if (!RUN || RUN.phase === 'shop') return;
  const pt = getCanvasPoint(e);
  RUN.lastInputTime = performance.now();

  // Spell aiming
  if (spellAiming !== null) {
    executeSpell(spellAiming.idx, pt);
    spellAiming = null;
    canvas.style.cursor = 'crosshair';
    return;
  }

  // Placing a unit
  if (RUN.placingUnitIdx >= 0) {
    const col = Math.floor(pt.x / CELL);
    const row = Math.floor(pt.y / CELL);
    placeUnit(col, row);
    return;
  }

  // Possess tap: check if tapping a placed unit
  for (let i=0; i<RUN.units.length; i++) {
    const u = RUN.units[i];
    if (dist(pt.x, pt.y, u.x, u.y) < 24) {
      if (RUN.possessedIdx === i) {
        // Already possessed: set move/attack target
        const en = nearestEnemyAt(pt.x, pt.y, 30);
        if (en) u.target = en;
        else { RUN.possessTarget = pt; u.target = null; }
      } else {
        possessUnit(i);
      }
      return;
    }
  }

  // If possessed, tap to move/attack
  if (RUN.possessedIdx >= 0) {
    const en = nearestEnemyAt(pt.x, pt.y, 40);
    const u  = RUN.units[RUN.possessedIdx];
    if (en) u.target = en;
    else { RUN.possessTarget = pt; u.target = null; }
  }
}, { passive: true });

function nearestEnemyAt(x,y,threshold) {
  let best=null, bd=threshold*threshold;
  for (const en of RUN.enemies) {
    const d2=(en.x-x)**2+(en.y-y)**2;
    if (d2<bd) { bd=d2; best=en; }
  }
  return best;
}

// ================================================================
// WAVE BANNER
// ================================================================
function showWaveBanner(text, ms) {
  const el = document.getElementById('wave-banner');
  document.getElementById('wave-banner-text').textContent = text;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), ms);
}

// ================================================================
// VICTORY & DEFEAT
// ================================================================
function triggerVictory() {
  RUN.phase = 'done';
  const mapProg = SAVE.mapProgress[activeMapId] || {};
  mapProg.normalCleared = true;
  SAVE.mapProgress[activeMapId] = mapProg;
  const goldBonus = Math.floor(RUN.goldEarned * 0.8);
  SAVE.gold += goldBonus;
  SAVE.orbs += Math.floor(RUN.wave / 4);
  grantXP(50 + RUN.wave*3);
  saveToDB();
  showResult(true);
}

function triggerDefeat() {
  if (RUN.phase === 'done') return;
  RUN.phase = 'done';
  const goldBonus = Math.floor(RUN.shards * 0.25);
  SAVE.gold += goldBonus;
  grantXP(10 + RUN.wave*2);
  saveToDB();
  showResult(false);
}

function showResult(won) {
  const el = document.getElementById('overlay-result');
  const header = document.getElementById('result-header');
  const rows   = document.getElementById('result-rows');
  const reward = document.getElementById('result-reward');

  const goldBonus = won ? Math.floor(RUN.goldEarned * 0.8) : Math.floor(RUN.shards * 0.25);
  const orbsEarned = won ? Math.floor(RUN.wave / 4) : 0;

  header.innerHTML = won
    ? `<h2 style="color:var(--cyan)">RIFT DEFENDED</h2><div class="result-sub">Map cleared — the King's forces retreat</div>`
    : `<h2 style="color:var(--red)">BASE OVERRUN</h2><div class="result-sub">Wave ${RUN.wave} — a strong showing</div>`;

  rows.innerHTML = `
    <div class="result-row"><span>Waves survived</span><b>${RUN.wave}</b></div>
    <div class="result-row"><span>Best wave (this map)</span><b>${SAVE.bestWaves[activeMapId]||RUN.wave}</b></div>
    <div class="result-row"><span>Shards earned</span><b>${Math.floor(RUN.shards)}</b></div>
    <div class="result-row"><span>Active bonus applied</span><b>×${(1+RUN.focusMeter*FOCUS_MAX_BONUS).toFixed(1)}</b></div>`;

  reward.innerHTML = `
    <div class="reward-item"><span class="cur-icon">◈</span>+${goldBonus} Gold</div>
    ${orbsEarned>0 ? `<div class="reward-item"><span class="cur-icon orb-icon">◉</span>+${orbsEarned} Orbs</div>` : ''}`;

  el.classList.remove('hidden');
}

function goHub() {
  document.getElementById('overlay-result').classList.add('hidden');
  RUN = null;
  showScreen('screen-hub');
}

function retryRun() {
  document.getElementById('overlay-result').classList.add('hidden');
  startRun();
}

// ================================================================
// UTILS
// ================================================================
function dist(x1,y1,x2,y2) { return Math.hypot(x2-x1, y2-y1); }
function clamp(v,lo,hi) { return Math.max(lo,Math.min(hi,v)); }
function cap(s) { return s.charAt(0).toUpperCase()+s.slice(1); }
function shuffle(arr) { for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];} }
function pointToSegDist(px,py,ax,ay,bx,by) {
  const dx=bx-ax, dy=by-ay;
  if(dx===0&&dy===0) return dist(px,py,ax,ay);
  const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy)));
  return dist(px,py,ax+t*dx,ay+t*dy);
}
function rarityColor(r) {
  return { common:'#8898AA', uncommon:'#4CAF50', rare:'#4A90D9', epic:'#9B59B6', legendary:'#F5A623', mythic:'#00E5FF' }[r]||'#888';
}

// ================================================================
// TOAST
// ================================================================
function showToast(msg, ms=3000) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

// ================================================================
// AUTO-SAVE ON HIDE
// ================================================================
document.addEventListener('visibilitychange', () => { if(document.hidden) saveToDB(); });
window.addEventListener('beforeunload', () => saveToDB());
setInterval(saveToDB, 20000);

// ================================================================
// INIT
// ================================================================
(function init() {
  // Focus login input on load
  setTimeout(() => document.getElementById('login-name').focus(), 100);
})();
