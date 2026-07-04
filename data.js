'use strict';
/* ============================================================
   DATA.JS — All game data definitions
   ============================================================ */

// ================================================================
// MONSTER DEFINITIONS
// ================================================================
const MONSTER_DEFS = {
  gorpax: {
    id:'gorpax', name:'Gorpax', rarity:'common', role:'anchor',
    desc:'A boulder given legs and a grudge.',
    lore:'Nobody knows how Gorpax became a boulder. Gorpax does not ask.',
    color:'#8B9BB4', accent:'#6B7A8D', eyeColor:'#FFD700',
    hp:200, damage:12, range:70, atkSpeed:1200, speed:80,
    special:{ name:'Stomp', cd:8000, desc:'Shockwave stuns nearby enemies for 1.5s', icon:'💥' },
    unlocked:true
  },
  buzz: {
    id:'buzz', name:'Buzz', rarity:'common', role:'ravager',
    desc:'Faster than thought, angrier than reason.',
    lore:'Buzz has stung 10,000 things. Only a few of them deserved it.',
    color:'#F5C842', accent:'#1A1200', eyeColor:'#FF4444',
    hp:80, damage:8, range:90, atkSpeed:450, speed:200,
    special:{ name:'Sting Rush', cd:6000, desc:'Dash through enemies, dealing 2x damage to each', icon:'⚡' },
    unlocked:true
  },
  splotch: {
    id:'splotch', name:'Splotch', rarity:'common', role:'weaver',
    desc:'It leaves a trail. The trail is intentional.',
    lore:'Splotch once won a staring contest. No one knows how.',
    color:'#7CCD7C', accent:'#2D5A2D', eyeColor:'#FFFFFF',
    hp:90, damage:6, range:100, atkSpeed:900, speed:100, slow:0.5,
    special:{ name:'Goo Splash', cd:7000, desc:'Slows all enemies in area 60% for 4s', icon:'🟢' },
    unlocked:true
  },
  pip: {
    id:'pip', name:'Pip', rarity:'uncommon', role:'conduit',
    desc:'Tiny. Bright. Surprisingly loud when ignored.',
    lore:'Pip communicates entirely via glow patterns. None are polite.',
    color:'#FFE8A3', accent:'#FFD700', eyeColor:'#FF8800',
    hp:70, damage:4, range:120, atkSpeed:1100, speed:110,
    aura:{ range:85, hpRegen:6 },
    special:{ name:'Starflare', cd:9000, desc:'Supercharges nearest ally: +80% damage for 5s', icon:'⭐' },
    unlocked:false
  },
  noctis: {
    id:'noctis', name:'Noctis', rarity:'uncommon', role:'whisper',
    desc:'Exists mostly in your peripheral vision.',
    lore:'Three wardens have tried to hold a meeting with Noctis. Noctis did not attend any of them.',
    color:'#6B5FA6', accent:'#2A1F4A', eyeColor:'#E0D0FF',
    hp:100, damage:18, range:80, atkSpeed:1800, speed:160, stealth:true,
    special:{ name:'Shadow Strike', cd:7500, desc:'Vanish 3s, next hit deals 3× damage', icon:'🌑' },
    unlocked:false
  },
  mirrek: {
    id:'mirrek', name:'Mirrek', rarity:'uncommon', role:'artillerist',
    desc:'Built its own cannon. Refuses to explain how.',
    lore:"Mirrek's engineering degree is from a school that no longer exists.",
    color:'#CD853F', accent:'#8B4513', eyeColor:'#00FF88',
    hp:110, damage:20, range:140, atkSpeed:2200, speed:70, splash:50,
    special:{ name:'Barrage', cd:10000, desc:'Fires 5 shells in a wide arc', icon:'💣' },
    unlocked:false
  },
  vix: {
    id:'vix', name:'Vix', rarity:'rare', role:'ravager',
    desc:'A fox from the Mirror Dimension. Reflects damage as light.',
    lore:'Vix has seven reflections. None of them are in mirrors.',
    color:'#C8C8E8', accent:'#8888BB', eyeColor:'#00FFFF',
    hp:120, damage:22, range:110, atkSpeed:600, speed:220,
    special:{ name:'Mirror Dash', cd:5000, desc:'Dash through enemies leaving light shards that deal DOT', icon:'🌀' },
    unlocked:false
  },
  zara: {
    id:'zara', name:'Zara', rarity:'rare', role:'weaver',
    desc:'Eight eyes. Eight opinions. One web.',
    lore:'Zara\'s webs are structurally perfect. She has never told anyone how.',
    color:'#DA70D6', accent:'#6B1E6B', eyeColor:'#FF88FF',
    hp:105, damage:10, range:130, atkSpeed:800, speed:90, slow:0.6,
    special:{ name:'Web Trap', cd:8000, desc:'Roots enemies in a large area for 3s', icon:'🕸' },
    unlocked:false
  },
  thornback: {
    id:'thornback', name:'Thornback', rarity:'rare', role:'anchor',
    desc:'Slow to anger. Slow to everything, really.',
    lore:'Thornback\'s record is 0 steps per minute. Set intentionally.',
    color:'#556B2F', accent:'#8FBC8F', eyeColor:'#FFAA00',
    hp:280, damage:8, range:65, atkSpeed:1400, speed:60, thorns:0.25,
    special:{ name:'Thorn Wall', cd:9000, desc:'Raises a ring of thorns: reflects 50% damage for 4s', icon:'🌵' },
    unlocked:false
  },
  kalux: {
    id:'kalux', name:'Kalux', rarity:'epic', role:'artillerist',
    desc:'Looks like a toad. Thinks like artillery.',
    lore:'Kalux once shelled a mountain. The mountain lost.',
    color:'#20B2AA', accent:'#006060', eyeColor:'#FFFF00',
    hp:140, damage:35, range:170, atkSpeed:3000, speed:55, splash:80,
    special:{ name:'Mega Mortar', cd:12000, desc:'Massive shell: player aims the arc, enormous splash', icon:'🎯' },
    unlocked:false
  },
  librarian: {
    id:'librarian', name:'The Librarian', rarity:'epic', role:'whisper',
    desc:'Reads your enemies\'s attack patterns before they happen.',
    lore:'The Librarian has read every book. The books are afraid.',
    color:'#B8860B', accent:'#6B4900', eyeColor:'#E0C878',
    hp:115, damage:14, range:150, atkSpeed:1000, speed:85,
    special:{ name:'Tome Strike', cd:7000, desc:'3 homing pages seek and stun 3 different enemies', icon:'📖' },
    unlocked:false
  },
  solenne: {
    id:'solenne', name:'Solenne', rarity:'legendary', role:'conduit',
    desc:'A cathedral bell that chose to walk away.',
    lore:'When Solenne rings, every enemy within earshot stops to listen. Then stops entirely.',
    color:'#FFD700', accent:'#FF8C00', eyeColor:'#FFFFFF',
    hp:160, damage:8, range:140, atkSpeed:1600, speed:75,
    aura:{ range:100, damageBoost:0.2 },
    special:{ name:'Resonance', cd:11000, desc:'Heals all placed units based on enemies on screen (8 HP per enemy)', icon:'🔔' },
    unlocked:false
  }
};

// ================================================================
// ENEMY DEFINITIONS
// ================================================================
const ENEMY_DEFS = {
  peasant: {
    id:'peasant', name:'Peasant', hp:30, speed:90, reward:2, damage:6,
    color:'#C4A882', accentColor:'#8B7355', size:10,
    desc:'Just a guy with a pitchfork and a dream.'
  },
  guard: {
    id:'guard', name:'Guard', hp:65, speed:72, reward:4, damage:10,
    color:'#7090B8', accentColor:'#4060A0', size:12,
    desc:'He trained for this. He regrets it.'
  },
  archer: {
    id:'archer', name:'Archer', hp:45, speed:115, reward:3, damage:8,
    color:'#8BC878', accentColor:'#5A9040', size:10,
    desc:'Fast, lethal, frequently overconfident.'
  },
  knight: {
    id:'knight', name:'Knight', hp:130, speed:55, reward:6, damage:15,
    color:'#A0A0B8', accentColor:'#686880', size:14,
    desc:'The heavy armor slows him. He doesn\'t care.'
  },
  mage: {
    id:'mage', name:'Mage', hp:55, speed:85, reward:5, damage:8, shield:40,
    color:'#C888E8', accentColor:'#8040B0', size:11,
    desc:'Has a magic shield. Hates having a magic shield.'
  },
  elite_knight: {
    id:'elite_knight', name:'Elite Knight', hp:220, speed:60, reward:12, damage:20,
    color:'#D4AF37', accentColor:'#8B7720', size:16, isElite:true,
    desc:'The King\'s best. Probably.'
  },
  boss_king: {
    id:'boss_king', name:'The King\'s Champion', hp:800, speed:45, reward:40, damage:25,
    color:'#DC143C', accentColor:'#8B0000', size:22, isBoss:true,
    desc:'Sent personally. Deeply unhappy about it.'
  }
};

// ================================================================
// MAP DEFINITIONS
// ================================================================
const MAP_DEFS = {
  keep: {
    id:'keep', name:'The Crumbling Keep', world:'World I',
    icon:'🏰', bgColor:'#0D1218', pathColor:'rgba(180,150,90,0.12)',
    gridColor:'rgba(255,255,255,0.025)',
    // Waypoints in grid col,row (path exits at col>=COLS)
    waypoints:[[-1,4],[3,4],[3,1],[8,1],[8,7],[12,7],[12,3],[17,3]],
    normalWaves:20, hardWaves:30,
    normalEnemyPool:['peasant','guard','archer'],
    hardEnemyPool:  ['guard','archer','knight','mage'],
    eliteType:'elite_knight', bossType:'boss_king',
    desc:'Old walls. Older grudges.',
    hardBonus:'All Anchor units gain +8% HP globally'
  },
  depths: {
    id:'depths', name:'The Fungal Depths', world:'World I',
    icon:'🍄', bgColor:'#0A1A0E', pathColor:'rgba(100,200,80,0.1)',
    gridColor:'rgba(100,200,80,0.02)',
    waypoints:[[-1,7],[2,7],[2,2],[6,2],[6,5],[10,5],[10,1],[14,1],[14,8],[17,8]],
    normalWaves:22, hardWaves:35,
    normalEnemyPool:['peasant','guard','archer','mage'],
    hardEnemyPool:  ['guard','knight','mage','archer'],
    eliteType:'elite_knight', bossType:'boss_king',
    desc:'Bioluminescent. Treacherous. Perfect.',
    hardBonus:'Weaver units gain +15% slow strength globally'
  },
  coast: {
    id:'coast', name:'The Shattered Coast', world:'World II',
    icon:'⚓', bgColor:'#0A1220', pathColor:'rgba(50,100,200,0.1)',
    gridColor:'rgba(50,100,200,0.02)',
    waypoints:[[-1,1],[4,1],[4,4],[1,4],[1,7],[6,7],[6,4],[11,4],[11,7],[14,7],[14,2],[17,2]],
    normalWaves:25, hardWaves:40,
    normalEnemyPool:['guard','archer','knight','mage'],
    hardEnemyPool:  ['knight','mage','archer','elite_knight'],
    eliteType:'elite_knight', bossType:'boss_king',
    desc:'The sea takes what the soldiers leave behind.',
    hardBonus:'Ravager units gain +10% attack speed globally',
    locked:true
  }
};

// ================================================================
// SPELL DEFINITIONS
// ================================================================
const SPELL_DEFS = {
  ashfall: {
    id:'ashfall', name:'Ashfall', icon:'🔥',
    desc:'Drag a line across the battlefield. Fire rains on it.',
    cooldown:45000, damage:30, type:'line',
    color:'#FF4400'
  },
  permafrost: {
    id:'permafrost', name:'Permafrost', icon:'❄️',
    desc:'Tap a spot. Everything in a wide radius freezes for 4s.',
    cooldown:60000, freezeDuration:4000, type:'aoe',
    color:'#88CCFF'
  },
  overclock: {
    id:'overclock', name:'Overclock', icon:'⚡',
    desc:'All your placed units attack twice as fast for 6 seconds.',
    cooldown:55000, duration:6000, type:'buff',
    color:'#FFFF00'
  },
  voidpull: {
    id:'voidpull', name:'Void Pull', icon:'🌀',
    desc:'Tap an enemy. It slides backward 4 grid cells, losing path progress.',
    cooldown:35000, type:'target',
    color:'#AA44FF'
  },
  soulleech: {
    id:'soulleech', name:'Soul Leech', icon:'💜',
    desc:'Drain 15 HP from every enemy on screen. Restore 20 base HP.',
    cooldown:70000, drainPerEnemy:15, baseHpRestore:20, type:'drain',
    color:'#CC44CC'
  },
  mirrorwall: {
    id:'mirrorwall', name:'Mirror Wall', icon:'🪞',
    desc:'Place a temporary wall that blocks the path for 8s.',
    cooldown:50000, duration:8000, type:'wall',
    color:'#AACCFF'
  }
};

// ================================================================
// SHOP OFFER TEMPLATES
// ================================================================
const SHOP_OFFER_DEFS = [
  { id:'buff_damage',  name:'Power Surge',    icon:'⚔️',  desc:'All units deal +25% damage for the rest of this run', cost:35, apply: s => { s.runDmgMult = (s.runDmgMult||1)*1.25; } },
  { id:'buff_speed',   name:'Swiftness Rune', icon:'💨',  desc:'All units attack 20% faster for the rest of this run', cost:25, apply: s => { s.runSpdMult = (s.runSpdMult||1)*0.8; } },
  { id:'repair',       name:'Emergency Repair',icon:'🛡️', desc:'Restore 25 base HP',       cost:30, apply: s => { s.baseHP = Math.min(s.baseMaxHP, s.baseHP+25); } },
  { id:'reposition',   name:'Reposition Token',icon:'🔄', desc:'Swap any unit\'s position once', cost:20, apply: s => { s.repositionTokens = (s.repositionTokens||0)+1; showToast('Reposition token added — tap a placed unit to swap it'); } },
  { id:'spell_charge', name:'Spell Recharge', icon:'✨',  desc:'Instantly reset one spell cooldown', cost:40, apply: s => { const r = s.equippedSpells.find(e=>e.currentCd>0); if(r) { r.currentCd=0; showToast(r.def.name+' cooldown reset!'); } else showToast('All spells already ready!'); } },
  { id:'gold_cache',   name:'Shard Cache',    icon:'▲',   desc:'Gain +60 Shards immediately', cost:0,  apply: s => { s.shards += 60; } },
  { id:'haste',        name:'Haste Rune',     icon:'⏩',  desc:'Next wave spawns 30% faster = more Shards/min', cost:15, apply: s => { s.hasteActive = true; } },
  { id:'essence_drop', name:'Essence Lure',   icon:'✦',   desc:'Enemies drop Essence instead of extra Shards this wave', cost:0, apply: s => { s.essenceLure = true; } }
];

// ================================================================
// RELIC DEFINITIONS
// ================================================================
const RELIC_DEFS = {
  warden_sigil:    { id:'warden_sigil',    name:'Warden\'s Sigil',     desc:'+1 unit placement slot permanently', icon:'⬡', effect:'slot' },
  life_stone:      { id:'life_stone',      name:'Life Stone',           desc:'Start every run with +20 base HP',   icon:'❤️', effect:'hp_start' },
  possession_lens: { id:'possession_lens', name:'Possession Lens',      desc:'Possessed units deal +25% damage',   icon:'🔮', effect:'possess_dmg' },
  shard_magnet:    { id:'shard_magnet',    name:'Shard Magnet',         desc:'+30% Shards from all sources',       icon:'▲', effect:'shard_boost' },
  regen_core:      { id:'regen_core',      name:'Regeneration Core',    desc:'Possessed units slowly regen HP',    icon:'💚', effect:'possess_regen' }
};

// ================================================================
// PULL RATES
// ================================================================
const PULL_RATES = {
  common:    0.50,
  uncommon:  0.25,
  rare:      0.15,
  epic:      0.07,
  legendary: 0.03
};

// Weighted pool for pulls
function buildPullPool() {
  const pool = [];
  for (const m of Object.values(MONSTER_DEFS)) {
    const w = Math.round((PULL_RATES[m.rarity] || 0.05) * 1000);
    for (let i = 0; i < w; i++) pool.push(m.id);
  }
  return pool;
}
const PULL_POOL = buildPullPool();

function getRandomPull(pity) {
  // Pity: guaranteed Rare every 10, Epic every 40, Legendary every 80
  let overrideRarity = null;
  if      (pity >= 80) overrideRarity = 'legendary';
  else if (pity >= 40) overrideRarity = 'epic';
  else if (pity >= 10) overrideRarity = 'rare';

  if (overrideRarity) {
    const candidates = Object.values(MONSTER_DEFS).filter(m => m.rarity === overrideRarity);
    return candidates[Math.floor(Math.random() * candidates.length)].id;
  }
  return PULL_POOL[Math.floor(Math.random() * PULL_POOL.length)];
}
