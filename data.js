'use strict';
/* ============================================================
   DATA.JS — All static game data
   ============================================================ */

// ================================================================
// GIFT CODES
// ================================================================
const GIFT_CODES = {
  'RIFTBORN':    { gold:500,  orbs:10,  essence:0,   desc:'+500 Gold & +10 Orbs. Welcome, Warden.' },
  'WARDEN2026':  { gold:200,  orbs:5,   essence:25,  desc:'+200 Gold, +5 Orbs, +25 Essence.' },
  'SUMMONMASTER':{ gold:0,    orbs:50,  essence:0,   desc:'+50 Orbs — pull until you find a legend.' },
  'DEVMODE':     { gold:9999, orbs:500, essence:999, desc:'Developer access granted. Everything is yours.' },
  'NEWWARDEN':   { gold:100,  orbs:0,   essence:0,   unlock:['pip','noctis','mirrek'], desc:'Pip, Noctis & Mirrek joined your roster!' },
  'LEGENDARY':   { gold:0,    orbs:0,   essence:0,   unlock:['solenne'], desc:'Solenne the Bell has answered your call!' },
  'ALLMONSTERS': { gold:500,  orbs:20,  essence:100, unlockAll:true, desc:'All 20 monsters unlocked. Go cause some chaos.' },
};

// ================================================================
// MONSTER DEFINITIONS (20 total)
// ================================================================
const MONSTER_DEFS = {
  /* -------- STARTERS -------- */
  gorpax:{
    id:'gorpax', name:'Gorpax', rarity:'common', role:'anchor',
    desc:'A boulder given legs and a grudge.',
    lore:'Nobody knows how Gorpax became a boulder. Gorpax does not ask. There is a small flower growing from its left shoulder that it refuses to acknowledge.',
    possessTip:'Post Gorpax at a sharp path bend. While possessed, walk INTO the incoming crowd to maximise the Stomp stun radius — freezing a cluster lets your other units shred them for free.',
    color:'#8B9BB4', accent:'#5A6878', eyeColor:'#FFD700',
    hp:200, damage:12, range:70, atkSpeed:1200, speed:80,
    special:{name:'Stomp', cd:8000, desc:'Shockwave forward — stuns all enemies in 120px for 1.5s', icon:'💥'},
    unlocked:true
  },
  buzz:{
    id:'buzz', name:'Buzz', rarity:'common', role:'ravager',
    desc:'Faster than thought, angrier than reason.',
    lore:'Buzz has stung 10,000 things. Only a few deserved it. The rest were simply in the way.',
    possessTip:'Dash diagonally across the path to hit the most enemies per Sting Rush. Spam tap attacks between cooldowns — your 450ms attack speed makes rapid clicks pay off.',
    color:'#F5C842', accent:'#1A1200', eyeColor:'#FF4444',
    hp:80, damage:8, range:90, atkSpeed:450, speed:200,
    special:{name:'Sting Rush', cd:6000, desc:'Dash through enemies dealing 2× damage to each hit', icon:'⚡'},
    unlocked:true
  },
  splotch:{
    id:'splotch', name:'Splotch', rarity:'common', role:'weaver',
    desc:'It leaves a trail. The trail is intentional.',
    lore:'Splotch once won a staring contest. Nobody is sure how. Its eyes never visibly blink.',
    possessTip:'Drop Goo Splash at a corner where enemies bunch before a turn. Stay possessed to re-slow any group that gets through — your slow stacks with freeze effects.',
    color:'#7CCD7C', accent:'#2D5A2D', eyeColor:'#FFFFFF',
    hp:90, damage:6, range:100, atkSpeed:900, speed:100, slow:0.5,
    special:{name:'Goo Splash', cd:7000, desc:'Covers area in goo — slows all enemies 60% for 4s', icon:'🟢'},
    unlocked:true
  },
  /* -------- UNCOMMON -------- */
  pip:{
    id:'pip', name:'Pip', rarity:'uncommon', role:'conduit',
    desc:'Tiny. Bright. Surprisingly loud when ignored.',
    lore:'Pip communicates entirely via glow patterns. None of them are polite. Pip has been asked to tone it down.',
    possessTip:'Possess Pip just before an elite or boss wave, then aim Starflare at your highest-damage ally. The 80% buff stacks with Overclock for a devastating combination.',
    color:'#FFE8A3', accent:'#DDAA00', eyeColor:'#FF8800',
    hp:70, damage:4, range:120, atkSpeed:1100, speed:110,
    aura:{range:85, hpRegen:6},
    special:{name:'Starflare', cd:9000, desc:'Supercharges nearest ally: +80% damage for 5s', icon:'⭐'},
    unlocked:false
  },
  noctis:{
    id:'noctis', name:'Noctis', rarity:'uncommon', role:'whisper',
    desc:'Exists mostly in your peripheral vision.',
    lore:'Three wardens have tried to hold a meeting with Noctis. Noctis attended none of them. There are no records of what Noctis does instead.',
    possessTip:'Activate Shadow Strike, then walk into a dense cluster. The 3× damage on your first hit after invisibility is ideal for one-shotting elite units or chunking a boss.',
    color:'#6B5FA6', accent:'#2A1F4A', eyeColor:'#DDD0FF',
    hp:100, damage:18, range:80, atkSpeed:1800, speed:160, stealth:true,
    special:{name:'Shadow Strike', cd:7500, desc:'Vanish for 3s — next attack deals 3× damage', icon:'🌑'},
    unlocked:false
  },
  mirrek:{
    id:'mirrek', name:'Mirrek', rarity:'uncommon', role:'artillerist',
    desc:"Built its own cannon. Refuses to explain how.",
    lore:"Mirrek's engineering degree is from a school that no longer exists. This is considered unverifiable rather than suspicious.",
    possessTip:"Face Mirrek toward the path BEFORE firing Barrage — the 5-shell fan arc requires you to be angled correctly. Perfect against groups rounding a corner.",
    color:'#CD853F', accent:'#8B4513', eyeColor:'#00FF88',
    hp:110, damage:20, range:140, atkSpeed:2200, speed:70, splash:50,
    special:{name:'Barrage', cd:10000, desc:'Fires 5 shells in a wide fan arc', icon:'💣'},
    unlocked:false
  },
  sparkmite:{
    id:'sparkmite', name:'Sparkmite', rarity:'uncommon', role:'ravager',
    desc:'Electric. Erratic. Extremely difficult to swat.',
    lore:'Sparkmite was created when a lightning bolt struck a beetle that was already having a bad day. It has not calmed down since.',
    possessTip:'Chain Lightning jumps between enemies — wait for a tight cluster before triggering it. Pairs perfectly with Zara or Splotch to hold enemies still for maximum chain jumps.',
    color:'#40C0FF', accent:'#0060A0', eyeColor:'#FFFF44',
    hp:75, damage:10, range:100, atkSpeed:500, speed:185,
    special:{name:'Chain Lightning', cd:6500, desc:'Arc of electricity jumps between up to 5 enemies (15 dmg each)', icon:'⚡'},
    unlocked:false
  },
  /* -------- RARE -------- */
  vix:{
    id:'vix', name:'Vix', rarity:'rare', role:'ravager',
    desc:'A fox from the Mirror Dimension. Reflects damage as light.',
    lore:'Vix has seven reflections. None of them are in mirrors. The mirrors have requested not to discuss it.',
    possessTip:'Dash through entire enemy lines repeatedly — each Mirror Dash resets your attack cooldown. Best combo: dash, attack, dash again. Keep moving or you lose the rhythm.',
    color:'#C8C8E8', accent:'#8888BB', eyeColor:'#00FFFF',
    hp:120, damage:22, range:110, atkSpeed:600, speed:220,
    special:{name:'Mirror Dash', cd:5000, desc:'Phase through enemies leaving light shards that deal DoT', icon:'🌀'},
    unlocked:false
  },
  zara:{
    id:'zara', name:'Zara', rarity:'rare', role:'weaver',
    desc:'Eight eyes. Eight opinions. One web.',
    lore:"Zara's webs are structurally flawless. She has declined every request to explain the math. The requests have stopped.",
    possessTip:"Root a boss or elite with Web Trap, then immediately switch possession to your DPS unit while Zara's web holds the target perfectly still.",
    color:'#DA70D6', accent:'#6B1E6B', eyeColor:'#FF88FF',
    hp:105, damage:10, range:130, atkSpeed:800, speed:90, slow:0.6,
    special:{name:'Web Trap', cd:8000, desc:'Roots all enemies in a large radius for 3s', icon:'🕸'},
    unlocked:false
  },
  thornback:{
    id:'thornback', name:'Thornback', rarity:'rare', role:'anchor',
    desc:'Slow to anger. Slow to everything, really.',
    lore:"Thornback's personal record is zero steps per minute. Set intentionally. Maintained proudly.",
    possessTip:"Position at the path entry point. Thorns reflect 25% of incoming damage — heavy knights hitting Thornback take significant punishment. Thorn Wall then doubles this to 50%.",
    color:'#556B2F', accent:'#8FBC8F', eyeColor:'#FFAA00',
    hp:280, damage:8, range:65, atkSpeed:1400, speed:60, thorns:0.25,
    special:{name:'Thorn Wall', cd:9000, desc:'Raises thorns — reflects 50% of all incoming damage for 4s', icon:'🌵'},
    unlocked:false
  },
  fenwick:{
    id:'fenwick', name:'Fenwick', rarity:'rare', role:'conduit',
    desc:'Extremely small. Extremely serious about it.',
    lore:'Fenwick is 11cm tall and considers this irrelevant. All opponents so far have agreed, eventually.',
    possessTip:"Possess Fenwick before a boss wave and aim Arcane Shield at your most-threatened unit. The 50-point absorb shield can save a fragile Whisper or Ravager from death.",
    color:'#4488FF', accent:'#223388', eyeColor:'#AACCFF',
    hp:85, damage:5, range:150, atkSpeed:900, speed:95,
    aura:{range:95, damageBoost:0.15},
    special:{name:'Arcane Shield', cd:10000, desc:'Grants nearest ally a 50-point absorb shield for 5s', icon:'🛡️'},
    unlocked:false
  },
  duskwing:{
    id:'duskwing', name:'Duskwing', rarity:'rare', role:'whisper',
    desc:'Swoops in. Drains. Leaves. Repeat.',
    lore:'Duskwing does not consider itself a predator. This view is not shared by its targets.',
    possessTip:'Swoop through a cluster using Blood Drain, then reposition before the next wave. The self-healing means Duskwing can survive sustained punishment if you keep it moving.',
    color:'#553377', accent:'#2A1540', eyeColor:'#FF2244',
    hp:95, damage:16, range:95, atkSpeed:1000, speed:190, stealth:true,
    special:{name:'Blood Drain', cd:7000, desc:'Deals 30 dmg to nearby enemies and heals Duskwing for same total', icon:'🩸'},
    unlocked:false
  },
  mirelle:{
    id:'mirelle', name:'Mirelle', rarity:'rare', role:'conduit',
    desc:'She heals everything. Even things that did not ask.',
    lore:'Mirelle once healed a knight mid-battle. He had to sit down. She considers it a success.',
    possessTip:'Possess Mirelle after a heavy wave when your units are low — Mass Heal instantly restores 30 HP to ALL placed units simultaneously. Save it for after elites hit.',
    color:'#FF88CC', accent:'#CC4488', eyeColor:'#FFFFFF',
    hp:75, damage:4, range:130, atkSpeed:1200, speed:120,
    aura:{range:100, hpRegen:10},
    special:{name:'Mass Heal', cd:11000, desc:'Instantly heals ALL placed units for 30 HP', icon:'💗'},
    unlocked:false
  },
  /* -------- EPIC -------- */
  kalux:{
    id:'kalux', name:'Kalux', rarity:'epic', role:'artillerist',
    desc:'Looks like a toad. Thinks like artillery.',
    lore:'Kalux once shelled a mountain. The mountain lost.',
    possessTip:'When possessed, tap slightly ahead of where enemy groups are moving — the Mega Mortar shell travels slowly, so lead your target. Devastating on the straight path sections.',
    color:'#20B2AA', accent:'#006060', eyeColor:'#FFFF00',
    hp:140, damage:35, range:170, atkSpeed:3000, speed:55, splash:80,
    special:{name:'Mega Mortar', cd:12000, desc:'Massive shell — deals 80 dmg in a huge 100px radius', icon:'🎯'},
    unlocked:false
  },
  librarian:{
    id:'librarian', name:'The Librarian', rarity:'epic', role:'whisper',
    desc:"Reads your enemies' attack patterns before they happen.",
    lore:'The Librarian has read every book. The books are aware of this.',
    possessTip:"Tome Strike auto-seeks 3 different targets — trigger it the instant a new wave spawns before enemies spread out. Stun overlap with Web Trap creates a complete lockdown.",
    color:'#B8860B', accent:'#6B4900', eyeColor:'#E0C878',
    hp:115, damage:14, range:150, atkSpeed:1000, speed:85,
    special:{name:'Tome Strike', cd:7000, desc:'3 homing pages seek and stun 3 different enemies for 2s each', icon:'📖'},
    unlocked:false
  },
  cruxor:{
    id:'cruxor', name:'Cruxor', rarity:'epic', role:'weaver',
    desc:'Patient. Precise. Poisonous.',
    lore:'Cruxor has never rushed anything. Cruxor has also never lost anything.',
    possessTip:'Sting multiple targets in rapid succession — the Venom DoT stacks per enemy, not per cast. Having 8 enemies poisoned simultaneously creates enormous passive damage.',
    color:'#B85820', accent:'#6B3010', eyeColor:'#FFCC00',
    hp:120, damage:12, range:120, atkSpeed:750, speed:80, slow:0.45,
    special:{name:'Venom Sting', cd:9000, desc:'Poisons all enemies in range: 8 dmg/sec for 5s', icon:'☠️'},
    unlocked:false
  },
  blastt:{
    id:'blastt', name:'Blastt', rarity:'epic', role:'artillerist',
    desc:'Assembled from rubble. Powered by spite.',
    lore:'Blastt was not built. It arrived. No one has asked from where.',
    possessTip:'When possessed, you aim Blastt manually — slow-moving knights are ideal targets. Trigger Overcharge just before a dense cluster reaches your front line for triple-damage bombardment.',
    color:'#909090', accent:'#505050', eyeColor:'#FF4400',
    hp:130, damage:18, range:130, atkSpeed:2000, speed:65, splash:45,
    special:{name:'Overcharge', cd:10000, desc:'Next 3 attacks deal 3× damage and have double splash radius', icon:'🔋'},
    unlocked:false
  },
  /* -------- LEGENDARY -------- */
  solenne:{
    id:'solenne', name:'Solenne', rarity:'legendary', role:'conduit',
    desc:'A cathedral bell that chose to walk away.',
    lore:"When Solenne rings, every enemy within earshot pauses to listen. Then stops entirely. There have been theological debates about what this means. Solenne has not weighed in.",
    possessTip:"Ring Resonance right when a large wave is fully on screen — the heal scales with enemy count (8 HP per enemy). With 20 enemies active, that's 160 HP restored to all allies instantly.",
    color:'#FFD700', accent:'#FF8C00', eyeColor:'#FFFFFF',
    hp:160, damage:8, range:140, atkSpeed:1600, speed:75,
    aura:{range:100, damageBoost:0.2},
    special:{name:'Resonance', cd:11000, desc:'Heals all placed units (8 HP × enemies on screen)', icon:'🔔'},
    unlocked:false
  },
  vortex:{
    id:'vortex', name:'Vortex', rarity:'legendary', role:'whisper',
    desc:'Neither here nor entirely there.',
    lore:'Vortex was observed once, briefly. No one agreed on what they had seen.',
    possessTip:'Phase Strike makes Vortex untargetable for 2s while dealing 45 dmg to everything nearby — use it the moment a boss focuses Vortex. The phase resets your safety window for aggressive play.',
    color:'#220044', accent:'#440088', eyeColor:'#CC00FF',
    hp:130, damage:20, range:140, atkSpeed:1400, speed:100, stealth:true,
    special:{name:'Phase Strike', cd:10000, desc:'Become untargetable 2s and deal 45 dmg to all enemies in 140px', icon:'🌌'},
    unlocked:false
  },
  grogg:{
    id:'grogg', name:'Grogg', rarity:'common', role:'anchor',
    desc:'Cave troll. Cave logic.',
    lore:'Grogg lives under things. This is not a limitation. This is a philosophy.',
    possessTip:'Let Grogg absorb punishment in the front line — his passive regen keeps him alive without your help. While possessed, direct him to focus the fastest enemy before it outpaces your towers.',
    color:'#7B6B4A', accent:'#4A3D22', eyeColor:'#FF6600',
    hp:220, damage:10, range:65, atkSpeed:1400, speed:70,
    special:{name:'Hurl Rock', cd:7500, desc:'Throws a boulder — 40 dmg and stuns target for 2s', icon:'🪨'},
    unlocked:false
  },
};

// ================================================================
// ENEMY DEFINITIONS
// ================================================================
const ENEMY_DEFS = {
  peasant:{id:'peasant', name:'Peasant', hp:30, speed:90, reward:2, damage:6,
    color:'#C4A882', accentColor:'#8B7355', size:10, desc:'Just a guy with a pitchfork and a dream.'},
  guard:{id:'guard', name:'Guard', hp:65, speed:72, reward:4, damage:10,
    color:'#7090B8', accentColor:'#3A5080', size:12, desc:'He trained for this. He regrets it.'},
  archer:{id:'archer', name:'Archer', hp:45, speed:115, reward:3, damage:8,
    color:'#8BC878', accentColor:'#4A7030', size:10, desc:'Fast, lethal, frequently overconfident.'},
  knight:{id:'knight', name:'Knight', hp:130, speed:55, reward:6, damage:15,
    color:'#A0A0B8', accentColor:'#606080', size:14, desc:'The heavy armor slows him. He does not care.'},
  mage:{id:'mage', name:'Mage', hp:55, speed:85, reward:5, damage:8, shield:40,
    color:'#C888E8', accentColor:'#8040B0', size:11, desc:'Has a magic shield. Hates the magic shield.'},
  elite_knight:{id:'elite_knight', name:'Elite Knight', hp:220, speed:60, reward:12, damage:20,
    color:'#D4AF37', accentColor:'#8B7720', size:16, isElite:true, desc:"The King's best. Probably."},
  boss_king:{id:'boss_king', name:"King's Champion", hp:800, speed:45, reward:40, damage:25,
    color:'#DC143C', accentColor:'#8B0000', size:22, isBoss:true, desc:'Sent personally. Deeply unhappy about it.'},
};

// ================================================================
// MAP DEFINITIONS — redesigned paths with more turns
// ================================================================
const MAP_DEFS = {
  keep:{
    id:'keep', name:'The Crumbling Keep', world:'World I', icon:'🏰',
    bgColor:'#0C1018', accent:'#3A4060',
    pathFill:'rgba(160,140,90,0.14)', pathStroke:'rgba(200,180,120,0.2)',
    gridColor:'rgba(255,255,255,0.022)',
    theme:'keep',
    // 5 turns — snakes through castle sections
    waypoints:[[-1,4],[2,4],[2,1],[6,1],[6,6],[10,6],[10,2],[14,2],[14,6],[17,6]],
    normalWaves:20, hardWaves:30,
    normalEnemyPool:['peasant','guard','archer'],
    hardEnemyPool:['guard','archer','knight','mage'],
    eliteType:'elite_knight', bossType:'boss_king',
    desc:'Old stone. Older grudges.',
    hardBonus:'All Anchor units gain +8% HP globally'
  },
  depths:{
    id:'depths', name:'The Fungal Depths', world:'World I', icon:'🍄',
    bgColor:'#060D08', accent:'#204030',
    pathFill:'rgba(100,60,180,0.15)', pathStroke:'rgba(140,80,220,0.22)',
    gridColor:'rgba(80,200,100,0.018)',
    theme:'depths',
    // 7 turns — long winding cave
    waypoints:[[-1,7],[3,7],[3,2],[6,2],[6,6],[9,6],[9,1],[13,1],[13,6],[17,6]],
    normalWaves:22, hardWaves:35,
    normalEnemyPool:['peasant','guard','archer','mage'],
    hardEnemyPool:['guard','knight','mage','archer'],
    eliteType:'elite_knight', bossType:'boss_king',
    desc:'Bioluminescent. Treacherous. Perfect.',
    hardBonus:'Weaver units gain +15% slow strength globally'
  },
  coast:{
    id:'coast', name:'The Shattered Coast', world:'World II', icon:'⚓',
    bgColor:'#060B14', accent:'#1A304A',
    pathFill:'rgba(40,80,160,0.13)', pathStroke:'rgba(60,110,200,0.2)',
    gridColor:'rgba(40,80,180,0.02)',
    theme:'coast',
    // 8 turns — switchback along cliff edge
    waypoints:[[-1,2],[4,2],[4,7],[7,7],[7,3],[10,3],[10,7],[13,7],[13,2],[17,2]],
    normalWaves:25, hardWaves:40,
    normalEnemyPool:['guard','archer','knight','mage'],
    hardEnemyPool:['knight','mage','archer','elite_knight'],
    eliteType:'elite_knight', bossType:'boss_king',
    desc:'The sea takes everything, eventually.',
    hardBonus:'Ravager units gain +10% attack speed globally',
    locked:true
  }
};

// ================================================================
// SPELL DEFINITIONS
// ================================================================
const SPELL_DEFS = {
  ashfall:{id:'ashfall', name:'Ashfall', icon:'🔥',
    desc:'Tap a row — fire rains across it.',
    cooldown:45000, damage:30, type:'line', color:'#FF4400'},
  permafrost:{id:'permafrost', name:'Permafrost', icon:'❄️',
    desc:'Tap a point — wide freeze for 4s.',
    cooldown:60000, freezeDuration:4000, type:'aoe', color:'#88CCFF'},
  overclock:{id:'overclock', name:'Overclock', icon:'⚡',
    desc:'All units attack 2× fast for 6s.',
    cooldown:55000, duration:6000, type:'buff', color:'#FFFF00'},
  voidpull:{id:'voidpull', name:'Void Pull', icon:'🌀',
    desc:'Tap an enemy — pushes it back 4 tiles.',
    cooldown:35000, type:'target', color:'#AA44FF'},
  soulleech:{id:'soulleech', name:'Soul Leech', icon:'💜',
    desc:'Drain 15 HP from every enemy. Restore 20 base HP.',
    cooldown:70000, drainPerEnemy:15, baseHpRestore:20, type:'drain', color:'#CC44CC'},
  mirrorwall:{id:'mirrorwall', name:'Mirror Wall', icon:'🪞',
    desc:'Tap a tile — blocks the path for 8s.',
    cooldown:50000, duration:8000, type:'wall', color:'#AACCFF'},
};

// ================================================================
// SHOP OFFER POOL
// ================================================================
const SHOP_OFFER_DEFS = [
  {id:'buff_damage', name:'Power Surge',     icon:'⚔️', desc:'All units +25% damage this run',         cost:35, apply:s=>{s.runDmgMult=(s.runDmgMult||1)*1.25;}},
  {id:'buff_speed',  name:'Swiftness Rune',  icon:'💨', desc:'All units attack 20% faster this run',   cost:25, apply:s=>{s.runSpdMult=(s.runSpdMult||1)*0.8;}},
  {id:'repair',      name:'Emergency Repair',icon:'🛡️',desc:'Restore 25 base HP',                    cost:30, apply:s=>{s.baseHP=Math.min(s.baseMaxHP,s.baseHP+25);}},
  {id:'reposition',  name:'Reposition Token',icon:'🔄', desc:'Swap any unit position once',            cost:20, apply:s=>{s.repositionTokens=(s.repositionTokens||0)+1;showToast('Token added — tap a placed unit to swap');}},
  {id:'spell_cd',    name:'Spell Recharge',  icon:'✨', desc:'Reset one spell cooldown instantly',      cost:40, apply:s=>{const r=s.equippedSpells.find(e=>e.currentCd>0);if(r){r.currentCd=0;showToast(r.def.name+' reset!');}else showToast('All spells ready!');}},
  {id:'shard_cache', name:'Shard Cache',     icon:'▲',  desc:'Gain +80 Shards immediately',            cost:0,  apply:s=>{s.shards+=80;}},
  {id:'haste',       name:'Haste Rune',      icon:'⏩', desc:'Next wave spawns 30% faster = more Shards',cost:15,apply:s=>{s.hasteActive=true;}},
  {id:'dmg_bonus',   name:'Warden Mark',     icon:'🔮', desc:'Possess kills worth 3× gold for this wave',cost:20,apply:s=>{s.possessGoldMult=(s.possessGoldMult||2)*1.5;}},
];

// ================================================================
// RELIC DEFINITIONS
// ================================================================
const RELIC_DEFS = {
  warden_sigil:   {name:"Warden's Sigil",   desc:'+1 unit slot permanently',         icon:'⬡'},
  life_stone:     {name:'Life Stone',         desc:'Start every run with +20 base HP', icon:'❤️'},
  possession_lens:{name:'Possession Lens',    desc:'Possessed units deal +25% damage', icon:'🔮'},
  shard_magnet:   {name:'Shard Magnet',       desc:'+30% Shards from all sources',     icon:'▲'},
  regen_core:     {name:'Regeneration Core',  desc:'Possessed units slowly regen HP',  icon:'💚'},
};

// ================================================================
// PULL RATES & POOL
// ================================================================
const PULL_RATES = {common:0.50,uncommon:0.25,rare:0.15,epic:0.07,legendary:0.03};

function buildPullPool(){
  const pool=[];
  for(const m of Object.values(MONSTER_DEFS)){
    const w=Math.round((PULL_RATES[m.rarity]||0.05)*1000);
    for(let i=0;i<w;i++) pool.push(m.id);
  }
  return pool;
}
const PULL_POOL = buildPullPool();

function getRandomPull(pity){
  let forceRarity=null;
  if(pity>=80) forceRarity='legendary';
  else if(pity>=40) forceRarity='epic';
  else if(pity>=10) forceRarity='rare';
  if(forceRarity){
    const c=Object.values(MONSTER_DEFS).filter(m=>m.rarity===forceRarity);
    return c[Math.floor(Math.random()*c.length)].id;
  }
  return PULL_POOL[Math.floor(Math.random()*PULL_POOL.length)];
}

function rarityEssence(r){return{common:1,uncommon:3,rare:8,epic:20,legendary:50}[r]||1;}
function rarityColor(r){return{common:'#8898AA',uncommon:'#4CAF50',rare:'#4A90D9',epic:'#9B59B6',legendary:'#F5A623',mythic:'#00E5FF'}[r]||'#888';}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}