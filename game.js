'use strict';
// ============================================================
// CONSTANTS
// ============================================================
const CELL=60,COLS=16,ROWS=9,CW=960,CH=540;
const ACTIVE_MS=5000,FOCUS_RAMP=10,FOCUS_DRAIN=0.5,FOCUS_BONUS=2.5;
const IDLE_TRICKLE=0.3,POSSESS_GOLD=2.0,MAX_OFFLINE=4*3600,SHOP_EVERY=5;

// ============================================================
// GLOBAL STATE
// ============================================================
let SAVE,RUN=null,currentScreen='screen-login';
let activeMapId=null,toastTimer=null,viewedMonster=null;
let prerunUnits=[],prerunSpells=[],spellAiming=null;
let mapBgCache=null,sporeParticles=[];
let lastFrame=0,rafId=null;
const projectiles=[],homingProjs=[],floatTexts=[];

const canvas=document.getElementById('game-canvas');
const ctx=canvas.getContext('2d');
canvas.width=CW; canvas.height=CH;

// ============================================================
// SAVE / LOAD
// ============================================================
function mkSave(){
  const col={};
  for(const id of Object.keys(MONSTER_DEFS)) col[id]={level:1,stars:0,owned:!!MONSTER_DEFS[id].unlocked};
  return{username:'',gold:200,orbs:15,essence:0,crystals:0,wardenRank:1,wardenXP:0,
    pullPity:0,collection:col,spellLevels:{},mapProgress:{},relics:[],
    bestWaves:{},totalRuns:0,lastSeen:Date.now(),usedCodes:[]};
}
SAVE=mkSave();

function saveGame(){
  if(!SAVE.username)return;
  try{localStorage.setItem('rw:'+SAVE.username,JSON.stringify(SAVE));}catch(e){}
}
function loadGame(name){
  try{
    const raw=localStorage.getItem('rw:'+name);
    if(raw){const d=JSON.parse(raw);return Object.assign(mkSave(),d);}
  }catch(e){}
  return null;
}

// ============================================================
// SCREEN MANAGEMENT
// ============================================================
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const el=document.getElementById(id);
  if(el)el.classList.add('active');
  currentScreen=id;
  if(id==='screen-hub')refreshHub();
  if(id==='screen-roster')renderRoster('all');
  if(id==='screen-mapselect')renderMapSelect();
}

// ============================================================
// LOGIN
// ============================================================
document.getElementById('login-btn').addEventListener('click',doLogin);
document.getElementById('login-name').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});

async function doLogin(){
  Audio.init(); Audio.click();
  let name=document.getElementById('login-name').value.trim();
  if(!name)name='Warden'+Math.floor(Math.random()*9000+1000);
  name=name.slice(0,18);
  const existing=loadGame(name);
  if(existing){
    SAVE=existing;
    const off=Math.min(MAX_OFFLINE,Math.max(0,(Date.now()-(SAVE.lastSeen||Date.now()))/1000));
    const earned=Math.floor(IDLE_TRICKLE*(1+SAVE.wardenRank*0.05)*off);
    SAVE.gold+=earned; SAVE.lastSeen=Date.now();
    saveGame();
    if(earned>0)showToast('Welcome back '+name+'! +'+earned+' Gold earned while away.',5000);
    else showToast('Rift link re-established, '+name+'.',2500);
  }else{
    SAVE.username=name; SAVE.lastSeen=Date.now();
    saveGame();
    showToast('New Warden registered: '+name,2500);
  }
  SAVE.username=name;
  document.getElementById('hub-username').textContent=name;
  showScreen('screen-hub');
  Audio.startMusic();
}

// ============================================================
// SOUND TOGGLES
// ============================================================
function toggleMusicUI(){
  Audio.init(); Audio.resume();
  const on=Audio.toggleMusic();
  const btn=document.getElementById('music-btn');
  if(btn)btn.classList.toggle('active',on);
}
function toggleSFXUI(){
  const on=Audio.toggleSFX();
  const btn=document.getElementById('sfx-btn');
  if(btn)btn.classList.toggle('active',on);
}

// ============================================================
// HUB
// ============================================================
function refreshHub(){
  document.getElementById('hub-username').textContent=SAVE.username;
  document.getElementById('hud-gold').textContent=Math.floor(SAVE.gold);
  document.getElementById('hud-orbs').textContent=SAVE.orbs;
  document.getElementById('hud-essence').textContent=SAVE.essence;
  document.getElementById('hub-rank-num').textContent=SAVE.wardenRank;
  const need=rankXP(SAVE.wardenRank);
  document.getElementById('hub-rank-xp').textContent=SAVE.wardenXP+' / '+need+' XP';
  document.getElementById('hub-rank-fill').style.width=Math.min(100,SAVE.wardenXP/need*100)+'%';
  const owned=Object.values(SAVE.collection).filter(c=>c.owned).length;
  document.getElementById('hub-roster-count').textContent=owned+' / '+Object.keys(SAVE.collection).length+' monsters';
  document.getElementById('hub-relic-count').textContent=SAVE.relics.length+' Relics';
  const bw=SAVE.bestWaves&&Object.keys(SAVE.bestWaves).length?Math.max(...Object.values(SAVE.bestWaves)):'—';
  document.getElementById('daily-info').innerHTML='<b>Active play</b> earns 3× more than idle · <b>Possess</b> any unit to control it directly · Best wave: <b>'+bw+'</b>';
}
function rankXP(r){return Math.floor(200*Math.pow(1.35,r-1));}
function grantXP(n){
  SAVE.wardenXP+=n;
  const need=rankXP(SAVE.wardenRank);
  if(SAVE.wardenXP>=need){SAVE.wardenXP-=need;SAVE.wardenRank++;showToast('Warden Rank '+SAVE.wardenRank+' reached!',3500);}
}

// ============================================================
// GIFT CODES
// ============================================================
function redeemCode(){
  Audio.click();
  const inp=document.getElementById('code-input');
  const code=(inp.value||'').trim().toUpperCase();
  if(!code){showToast('Enter a code first.',2000);return;}
  if(!GIFT_CODES[code]){showToast('Unknown code: '+code,2500);return;}
  if((SAVE.usedCodes||[]).includes(code)){showToast('Code already redeemed.',2500);return;}
  const g=GIFT_CODES[code];
  SAVE.gold+=g.gold||0;
  SAVE.orbs+=g.orbs||0;
  SAVE.essence+=g.essence||0;
  if(g.unlock){g.unlock.forEach(id=>{if(SAVE.collection[id])SAVE.collection[id].owned=true;});}
  if(g.unlockAll){Object.keys(SAVE.collection).forEach(id=>SAVE.collection[id].owned=true);}
  if(!SAVE.usedCodes)SAVE.usedCodes=[];
  SAVE.usedCodes.push(code);
  inp.value='';
  saveGame();
  refreshHub();
  Audio.giftCode();
  showToast('✓ Code redeemed! '+g.desc,4500);
}
document.getElementById('code-input').addEventListener('keydown',e=>{if(e.key==='Enter')redeemCode();});

// ============================================================
// PORTAL
// ============================================================
function openPortal(){
  Audio.click();
  document.getElementById('portal-orbs').textContent=SAVE.orbs;
  document.getElementById('portal-pity').textContent=SAVE.pullPity;
  document.getElementById('portal-result').classList.add('hidden');
  document.getElementById('overlay-portal').classList.remove('hidden');
}
function closePortal(){
  document.getElementById('overlay-portal').classList.add('hidden');
  refreshHub();
}
function doPull(count){
  const cost=count===1?10:90;
  if(SAVE.orbs<cost){showToast('Not enough Orbs!',2000);return;}
  SAVE.orbs-=cost;
  const results=[];
  for(let i=0;i<count;i++){
    SAVE.pullPity++;
    const mId=getRandomPull(SAVE.pullPity);
    const def=MONSTER_DEFS[mId];
    const col=SAVE.collection[mId];
    let isNew=false;
    if(!col.owned){col.owned=true;isNew=true;SAVE.pullPity=0;}
    else{SAVE.essence+=rarityEssence(def.rarity);}
    if(['rare','epic','legendary'].includes(def.rarity))SAVE.pullPity=0;
    results.push({def,isNew});
  }
  const worst=results.reduce((b,r)=>rarityOrder(r.def.rarity)>rarityOrder(b.def.rarity)?r:b,results[0]);
  Audio.pull(worst.def.rarity);
  const res=document.getElementById('portal-result');
  res.classList.remove('hidden');
  res.innerHTML='';
  results.forEach(r=>{
    const row=document.createElement('div');row.className='pull-item';
    const c=document.createElement('canvas');c.width=44;c.height=44;
    drawMonster(c.getContext('2d'),r.def,22,22,18);
    const info=document.createElement('div');
    info.innerHTML='<div class="pull-item-name">'+r.def.name+(r.isNew?' <span style="color:var(--green)">NEW!</span>':'')+'</div>'
        +'<div class="pull-item-rarity rarity-'+r.def.rarity+'">'+cap(r.def.rarity)+(!r.isNew?' → +'+rarityEssence(r.def.rarity)+' Essence':'')+'</div>';
    row.appendChild(c);row.appendChild(info);
    res.appendChild(row);
  });
  document.getElementById('portal-orbs').textContent=SAVE.orbs;
  document.getElementById('portal-pity').textContent=SAVE.pullPity;
  saveGame();
}
function rarityOrder(r){return{common:0,uncommon:1,rare:2,epic:3,legendary:4,mythic:5}[r]||0;}

// ============================================================
// FORGE
// ============================================================
function openForge(){
  Audio.click();
  if(SAVE.wardenRank<5){showToast('Relic Forge unlocks at Warden Rank 5.',2500);return;}
  showToast(SAVE.relics.length?'Relics: '+SAVE.relics.join(', '):'No Relics yet — clear Hard mode maps.',3000);
}

// ============================================================
// ROSTER
// ============================================================
function filterRoster(role,btn){
  Audio.click();
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderRoster(role);
}
function renderRoster(role){
  const grid=document.getElementById('roster-grid');
  grid.innerHTML='';
  Object.values(MONSTER_DEFS)
      .filter(m=>role==='all'||m.role===role)
      .forEach(m=>{
        const col=SAVE.collection[m.id];
        const owned=col&&col.owned;
        const card=document.createElement('div');
        card.className = 'roster-card' + (owned ? '' : ' locked');
        card.onclick=()=>openMonsterDetail(m.id);
        const c=document.createElement('canvas');c.width=68;c.height=68;
        drawMonster(c.getContext('2d'),m,34,34,26,owned?1:0.35);
        card.appendChild(c);
        const dot=document.createElement('div');dot.className='roster-card-rarity';
        dot.style.background=rarityColor(m.rarity);card.appendChild(dot);
        const nm=document.createElement('div');nm.className='roster-card-name';nm.textContent=m.name;card.appendChild(nm);
        const rl=document.createElement('div');rl.className='roster-card-role';rl.style.color = getRoleColor(m.role);rl.textContent=cap(m.role);card.appendChild(rl);
        if(owned){
          const stars=document.createElement('div');stars.className='roster-card-stars';
          for(let i=0;i<3;i++){const s=document.createElement('span');s.className='roster-star'+(i<(col.stars||0)?' lit':'');s.textContent='★';stars.appendChild(s);}
          card.appendChild(stars);
        }else{
          const lk=document.createElement('div');lk.style.cssText='font-size:10px;color:var(--text-dim)';lk.textContent='🔒 Locked';card.appendChild(lk);
        }
        grid.appendChild(card);
      });
}

// ============================================================
// MONSTER DETAIL + TABS
// ============================================================

function getRoleColor(role) {
  const r = role || 'text';
  return 'var(--' + r + ')';
}

function openMonsterDetail(mId){
  Audio.click();
  viewedMonster=mId;
  const m=MONSTER_DEFS[mId];
  const col=SAVE.collection[mId];
  const owned=col&&col.owned;
  const lv=col?col.level:1;
  const dc=document.getElementById('monster-detail-canvas');
  dc.width=110;dc.height=110;
  drawMonster(dc.getContext('2d'),m,55,55,44,owned?1:0.4);
  document.getElementById('md-name').textContent=m.name;
  const roleColor = m.role || 'text';
  const role = m.role || 'text';
  document.getElementById('md-role').innerHTML = '<span style="color:' + getRoleColor(role) + '">' + cap(role) + '</span>';
  document.getElementById('md-rarity').innerHTML='<span class="rarity-'+m.rarity+'">'+cap(m.rarity)+'</span>';
  const stars=document.getElementById('md-stars');stars.innerHTML='';
  for(let i=0;i<3;i++){const s=document.createElement('span');s.className='md-star'+(i<(col?col.stars||0:0)?' lit':'');s.textContent='★';stars.appendChild(s);}
  document.getElementById('md-level').textContent='Level '+lv;
  // Stats tab
  const hp=Math.floor(m.hp*(1+lv*.12));
  const dmg=Math.floor(m.damage*(1+lv*.10));
  document.getElementById('mtab-stats').innerHTML=
      '<div class="stat-row"><span>Level</span><b>'+lv+'</b></div>'
      +'<div class="stat-row"><span>HP</span><b>'+hp+'</b><div class="stat-bar-wrap"><div class="stat-bar-fill" style="width:'+Math.min(100,hp/400*100)+'%;background:var(--green)"></div></div></div>'
      +'<div class="stat-row"><span>Damage</span><b>'+dmg+'</b><div class="stat-bar-wrap"><div class="stat-bar-fill" style="width:'+Math.min(100,dmg/50*100)+'%;background:var(--red)"></div></div></div>'
      +'<div class="stat-row"><span>Range</span><b>'+m.range+'px</b><div class="stat-bar-wrap"><div class="stat-bar-fill" style="width:'+Math.min(100,m.range/180*100)+'%;background:var(--cyan)"></div></div></div>'
      +'<div class="stat-row"><span>Atk Speed</span><b>'+(1000/m.atkSpeed).toFixed(1)+'/s</b></div>'
      +'<div class="stat-row"><span>Speed</span><b>'+m.speed+'</b></div>'
      +'<div class="stat-row"><span>Special</span><b>'+m.special.name+'</b></div>'
      +'<div style="font-size:10px;color:var(--text-muted);padding:6px 0">'+m.special.desc+'</div>';
  // Guide tab
  document.getElementById('mtab-guide').innerHTML=
      '<div class="guide-section"><div class="guide-label">ROLE — '+cap(m.role).toUpperCase()+'</div>'
      +'<div class="guide-text">'+roleDesc(m.role)+'</div></div>'
      +'<div class="guide-section"><div class="guide-label">POSSESS GUIDE</div>'
      +'<div class="guide-tip">'+m.possessTip+'</div></div>'
      +'<div class="guide-section"><div class="guide-label">SPECIAL — '+m.special.name+'</div>'
      +'<div class="guide-text">'+m.special.icon+' '+m.special.desc+'<br><span style="color:var(--text-muted)">Cooldown: '+(m.special.cd/1000).toFixed(0)+'s</span></div></div>';
  // Lore tab
  document.getElementById('mtab-lore').innerHTML=
      '<div class="lore-quote">"'+m.desc+'"</div>'
      +'<div class="guide-text" style="color:var(--text-muted)">'+m.lore+'</div>';
  // active tab = stats
  document.querySelectorAll('.mtab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.mtab')[0].classList.add('active');
  document.querySelectorAll('.mtab-content').forEach(t=>t.classList.add('hidden'));
  document.getElementById('mtab-stats').classList.remove('hidden');
  const cost=upgradeCost(mId);
  const btn=document.getElementById('monster-upgrade-btn');
  btn.textContent='Upgrade (◈ '+cost+')';
  btn.disabled=!owned||SAVE.gold<cost;
  document.getElementById('overlay-monster').classList.remove('hidden');
}
function switchMTab(tab,btn){
  document.querySelectorAll('.mtab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.mtab-content').forEach(t=>t.classList.add('hidden'));
  document.getElementById('mtab-'+tab).classList.remove('hidden');
}
function closeMonsterDetail(){document.getElementById('overlay-monster').classList.add('hidden');viewedMonster=null;}
function upgradeMonster(){
  if(!viewedMonster)return;
  const cost=upgradeCost(viewedMonster);
  if(SAVE.gold<cost){showToast('Not enough Gold!',2000);return;}
  SAVE.gold-=cost;SAVE.collection[viewedMonster].level++;
  grantXP(20);saveGame();openMonsterDetail(viewedMonster);refreshHub();
  Audio.purchase();
  showToast(MONSTER_DEFS[viewedMonster].name+' upgraded to level '+SAVE.collection[viewedMonster].level+'!',2500);
}
function upgradeCost(id){return Math.floor(50*Math.pow(1.4,(SAVE.collection[id]?.level||1)-1));}
function roleDesc(role){
  return{
    anchor:'Anchors hold the front line with high HP and melee damage. They can take sustained punishment and block path progress. Slow but unstoppable.',
    ravager:'Ravagers are fast single-target killers. Low HP but extremely high damage-per-second. Ideal possessed — their speed lets you chase down priority targets.',
    weaver:'Weavers debuff and slow the enemy advance. Their value multiplies when combined with high-DPS allies. Possess to aim slows precisely.',
    artillerist:'Artillerists deal splash damage at long range. Devastating against packed groups. Possess to manually aim for maximum hit count.',
    whisper:'Whispers strike from stealth for burst damage. Possessed Whispers are ambush specialists — hit hard, vanish, reposition.',
    conduit:'Conduits buff, heal, and amplify nearby allies. Possess to direct their abilities at whoever needs it most.',
  }[role]||'A versatile defender.';
}

// ============================================================
// MAP SELECT
// ============================================================
function renderMapSelect(){
  const list=document.getElementById('map-list');list.innerHTML='';
  Object.values(MAP_DEFS).forEach(map=>{
    const prog=SAVE.mapProgress[map.id]||{};
    const locked=map.locked&&!prog.normalCleared;
    const card=document.createElement('div');
    card.className='map-card';
    if(locked)card.style.opacity='0.5';
    card.innerHTML='<div class="map-card-icon">'+map.icon+'</div>'
        +'<div class="map-card-body"><div class="map-card-title">'+map.name+'</div>'
        +'<div class="map-card-world">'+map.world+'</div>'
        +'<div class="map-card-desc">'+map.desc+'</div>'
        +'<div class="map-card-progress">'
        +'<span class="mode-badge'+(prog.normalCleared?' cleared':'')+'">Normal'+(prog.normalCleared?' ✓':'')+'</span>'
        +'<span class="mode-badge'+(prog.hardCleared?' cleared':'')+'">Hard'+(prog.hardCleared?' ✓':'')+'</span>'
        +'</div></div>';
    if(!locked){card.style.cursor='pointer';card.onclick=()=>openPreRun(map.id);}
    list.appendChild(card);
  });
}

// ============================================================
// PRE-RUN
// ============================================================
function openPreRun(mapId){
  Audio.click();
  activeMapId=mapId;prerunUnits=[];prerunSpells=[];
  document.getElementById('prerun-title').textContent=MAP_DEFS[mapId].name;
  const uGrid=document.getElementById('prerun-unit-grid');uGrid.innerHTML='';
  Object.values(MONSTER_DEFS).filter(m=>SAVE.collection[m.id]?.owned).forEach(m=>{
    const card=document.createElement('div');card.className='prerun-unit-card';card.dataset.id=m.id;
    const c=document.createElement('canvas');c.width=50;c.height=50;drawMonster(c.getContext('2d'),m,25,25,20);
    card.appendChild(c);
    const nm=document.createElement('div');nm.className='prerun-unit-name';nm.textContent=m.name;card.appendChild(nm);
    card.onclick=()=>togglePreUnit(m.id,card);
    uGrid.appendChild(card);
  });
  const sGrid=document.getElementById('prerun-spell-grid');sGrid.innerHTML='';
  Object.values(SPELL_DEFS).forEach(sp=>{
    const card=document.createElement('div');card.className='prerun-spell-card';card.dataset.id=sp.id;
    card.innerHTML='<div class="prerun-spell-icon">'+sp.icon+'</div><div class="prerun-spell-name">'+sp.name+'</div><div class="prerun-spell-desc">'+sp.desc+'</div>';
    card.onclick=()=>togglePreSpell(sp.id,card);
    sGrid.appendChild(card);
  });
  refreshPreSlots();
  showScreen('screen-prerun');
}
function togglePreUnit(id,card){
  if(prerunUnits.includes(id)){prerunUnits=prerunUnits.filter(u=>u!==id);card.classList.remove('selected');}
  else{if(prerunUnits.length>=4){showToast('Max 4 units.',1600);return;}prerunUnits.push(id);card.classList.add('selected');}
  refreshPreSlots();
}
function togglePreSpell(id,card){
  if(prerunSpells.includes(id)){prerunSpells=prerunSpells.filter(s=>s!==id);card.classList.remove('selected');}
  else{if(prerunSpells.length>=2){showToast('Max 2 spells.',1600);return;}prerunSpells.push(id);card.classList.add('selected');}
  refreshPreSlots();
}
function refreshPreSlots(){
  const uRow=document.getElementById('prerun-selected-units');uRow.innerHTML='';
  for(let i=0;i<4;i++){
    const slot=document.createElement('div');
    if(i<prerunUnits.length){
      slot.className='prerun-slot filled';
      const c=document.createElement('canvas');c.width=38;c.height=38;drawMonster(c.getContext('2d'),MONSTER_DEFS[prerunUnits[i]],19,19,16);slot.appendChild(c);
    }else{slot.className='prerun-slot';slot.textContent=i+1;}
    uRow.appendChild(slot);
  }
  const sRow=document.getElementById('prerun-selected-spells');sRow.innerHTML='';
  for(let i=0;i<2;i++){
    const slot=document.createElement('div');
    if(i<prerunSpells.length){slot.className='prerun-slot filled';slot.style.fontSize='22px';slot.textContent=SPELL_DEFS[prerunSpells[i]].icon;}
    else{slot.className='prerun-slot';slot.textContent=i+1;}
    sRow.appendChild(slot);
  }
  document.getElementById('start-run-btn').disabled=prerunUnits.length===0;
}

// ============================================================
// START RUN
// ============================================================
function startRun(){
  if(prerunUnits.length===0){showToast('Pick at least 1 unit!',1600);return;}
  if(prerunSpells.length===0)prerunSpells=[Object.keys(SPELL_DEFS)[0]];
  Audio.click();
  const map=MAP_DEFS[activeMapId];
  const pathPx=buildPath(map.waypoints);
  const pathSet=buildPathSet(map.waypoints);
  RUN={
    mapId:activeMapId,mapDef:map,wave:0,phase:'intermission',
    shards:0,goldEarned:0,
    baseHP:100+(SAVE.relics.includes('life_stone')?20:0),
    baseMaxHP:100+(SAVE.relics.includes('life_stone')?20:0),
    enemies:[],units:[],
    teamDefs:prerunUnits.map(id=>MONSTER_DEFS[id]),
    equippedSpells:prerunSpells.map(id=>({def:SPELL_DEFS[id],currentCd:0})),
    pathPx,pathSet,
    possessedIdx:-1,possessTarget:null,
    spawnQueue:[],spawnTimer:0,
    focusMeter:0,lastInputTime:0,
    combo:0,comboTimer:0,
    runDmgMult:1,runSpdMult:1,
    hasteActive:false,essenceLure:false,
    repositionTokens:0,repositionSource:null,
    placingUnitIdx:-1,
    overclockTimer:0,mirrorWalls:[],
    effects:[],score:0,
    possessGoldMult:POSSESS_GOLD,
    _idleAccum:0,_atkSoundTimer:{}
  };
  SAVE.totalRuns++;
  projectiles.length=0;homingProjs.length=0;floatTexts.length=0;
  mapBgCache=null;
  if(map.theme==='depths'){initSpores();}else{sporeParticles=[];}
  buildGameUI();
  showScreen('screen-game');
  document.getElementById('overlay-result').classList.add('hidden');
  document.getElementById('overlay-shop').classList.add('hidden');
  document.getElementById('possess-bar').classList.add('hidden');
  document.getElementById('place-prompt').classList.add('hidden');
  if(rafId)cancelAnimationFrame(rafId);
  lastFrame=0;rafId=requestAnimationFrame(loop);
  setTimeout(beginNextWave,500);
}

function initSpores(){
  sporeParticles=[];
  for(let i=0;i<35;i++){
    sporeParticles.push({x:Math.random()*CW,y:Math.random()*CH,
      r:Math.random()*2.5+0.8,vy:-(Math.random()*12+4),vx:(Math.random()-0.5)*2,
      life:Math.random(),maxLife:0.7+Math.random()*0.3,
      color:Math.random()>.5?'rgba(180,100,255,':'rgba(100,220,180,'});
  }
}

// ============================================================
// BUILD GAME UI
// ============================================================
function buildGameUI(){
  const teamBar=document.getElementById('team-bar');teamBar.innerHTML='';
  RUN.teamDefs.forEach((m,i)=>{
    const slot=document.createElement('div');slot.className='team-slot has-monster';slot.id='tslot-'+i;
    const c=document.createElement('canvas');c.width=34;c.height=34;drawMonster(c.getContext('2d'),m,17,17,14);
    slot.appendChild(c);
    const lbl=document.createElement('div');lbl.className='team-slot-label';lbl.textContent=m.name.slice(0,5);slot.appendChild(lbl);
    slot.onclick=()=>onTeamClick(i);
    teamBar.appendChild(slot);
  });
  const spellBar=document.getElementById('spell-bar');spellBar.innerHTML='';
  RUN.equippedSpells.forEach((es,i)=>{
    const btn=document.createElement('button');btn.className='spell-btn ready';btn.id='sbtn-'+i;
    btn.innerHTML='<span class="spell-icon">'+es.def.icon+'</span><span>'+es.def.name+'</span><div class="spell-cd-overlay" id="scd-'+i+'"></div>';
    btn.onclick=()=>castSpell(i);
    spellBar.appendChild(btn);
  });
}

// ============================================================
// WAVES
// ============================================================
function beginNextWave(){
  RUN.wave++;
  SAVE.bestWaves[activeMapId]=Math.max(SAVE.bestWaves[activeMapId]||0,RUN.wave);
  RUN.phase='wave';
  document.getElementById('hud-wave').textContent=RUN.wave;
  Audio.waveStart();
  showWaveBanner('WAVE '+RUN.wave,1400);
  const map=RUN.mapDef;
  const pool=map.normalEnemyPool;
  const count=Math.min(4+RUN.wave*2,35);
  RUN.spawnQueue=[];
  for(let i=0;i<count;i++){
    if(RUN.wave%5===0&&i===Math.floor(count/2)){RUN.spawnQueue.push(ENEMY_DEFS[map.eliteType]);}
    else if(RUN.wave===map.normalWaves&&i===0){RUN.spawnQueue.push(ENEMY_DEFS[map.bossType]);}
    else{
      const bias=Math.min(pool.length-1,Math.floor(RUN.wave/5));
      const idx=Math.min(pool.length-1,Math.floor(Math.random()*(bias+1)+Math.random()*pool.length*0.5));
      RUN.spawnQueue.push(ENEMY_DEFS[pool[Math.min(idx,pool.length-1)]]);
    }
  }
  RUN.spawnTimer=RUN.hasteActive?380:680-Math.min(380,RUN.wave*7);
  RUN.hasteActive=false;
}

function checkWaveEnd(){
  if(RUN.phase!=='wave')return;
  if(RUN.spawnQueue.length>0)return;
  if(RUN.enemies.length>0)return;
  RUN.phase='intermission';
  const bonus=Math.floor(18+RUN.wave*3);RUN.shards+=bonus;
  Audio.waveClear();
  showWaveBanner('Wave '+RUN.wave+' cleared! +'+bonus+' ▲',1800);
  grantXP(4+RUN.wave);saveGame();
  setTimeout(()=>{
    if(RUN.wave>=RUN.mapDef.normalWaves)triggerVictory();
    else if(RUN.wave%SHOP_EVERY===0)openShop();
    else beginNextWave();
  },2000);
}

// ============================================================
// SHOP
// ============================================================
function openShop(){
  RUN.phase='shop';
  Audio.shopOpen();
  const pool=[...SHOP_OFFER_DEFS];shuffle(pool);
  const offers=pool.slice(0,3);
  document.getElementById('shop-wave').textContent=RUN.wave;
  document.getElementById('shop-shards-val').textContent=Math.floor(RUN.shards);
  const el=document.getElementById('shop-offers');el.innerHTML='';
  offers.forEach((o,i)=>{
    const div=document.createElement('div');div.className='shop-offer';
    div.innerHTML='<div class="shop-offer-icon">'+o.icon+'</div>'
        +'<div class="shop-offer-body"><div class="shop-offer-name">'+o.name+'</div><div class="shop-offer-desc">'+o.desc+'</div></div>'
        +'<div class="shop-offer-cost">▲ '+o.cost+'</div>';
    div.onclick=()=>{
      if(div.classList.contains('purchased'))return;
      if(RUN.shards<o.cost){showToast('Not enough Shards!',1600);return;}
      RUN.shards-=o.cost;o.apply(RUN);div.classList.add('purchased');
      document.getElementById('shop-shards-val').textContent=Math.floor(RUN.shards);
      Audio.purchase();
    };
    el.appendChild(div);
  });
  document.getElementById('overlay-shop').classList.remove('hidden');
}
function closeShop(){
  Audio.click();
  document.getElementById('overlay-shop').classList.add('hidden');
  beginNextWave();
}

// ============================================================
// SPELLS
// ============================================================
function castSpell(idx){
  const es=RUN.equippedSpells[idx];
  if(!es||es.currentCd>0)return;
  Audio.click();
  const sp=es.def;
  if(sp.type==='buff'||sp.type==='drain'){execSpell(idx,null);}
  else{spellAiming={idx};showToast(sp.icon+' '+sp.name+': tap the battlefield',2000);}
}
function execSpell(idx,pt){
  const es=RUN.equippedSpells[idx];const sp=es.def;
  es.currentCd=sp.cooldown;spellAiming=null;
  Audio.specialAbility();
  switch(sp.type){
    case 'buff':
      if(sp.id==='overclock'){RUN.overclockTimer=sp.duration;addFloat(CW/2,CH/2-50,'⚡ OVERCLOCK!','#FFFF00',1.4);}
      break;
    case 'drain':{
      let h=0;
      for(const en of [...RUN.enemies]){const d=Math.min(en.hp,sp.drainPerEnemy);hitEnemy(en,d,'spell');h+=d;}
      RUN.baseHP=Math.min(RUN.baseMaxHP,RUN.baseHP+sp.baseHpRestore);
      addFloat(CW/2,CH/2,'SOUL LEECH','#CC44CC',1.3);break;
    }
    case 'line':if(!pt)return;
      RUN.effects.push({type:'line',y:pt.y,life:1,maxLife:1,color:sp.color});
      for(const en of [...RUN.enemies])if(Math.abs(en.y-pt.y)<35)hitEnemy(en,sp.damage,'spell');
      break;
    case 'aoe':if(!pt)return;{
      const r=95;RUN.effects.push({type:'pulse',x:pt.x,y:pt.y,radius:10,maxRadius:r,life:1,color:sp.color});
      for(const en of RUN.enemies)if(d2(en.x,en.y,pt.x,pt.y)<=r*r)en.frozen=(en.frozen||0)+sp.freezeDuration;
      break;
    }
    case 'target':if(!pt)return;{
      let best=null,bd=80*80;
      for(const en of RUN.enemies){const dist2=d2(en.x,en.y,pt.x,pt.y);if(dist2<bd){bd=dist2;best=en;}}
      if(best){best.seg=Math.max(0,best.seg-3);best.x=RUN.pathPx[best.seg].x;best.y=RUN.pathPx[best.seg].y;
        RUN.effects.push({type:'pulse',x:best.x,y:best.y,radius:10,maxRadius:55,life:1,color:sp.color});
        addFloat(best.x,best.y-20,'VOID PULL!',sp.color,1.2);}
      else{es.currentCd=0;showToast('No enemy close enough.',1500);}
      break;
    }
    case 'wall':if(!pt)return;
      RUN.mirrorWalls.push({col:Math.floor(pt.x/CELL),row:Math.floor(pt.y/CELL),timer:sp.duration});
      break;
  }
}

// ============================================================
// POSSESS
// ============================================================
function possessUnit(i){
  RUN.possessedIdx=i;RUN.lastInputTime=performance.now();
  Audio.possess();updatePossessBar();
  document.getElementById('possess-bar').classList.remove('hidden');
}
function releasePossess(){
  RUN.possessedIdx=-1;RUN.possessTarget=null;
  Audio.releasePossess();
  document.getElementById('possess-bar').classList.add('hidden');
  updateTeamSlots();
}
function updatePossessBar(){
  if(RUN.possessedIdx<0||RUN.possessedIdx>=RUN.units.length)return;
  const u=RUN.units[RUN.possessedIdx];
  document.getElementById('possess-name').textContent=u.def.name;
  updateSpecialBtn(u);updateTeamSlots();
}
function updateSpecialBtn(u){
  const btn=document.getElementById('possess-special-btn');
  const cd=document.getElementById('possess-special-cd');
  if(u.specialCd<=0){btn.classList.add('ready');cd.textContent='READY';}
  else{btn.classList.remove('ready');cd.textContent=(u.specialCd/1000).toFixed(1)+'s';}
}
function triggerSpecial(){
  if(RUN.possessedIdx<0)return;
  const u=RUN.units[RUN.possessedIdx];
  if(u.specialCd>0)return;
  u.specialCd=u.def.special.cd;
  Audio.specialAbility();
  RUN.lastInputTime=performance.now();
  const id=u.def.id;
  if(id==='gorpax'){aoeHit(u.x,u.y,120,40,'unit');freezeR(u.x,u.y,100,1500);pulse(u.x,u.y,120,u.def.color);}
  else if(id==='buzz'||id==='vix')dashThru(u,200,2);
  else if(id==='splotch'){freezeR(u.x,u.y,100,4000);pulse(u.x,u.y,100,u.def.color);}
  else if(id==='pip')buffNear(u,85,1.8,5000);
  else if(id==='noctis'){u.stealthTimer=3000;u.stealthBuff=true;}
  else if(id==='mirrek'){for(let a=-60;a<=60;a+=30){const rad=a*Math.PI/180;spawnProj(u.x,u.y,u.x+Math.cos(rad)*200,u.y+Math.sin(rad)*200,25,u.def.color);}}
  else if(id==='sparkmite'){chainLightning(u.x,u.y,5,15);}
  else if(id==='zara'){freezeR(u.x,u.y,130,3000);pulse(u.x,u.y,130,u.def.color);}
  else if(id==='thornback'){u.shieldTimer=4000;pulse(u.x,u.y,55,u.def.color);}
  else if(id==='fenwick'){const a=nearestAlly(u);if(a){a.shield=(a.shield||0)+50;buffNear(u,1,1,0);}}
  else if(id==='duskwing'){let tot=0;aoeHit(u.x,u.y,95,30,'unit');tot+=30;u.hp=Math.min(u.maxHp,u.hp+tot);}
  else if(id==='mirelle'){RUN.units.forEach(a=>a.hp=Math.min(a.maxHp,a.hp+30));addFloat(u.x,u.y-30,'MASS HEAL +30','#FF88CC',1.3);}
  else if(id==='kalux'){const t=RUN.possessTarget||nearestEnemyPos(u.x,u.y)||{x:u.x,y:u.y-150};aoeHit(t.x,t.y,100,80,'unit');pulse(t.x,t.y,100,u.def.color);}
  else if(id==='librarian'){RUN.enemies.slice(0,3).forEach(en=>spawnHoming(u.x,u.y,en,15,u.def.color));}
  else if(id==='cruxor'){RUN.enemies.filter(en=>d2(en.x,en.y,u.x,u.y)<=120*120).forEach(en=>{en.poison=(en.poison||0)+5000;});}
  else if(id==='blastt'){u.overchargeCnt=3;}
  else if(id==='solenne'){const h=8*RUN.enemies.length;RUN.units.forEach(a=>a.hp=Math.min(a.maxHp,a.hp+h));addFloat(u.x,u.y-30,'RESONANCE +'+h,'#FFD700',1.3);pulse(u.x,u.y,200,'#FFD700');}
  else if(id==='vortex'){u.phaseTimer=2000;aoeHit(u.x,u.y,140,45,'unit');pulse(u.x,u.y,140,u.def.color);}
  else if(id==='grogg'){const t=nearestEnemy(u.x,u.y,200);if(t){hitEnemy(t,40,'unit');t.frozen=(t.frozen||0)+2000;spawnProj(u.x,u.y,t.x,t.y,40,u.def.color);}}
}
function nearestAlly(u){
  let best=null,bd=99999;
  for(const a of RUN.units){if(a===u)continue;const d=Math.hypot(a.x-u.x,a.y-u.y);if(d<bd){bd=d;best=a;}}
  return best;
}
function chainLightning(cx,cy,jumps,dmg){
  const hit=new Set();let x=cx,y=cy;
  for(let i=0;i<jumps;i++){
    let best=null,bd=160*160;
    for(const en of RUN.enemies){if(hit.has(en))continue;const dist2=d2(en.x,en.y,x,y);if(dist2<bd){bd=dist2;best=en;}}
    if(!best)break;
    hit.add(best);hitEnemy(best,dmg,'unit');
    RUN.effects.push({type:'line_seg',x1:x,y1:y,x2:best.x,y2:best.y,life:.5,color:'#AADDFF'});
    x=best.x;y=best.y;
  }
}
function updateTeamSlots(){
  RUN.teamDefs.forEach((_,i)=>{
    const s=document.getElementById('tslot-'+i);if(!s)return;
    const placed=RUN.units.find(u=>u.teamIdx===i);
    s.classList.toggle('placed',!!placed);
    s.classList.toggle('possessed',RUN.units.indexOf(placed)===RUN.possessedIdx&&!!placed);
  });
}

// ============================================================
// TEAM SLOT CLICK
// ============================================================
function onTeamClick(ti){
  Audio.click();
  RUN.lastInputTime=performance.now();
  const alreadyIdx=RUN.units.findIndex(u=>u.teamIdx===ti);
  if(alreadyIdx>=0){
    if(RUN.possessedIdx===alreadyIdx)releasePossess();
    else possessUnit(alreadyIdx);
    return;
  }
  RUN.placingUnitIdx=ti;
  document.getElementById('place-monster-name').textContent=RUN.teamDefs[ti].name;
  document.getElementById('place-prompt').classList.remove('hidden');
}
function cancelPlace(){RUN.placingUnitIdx=-1;document.getElementById('place-prompt').classList.add('hidden');}
function placeUnit(col,row){
  if(RUN.placingUnitIdx<0)return;
  const key=col+','+row;
  if(RUN.pathSet.has(key)){showToast("Can't place on the path.",1500);return;}
  if(col<0||col>=COLS||row<0||row>=ROWS)return;
  if(RUN.units.some(u=>u.col===col&&u.row===row)){showToast('Tile occupied.',1500);return;}
  if(RUN.mirrorWalls.some(w=>w.col===col&&w.row===row)){showToast('Blocked by Mirror Wall.',1500);return;}
  const mDef=RUN.teamDefs[RUN.placingUnitIdx];
  const c=SAVE.collection[mDef.id];const lv=c?c.level:1;
  const u={def:mDef,teamIdx:RUN.placingUnitIdx,col,row,
    x:col*CELL+CELL/2,y:row*CELL+CELL/2,
    hp:Math.floor(mDef.hp*(1+lv*.12)),maxHp:Math.floor(mDef.hp*(1+lv*.12)),
    atkCd:0,specialCd:0,stealthTimer:0,stealthBuff:false,shieldTimer:0,phaseTimer:0,
    buffTimer:0,buffMult:1,dmgMult:1+lv*.10,target:null,lastSoundMs:0,
    overchargeCnt:0,shield:0,poison:0};
  const ti=RUN.placingUnitIdx;
  RUN.units.push(u);
  RUN.placingUnitIdx=-1;
  document.getElementById('place-prompt').classList.add('hidden');
  const slot=document.getElementById('tslot-'+ti);if(slot)slot.classList.add('placed');
  Audio.place();
}

// ============================================================
// PATH
// ============================================================
function buildPath(wp){return wp.map(([c,r])=>({x:c*CELL+CELL/2,y:r*CELL+CELL/2}));}
function buildPathSet(wp){
  const s=new Set();
  for(let i=0;i<wp.length-1;i++){
    let [c1,r1]=wp[i],[c2,r2]=wp[i+1];
    c1=Math.max(0,c1);c2=Math.max(0,c2);
    if(r1===r2){for(let c=Math.min(c1,c2);c<=Math.max(c1,c2);c++)s.add(c+','+r1);}
    else{for(let r=Math.min(r1,r2);r<=Math.max(r1,r2);r++)s.add(c1+','+r);}
  }
  return s;
}

// ============================================================
// COMBAT
// ============================================================
function hitEnemy(en,dmg,src){
  if((en.shield||0)>0){const abs=Math.min(en.shield,dmg);en.shield-=abs;dmg-=abs;if(dmg<=0){addFloat(en.x,en.y-14,'SHIELD','#AAAAFF');return;}}
  en.hp-=dmg;if(en.hp<=0)killEnemy(en,src);
}
function killEnemy(en,src){
  RUN.enemies=RUN.enemies.filter(e=>e!==en);
  const base=ENEMY_DEFS[en.typeId]?.reward||3;
  const focus=1+RUN.focusMeter*FOCUS_BONUS;
  const poss=(RUN.possessedIdx>=0&&src==='unit')?(RUN.possessGoldMult||2):1;
  const earned=Math.floor(base*focus*poss);
  RUN.shards+=earned;RUN.goldEarned+=earned;
  if(RUN.essenceLure)SAVE.essence+=1;
  addFloat(en.x,en.y-12,'+'+earned,src==='unit'?'#4FD1C5':'#F2A65A');
  Audio.enemyDeath(en.isElite,en.isBoss);
  RUN.combo++;RUN.comboTimer=2500;
  if(RUN.combo>=5)addFloat(en.x,en.y-28,'COMBO ×'+RUN.combo,'#FFD700',1.2);
}
function aoeHit(cx,cy,r,dmg,src){for(const en of [...RUN.enemies])if(d2(en.x,en.y,cx,cy)<=r*r)hitEnemy(en,dmg,src);}
function freezeR(cx,cy,r,ms){for(const en of RUN.enemies)if(d2(en.x,en.y,cx,cy)<=r*r)en.frozen=(en.frozen||0)+ms;}
function dashThru(u,range,mult){
  const t=nearestEnemy(u.x,u.y,range);if(!t)return;
  const dx=t.x-u.x,dy=t.y-u.y,d=Math.hypot(dx,dy)||1;
  const nx=u.x+dx/d*Math.min(range,d),ny=u.y+dy/d*Math.min(range,d);
  for(const en of [...RUN.enemies])if(segDist(en.x,en.y,u.x,u.y,nx,ny)<18)hitEnemy(en,Math.floor(u.def.damage*mult*u.dmgMult),'unit');
  u.x=clamp(nx,CELL/2,CW-CELL/2);u.y=clamp(ny,CELL/2,CH-CELL/2);
}
function buffNear(u,r,mult,ms){
  for(const a of RUN.units){if(a===u)continue;if(Math.hypot(a.x-u.x,a.y-u.y)<=r){a.buffMult=mult;a.buffTimer=ms;}}
}
function pulse(x,y,maxR,color){RUN.effects.push({type:'pulse',x,y,radius:10,maxRadius:maxR,life:1,color});}
function nearestEnemy(x,y,range=99999){
  let best=null,bd=range*range;
  for(const en of RUN.enemies){const dist2=d2(en.x,en.y,x,y);if(dist2<bd){bd=dist2;best=en;}}
  return best;
}
function nearestEnemyAt(x,y,thr){let best=null,bd=thr*thr;for(const en of RUN.enemies){const dist2=d2(en.x,en.y,x,y);if(dist2<bd){bd=dist2;best=en;}}return best;}
function nearestEnemyPos(x,y){const en=nearestEnemy(x,y);return en?{x:en.x,y:en.y}:null;}

// ============================================================
// UNIT AI
// ============================================================
function updateUnit(u,dt,now){
  u.atkCd=Math.max(0,u.atkCd-dt*1000);
  u.specialCd=Math.max(0,u.specialCd-dt*1000);
  u.stealthTimer=Math.max(0,(u.stealthTimer||0)-dt*1000);
  u.shieldTimer=Math.max(0,(u.shieldTimer||0)-dt*1000);
  u.buffTimer=Math.max(0,(u.buffTimer||0)-dt*1000);
  u.phaseTimer=Math.max(0,(u.phaseTimer||0)-dt*1000);
  u.poison=Math.max(0,(u.poison||0)-dt*1000);
  if(u.buffTimer<=0)u.buffMult=1;
  // Grogg passive regen
  if(u.def.id==='grogg')u.hp=Math.min(u.maxHp,u.hp+5*dt);
  const isPossessed=RUN.units.indexOf(u)===RUN.possessedIdx;
  if(isPossessed){
    if(RUN.possessTarget){
      const dx=RUN.possessTarget.x-u.x,dy=RUN.possessTarget.y-u.y,d=Math.hypot(dx,dy);
      const step=u.def.speed*dt;
      if(d<3||step>=d){u.x=RUN.possessTarget.x;u.y=RUN.possessTarget.y;RUN.possessTarget=null;}
      else{u.x+=dx/d*step;u.y+=dy/d*step;}
    }
    if(u.atkCd<=0){
      const en=u.target&&RUN.enemies.includes(u.target)?u.target:nearestEnemy(u.x,u.y,u.def.range*1.3);
      if(en&&d2(en.x,en.y,u.x,u.y)<=(u.def.range*1.3)**2){
        const ovr=RUN.overclockTimer>0?2:1;
        const mult=(u.stealthBuff?3:1)*u.dmgMult*u.buffMult*RUN.runDmgMult*(SAVE.relics.includes('possession_lens')?1.25:1)*ovr*(u.overchargeCnt>0?3:1);
        const dmg=Math.floor(u.def.damage*mult);
        hitEnemy(en,dmg,'unit');
        if(u.def.slow)en.frozen=(en.frozen||0)+600;
        if(u.def.splash)aoeHit(en.x,en.y,u.def.splash,Math.floor(dmg*.5),'unit');
        u.stealthBuff=false;
        if(u.overchargeCnt>0)u.overchargeCnt--;
        spawnProj(u.x,u.y,en.x,en.y,dmg,u.def.color);
        u.atkCd=u.def.atkSpeed*RUN.runSpdMult*(ovr===2?.5:1);
        // Sound throttle
        if(now-u.lastSoundMs>350){Audio.attack(u.def.role);u.lastSoundMs=now;}
      }
    }
    if(SAVE.relics.includes('regen_core'))u.hp=Math.min(u.maxHp,u.hp+8*dt);
    // Update possess HP bar
    const fill=document.getElementById('possess-hp-fill');
    if(fill)fill.style.width=Math.max(0,u.hp/u.maxHp*100)+'%';
    updateSpecialBtn(u);
  }else{
    // AI mode
    if(u.atkCd<=0){
      const en=nearestEnemy(u.x,u.y,u.def.range);
      if(en){
        const ovr=RUN.overclockTimer>0?2:1;
        const mult=u.dmgMult*u.buffMult*RUN.runDmgMult*ovr*(u.overchargeCnt>0?3:1);
        const dmg=Math.floor(u.def.damage*mult);
        hitEnemy(en,dmg,'unit');
        if(u.def.slow)en.frozen=(en.frozen||0)+600;
        if(u.def.splash)aoeHit(en.x,en.y,u.def.splash,Math.floor(dmg*.5),'unit');
        u.stealthBuff=false;
        if(u.overchargeCnt>0)u.overchargeCnt--;
        spawnProj(u.x,u.y,en.x,en.y,dmg,u.def.color);
        u.atkCd=u.def.atkSpeed*RUN.runSpdMult*(ovr===2?.5:1);
        if(now-u.lastSoundMs>400){Audio.attack(u.def.role);u.lastSoundMs=now;}
      }else u.atkCd=90;
    }
    // Conduit aura
    if(u.def.aura){
      for(const a of RUN.units){if(a===u)continue;if(Math.hypot(a.x-u.x,a.y-u.y)<=u.def.aura.range){
        if(u.def.aura.hpRegen)a.hp=Math.min(a.maxHp,a.hp+u.def.aura.hpRegen*dt);
        if(u.def.aura.damageBoost&&a.buffTimer<=0){a.buffMult=Math.max(a.buffMult,1+u.def.aura.damageBoost);}
      }}
    }
  }
  // Poison DoT
  if((u.poison||0)>0&&u.atkCd<100){
    aoeHit(u.x,u.y,u.def.range*.7,8*dt,'unit');
  }
}

// ============================================================
// ENEMY AI
// ============================================================
function updateEnemy(en,dt){
  if((en.frozen||0)>0){en.frozen-=dt*1000;return;}
  const path=RUN.pathPx;
  if(en.seg>=path.length-1){
    RUN.baseHP-=ENEMY_DEFS[en.typeId]?.damage||6;
    RUN.enemies=RUN.enemies.filter(e=>e!==en);
    addFloat(path[path.length-1].x,path[path.length-1].y-20,'BREACH!','#E24E4E',1.4);
    Audio.breach();
    if(RUN.baseHP<=0){RUN.baseHP=0;triggerDefeat();}
    return;
  }
  const tgt=path[en.seg+1];
  const mc=Math.floor(tgt.x/CELL),mr=Math.floor(tgt.y/CELL);
  if(RUN.mirrorWalls.some(w=>w.col===mc&&w.row===mr))return;
  const dx=tgt.x-en.x,dy=tgt.y-en.y,d=Math.hypot(dx,dy);
  const step=en.speed*dt;
  if(d<3||step>=d){en.x=tgt.x;en.y=tgt.y;en.seg++;}
  else{en.x+=dx/d*step;en.y+=dy/d*step;}
}

// ============================================================
// PROJECTILES & EFFECTS
// ============================================================
function spawnProj(fx,fy,tx,ty,dmg,color){
  const dx=tx-fx,dy=ty-fy,d=Math.hypot(dx,dy)||1;
  projectiles.push({x:fx,y:fy,dx:dx/d,dy:dy/d,speed:420,color,life:1});
}
function spawnHoming(fx,fy,target,dmg,color){
  homingProjs.push({x:fx,y:fy,target,speed:280,color,dmg,life:3000});
}
function updateProjectiles(dt){
  for(let i=projectiles.length-1;i>=0;i--){
    const p=projectiles[i];p.x+=p.dx*p.speed*dt;p.y+=p.dy*p.speed*dt;p.life-=dt*2;
    if(p.life<=0||p.x<-20||p.x>CW+20||p.y<-20||p.y>CH+20)projectiles.splice(i,1);
  }
  for(let i=homingProjs.length-1;i>=0;i--){
    const p=homingProjs[i];p.life-=dt*1000;
    if(p.life<=0||!RUN.enemies.includes(p.target)){homingProjs.splice(i,1);continue;}
    const dx=p.target.x-p.x,dy=p.target.y-p.y,d=Math.hypot(dx,dy)||1;
    if(d<10){hitEnemy(p.target,p.dmg,'unit');p.target.frozen=(p.target.frozen||0)+1800;homingProjs.splice(i,1);}
    else{p.x+=dx/d*p.speed*dt;p.y+=dy/d*p.speed*dt;}
  }
}
function updateEffects(dt){
  for(let i=RUN.effects.length-1;i>=0;i--){
    const e=RUN.effects[i];e.life-=dt*1.6;
    if(e.type==='pulse')e.radius=Math.min(e.maxRadius||80,e.radius+200*dt);
    if(e.life<=0)RUN.effects.splice(i,1);
  }
  for(let i=RUN.mirrorWalls.length-1;i>=0;i--){RUN.mirrorWalls[i].timer-=dt*1000;if(RUN.mirrorWalls[i].timer<=0)RUN.mirrorWalls.splice(i,1);}
  if(RUN.overclockTimer>0)RUN.overclockTimer-=dt*1000;
}
function addFloat(x,y,text,color,scale=1){floatTexts.push({x,y,text,color,scale,life:1,vy:-38});}
function updateFloats(dt){
  for(let i=floatTexts.length-1;i>=0;i--){
    const f=floatTexts[i];f.life-=dt*.9;f.y+=f.vy*dt;if(f.life<=0)floatTexts.splice(i,1);
  }
}
function updateSpores(dt){
  for(const s of sporeParticles){
    s.y+=s.vy*dt;s.x+=s.vx*dt;s.life-=dt*.4;
    if(s.life<=0){s.y=CH+10;s.x=Math.random()*CW;s.life=s.maxLife;}
    if(s.y<-10){s.y=CH+5;s.life=s.maxLife;}
  }
}

// ============================================================
// FOCUS
// ============================================================
function updateFocus(dt){
  const active=performance.now()-RUN.lastInputTime<ACTIVE_MS;
  if(active)RUN.focusMeter=Math.min(1,RUN.focusMeter+dt/FOCUS_RAMP);
  else RUN.focusMeter=Math.max(0,RUN.focusMeter-dt*FOCUS_DRAIN);
  const fill=document.getElementById('focus-fill');
  const lbl=document.getElementById('focus-label');
  const mult=document.getElementById('focus-mult');
  if(fill)fill.style.width=(RUN.focusMeter*100)+'%';
  if(lbl){lbl.textContent=active?'ACTIVE':'IDLE';lbl.style.color=active?'var(--cyan)':'var(--text-muted)';}
  if(mult)mult.textContent='×'+(1+RUN.focusMeter*FOCUS_BONUS).toFixed(1);
  RUN._idleAccum=(RUN._idleAccum||0)+IDLE_TRICKLE*dt;
  if(RUN._idleAccum>=1){const w=Math.floor(RUN._idleAccum);RUN.shards+=w;RUN.goldEarned+=w;RUN._idleAccum-=w;}
}

// ============================================================
// SPAWN
// ============================================================
function updateSpawn(dt){
  if(RUN.phase!=='wave'||RUN.spawnQueue.length===0)return;
  RUN.spawnTimer-=dt*1000;if(RUN.spawnTimer>0)return;
  const eDef=RUN.spawnQueue.shift();
  const path=RUN.pathPx;
  const hs=1+(RUN.wave-1)*.12;
  RUN.enemies.push({typeId:eDef.id,x:path[0].x,y:path[0].y,seg:0,
    hp:Math.floor(eDef.hp*hs),maxHp:Math.floor(eDef.hp*hs),
    shield:eDef.shield?Math.floor(eDef.shield*hs*.5):0,
    speed:eDef.speed*(0.94+Math.random()*.12),size:eDef.size,
    color:eDef.color,accent:eDef.accentColor,isElite:eDef.isElite||false,isBoss:eDef.isBoss||false,frozen:0});
  RUN.spawnTimer=Math.max(220,700-Math.min(450,RUN.wave*8));
}

// ============================================================
// MAIN LOOP
// ============================================================
function loop(ts){
  if(!lastFrame)lastFrame=ts;
  const dt=Math.min((ts-lastFrame)/1000,.05);lastFrame=ts;
  if(RUN&&currentScreen==='screen-game'&&RUN.phase!=='shop'){
    updateFocus(dt);
    if(RUN.comboTimer>0){RUN.comboTimer-=dt*1000;if(RUN.comboTimer<=0)RUN.combo=0;}
    updateSpawn(dt);
    for(const u of RUN.units)updateUnit(u,dt,ts);
    for(const en of [...RUN.enemies])updateEnemy(en,dt);
    updateProjectiles(dt);updateEffects(dt);updateFloats(dt);
    if(sporeParticles.length)updateSpores(dt);
    updateSpellUI();updateHUD();checkWaveEnd();
    draw(ts);
  }
  rafId=requestAnimationFrame(loop);
}

// ============================================================
// HUD UPDATE
// ============================================================
function updateHUD(){
  document.getElementById('run-gold').textContent=Math.floor(RUN.goldEarned);
  document.getElementById('run-shards').textContent=Math.floor(RUN.shards);
  document.getElementById('hud-hp-val').textContent=Math.max(0,Math.floor(RUN.baseHP));
  document.getElementById('hud-hp-fill').style.width=Math.max(0,RUN.baseHP/RUN.baseMaxHP*100)+'%';
}
function updateSpellUI(){
  RUN.equippedSpells.forEach((es,i)=>{
    const btn=document.getElementById('sbtn-'+i);const cd=document.getElementById('scd-'+i);if(!btn)return;
    if(es.currentCd>0){es.currentCd=Math.max(0,es.currentCd-16);btn.classList.remove('ready');btn.classList.add('on-cooldown');if(cd)cd.style.width=Math.max(0,(1-es.currentCd/es.def.cooldown)*100)+'%';}
    else{btn.classList.add('ready');btn.classList.remove('on-cooldown');if(cd)cd.style.width='100%';}
  });
}

// ============================================================
// DRAWING
// ============================================================
function draw(now){
  if(!mapBgCache)prerenderBg();
  ctx.drawImage(mapBgCache,0,0);
  drawMapAnimations(now);
  drawMirrorWalls();
  drawEffects();
  drawUnits(now);
  drawEnemies(now);
  drawProjectilesAndHomers();
  drawFloatTexts();
  if(spellAiming){
    ctx.strokeStyle='rgba(255,200,50,.25)';ctx.lineWidth=1;ctx.setLineDash([6,4]);
    ctx.strokeRect(4,4,CW-8,CH-8);ctx.setLineDash([]);
  }
}

// ---- Pre-render static background ----
function prerenderBg(){
  mapBgCache=document.createElement('canvas');mapBgCache.width=CW;mapBgCache.height=CH;
  const bc=mapBgCache.getContext('2d');
  const map=RUN.mapDef;
  // Base fill
  bc.fillStyle=map.bgColor;bc.fillRect(0,0,CW,CH);
  // Floor tiles in non-path cells
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    if(!RUN.pathSet.has(c+','+r))drawFloorTile(bc,map,c,r);
  }
  // Path tiles
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    if(RUN.pathSet.has(c+','+r)&&c>=0&&c<COLS)drawPathTile(bc,map,c,r);
  }
  // Path border line
  bc.beginPath();bc.moveTo(RUN.pathPx[0].x,RUN.pathPx[0].y);
  for(let i=1;i<RUN.pathPx.length;i++)bc.lineTo(RUN.pathPx[i].x,RUN.pathPx[i].y);
  bc.strokeStyle=map.pathStroke||'rgba(255,255,255,.1)';bc.lineWidth=3;bc.lineJoin='round';bc.stroke();
  // Decorations
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    if(!RUN.pathSet.has(c+','+r))drawDecor(bc,map,c,r);
  }
  // Exit marker
  const last=RUN.pathPx[RUN.pathPx.length-1];
  bc.beginPath();bc.arc(last.x,last.y,22,0,Math.PI*2);
  bc.fillStyle='rgba(220,30,30,.18)';bc.fill();
  bc.strokeStyle='rgba(220,60,60,.6)';bc.lineWidth=2;bc.stroke();
  bc.fillStyle='#E24E4E';bc.font='bold 10px monospace';bc.textAlign='center';bc.textBaseline='middle';
  bc.fillText('BASE',last.x,last.y);
  // Entry arrow
  const first=RUN.pathPx[0];
  bc.strokeStyle='rgba(180,220,255,.4)';bc.lineWidth=2;
  bc.beginPath();bc.moveTo(first.x-30,first.y);bc.lineTo(first.x-4,first.y);
  bc.moveTo(first.x-10,first.y-6);bc.lineTo(first.x-4,first.y);bc.lineTo(first.x-10,first.y+6);
  bc.stroke();
  // Grid
  bc.strokeStyle=map.gridColor||'rgba(255,255,255,.022)';bc.lineWidth=1;
  for(let c=0;c<=COLS;c++){bc.beginPath();bc.moveTo(c*CELL,0);bc.lineTo(c*CELL,CH);bc.stroke();}
  for(let r=0;r<=ROWS;r++){bc.beginPath();bc.moveTo(0,r*CELL);bc.lineTo(CW,r*CELL);bc.stroke();}
}

function drawFloorTile(bc,map,c,r){
  const x=c*CELL,y=r*CELL;
  if(map.theme==='keep'){
    bc.fillStyle='rgba(40,45,60,.6)';bc.fillRect(x+1,y+1,CELL-2,CELL-2);
    bc.strokeStyle='rgba(60,65,85,.5)';bc.lineWidth=.5;
    bc.strokeRect(x+4,y+4,CELL-8,CELL-8);
  }else if(map.theme==='depths'){
    bc.fillStyle='rgba(10,20,12,.7)';bc.fillRect(x+1,y+1,CELL-2,CELL-2);
    const h=cellHash(c,r);
    if(h%8<2){bc.fillStyle='rgba(40,80,30,.3)';bc.beginPath();bc.ellipse(x+CELL*.5,y+CELL*.5,(h%15+10),(h%12+8),h*.1,0,Math.PI*2);bc.fill();}
  }else if(map.theme==='coast'){
    bc.fillStyle='rgba(10,18,35,.65)';bc.fillRect(x+1,y+1,CELL-2,CELL-2);
    const h=cellHash(c,r);
    if(h%12<2){bc.fillStyle='rgba(20,40,80,.25)';bc.fillRect(x+6,y+6,CELL-12,CELL-12);}
  }
}
function drawPathTile(bc,map,c,r){
  const x=c*CELL,y=r*CELL;
  if(map.theme==='keep'){
    // Cobblestone
    bc.fillStyle='rgba(75,70,55,.8)';bc.fillRect(x,y,CELL,CELL);
    const h=cellHash(c,r);
    for(let i=0;i<3;i++){
      const sx=x+4+(h*7+i*19)%48,sy=y+4+(h*11+i*13)%48;
      const sw=(h*5+i*7)%16+10,sh=(h*3+i*9)%10+6;
      bc.fillStyle='rgba(90,85,65,.6)';bc.fillRect(sx,sy,sw,sh);
      bc.strokeStyle='rgba(45,42,32,.5)';bc.lineWidth=.5;bc.strokeRect(sx,sy,sw,sh);
    }
  }else if(map.theme==='depths'){
    bc.fillStyle='rgba(50,20,90,.7)';bc.fillRect(x,y,CELL,CELL);
    // Glowing edges
    const grd=bc.createLinearGradient(x,y,x+CELL,y+CELL);
    grd.addColorStop(0,'rgba(100,40,180,.3)');grd.addColorStop(.5,'rgba(140,60,220,.15)');grd.addColorStop(1,'rgba(100,40,180,.3)');
    bc.fillStyle=grd;bc.fillRect(x,y,CELL,CELL);
    bc.strokeStyle='rgba(160,80,255,.2)';bc.lineWidth=1;bc.strokeRect(x+1,y+1,CELL-2,CELL-2);
  }else if(map.theme==='coast'){
    bc.fillStyle='rgba(25,40,70,.75)';bc.fillRect(x,y,CELL,CELL);
    bc.strokeStyle='rgba(40,70,130,.3)';bc.lineWidth=.5;bc.strokeRect(x+2,y+2,CELL-4,CELL-4);
    // Wet shine
    bc.fillStyle='rgba(60,100,180,.1)';bc.fillRect(x+8,y+8,CELL-16,CELL-16);
  }
}
function drawDecor(bc,map,c,r){
  const h=cellHash(c,r);const x=c*CELL+CELL/2,y=r*CELL+CELL/2;
  if(map.theme==='keep'){
    const t=h%14;
    if(t<1){// Column
      bc.fillStyle='#58606A';bc.fillRect(x-7,y-CELL*.35,14,CELL*.7);
      bc.fillStyle='#44505A';bc.fillRect(x-10,y-CELL*.34,20,9);bc.fillRect(x-10,y+CELL*.2,20,9);
      bc.strokeStyle='rgba(0,0,0,.3)';bc.lineWidth=.5;bc.strokeRect(x-7,y-CELL*.35,14,CELL*.7);
    }else if(t<3){// Rubble
      bc.fillStyle='#404550';
      for(let i=0;i<4;i++){const rx=x+(h*7+i*13)%28-14,ry=y+(h*11+i*9)%28-14,rs=4+(h+i*7)%7;
        bc.beginPath();bc.ellipse(rx,ry,rs,rs*.65,(h+i)*.5,0,Math.PI*2);bc.fill();}
    }else if(t===3){// Torch glow
      bc.fillStyle='rgba(255,120,30,.08)';bc.beginPath();bc.arc(x,y,CELL*.4,0,Math.PI*2);bc.fill();
      bc.fillStyle='rgba(255,160,40,.15)';bc.beginPath();bc.arc(x,y,CELL*.2,0,Math.PI*2);bc.fill();
    }
  }else if(map.theme==='depths'){
    const t=h%12;
    if(t<1){// Mushroom
      const stH=CELL*.3;bc.fillStyle='#3A1A50';bc.fillRect(x-3,y,6,stH);
      const gc=bc.createRadialGradient(x,y,2,x,y,CELL*.25);
      gc.addColorStop(0,'rgba(220,80,255,.8)');gc.addColorStop(1,'rgba(180,50,220,.2)');
      bc.fillStyle=gc;bc.beginPath();bc.ellipse(x,y,CELL*.25,CELL*.15,0,Math.PI,0);bc.fill();
    }else if(t<2){// Crystal
      bc.strokeStyle='rgba(100,220,220,.5)';bc.lineWidth=1.5;
      const pts=4+(h%3);
      for(let i=0;i<pts;i++){const a=i/pts*Math.PI*2,r2=(h%8+6)*(i%2?.5:1);
        bc.beginPath();bc.moveTo(x,y);bc.lineTo(x+Math.cos(a)*r2,y+Math.sin(a)*r2);bc.stroke();}
      bc.fillStyle='rgba(80,200,200,.25)';bc.beginPath();bc.arc(x,y,4,0,Math.PI*2);bc.fill();
    }else if(t===2){// Biolum pool
      bc.fillStyle='rgba(80,220,140,.1)';bc.beginPath();bc.ellipse(x,y,CELL*.3,CELL*.2,h*.3,0,Math.PI*2);bc.fill();
      bc.strokeStyle='rgba(100,255,160,.2)';bc.lineWidth=1;bc.stroke();
    }
  }else if(map.theme==='coast'){
    const t=h%12;
    if(t<1){// Rock
      bc.fillStyle='#2A3545';
      for(let i=0;i<3;i++){const rx=x+(h*5+i*11)%20-10,ry=y+(h*7+i*13)%20-10,rs=6+(h+i*5)%9;
        bc.beginPath();bc.arc(rx,ry,rs,0,Math.PI*2);bc.fill();}
      bc.strokeStyle='rgba(60,80,110,.4)';bc.lineWidth=.5;bc.stroke();
    }else if(t<2){// Tide pool
      bc.fillStyle='rgba(20,50,120,.4)';bc.beginPath();bc.ellipse(x,y,CELL*.28,CELL*.18,h*.2,0,Math.PI*2);bc.fill();
      bc.strokeStyle='rgba(60,120,220,.3)';bc.lineWidth=1;bc.stroke();
      bc.fillStyle='rgba(180,220,255,.08)';bc.beginPath();bc.ellipse(x-4,y-3,CELL*.1,CELL*.06,0,0,Math.PI*2);bc.fill();
    }else if(t===2){// Seaweed
      bc.strokeStyle='rgba(30,120,60,.6)';bc.lineWidth=1.5;
      bc.beginPath();bc.moveTo(x,y+CELL*.25);
      bc.quadraticCurveTo(x+(h%10-5),y,x+(h%14-7)*1.5,y-CELL*.2);bc.stroke();
    }else if(t===3){// Debris plank
      bc.fillStyle='#2A1F10';bc.save();bc.translate(x,y);bc.rotate(h*.3);
      bc.fillRect(-CELL*.3,-3,CELL*.6,6);bc.restore();
      bc.strokeStyle='rgba(80,60,30,.3)';bc.lineWidth=.5;bc.stroke();
    }
  }
}
function drawMapAnimations(now){
  const map=RUN.mapDef;
  if(map.theme==='keep'){
    // Torch flicker in some tiles
    RUN.pathSet.forEach(key=>{const [c,r]=key.split(',').map(Number);
      if(cellHash(c,r)%14===3){
        const x=c*CELL+CELL/2,y=r*CELL+CELL/2;
        const flicker=.06+Math.sin(now*.008+c)*.04;
        ctx.fillStyle='rgba(255,130,30,'+flicker+')';
        ctx.beginPath();ctx.arc(x,y,CELL*.35,0,Math.PI*2);ctx.fill();
      }
    });
  }else if(map.theme==='depths'){
    // Animated spores
    for(const s of sporeParticles){
      const alpha=s.life*.6;
      ctx.globalAlpha=alpha;
      ctx.fillStyle=s.color+alpha+')';
      ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
    // Pulsing glow on mushroom cells
  }else if(map.theme==='coast'){
    // Subtle wave foam at top/bottom edges
    const foam=Math.sin(now*.002)*.04+.04;
    ctx.strokeStyle='rgba(180,220,255,'+foam+')';ctx.lineWidth=1;ctx.setLineDash([8,6]);
    ctx.beginPath();ctx.moveTo(0,8);ctx.lineTo(CW,8);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,CH-8);ctx.lineTo(CW,CH-8);ctx.stroke();
    ctx.setLineDash([]);
  }
}
function drawMirrorWalls(){
  for(const w of RUN.mirrorWalls){
    ctx.fillStyle='rgba(170,200,255,.22)';ctx.strokeStyle='rgba(180,210,255,.7)';ctx.lineWidth=2;
    ctx.fillRect(w.col*CELL+2,w.row*CELL+2,CELL-4,CELL-4);
    ctx.strokeRect(w.col*CELL+2,w.row*CELL+2,CELL-4,CELL-4);
  }
}
function drawEffects(){
  for(const e of RUN.effects){
    ctx.globalAlpha=Math.max(0,e.life);
    if(e.type==='pulse'){
      ctx.beginPath();ctx.arc(e.x,e.y,e.radius,0,Math.PI*2);
      ctx.strokeStyle=e.color;ctx.lineWidth=3;ctx.stroke();
    }else if(e.type==='circle'){
      ctx.beginPath();ctx.arc(e.x,e.y,e.radius||40,0,Math.PI*2);
      ctx.strokeStyle=e.color;ctx.lineWidth=2;ctx.stroke();
    }else if(e.type==='line'){
      ctx.fillStyle=e.color+'88';ctx.fillRect(0,e.y-22,CW,44);
    }else if(e.type==='line_seg'){
      ctx.strokeStyle=e.color;ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(e.x1,e.y1);ctx.lineTo(e.x2,e.y2);ctx.stroke();
    }
    ctx.globalAlpha=1;
  }
}
function drawUnits(now){
  for(let i=0;i<RUN.units.length;i++){
    const u=RUN.units[i];const poss=i===RUN.possessedIdx;
    // Phase / stealth alpha
    if((u.phaseTimer||0)>0)ctx.globalAlpha=.3+Math.sin(now*.02)*.1;
    else if((u.stealthTimer||0)>0)ctx.globalAlpha=.28+Math.sin(now*.015)*.1;
    // Glow rings
    if(RUN.overclockTimer>0){ctx.beginPath();ctx.arc(u.x,u.y,30,0,Math.PI*2);ctx.strokeStyle='rgba(255,255,0,.35)';ctx.lineWidth=4;ctx.stroke();}
    if((u.buffTimer||0)>0){ctx.beginPath();ctx.arc(u.x,u.y,28,0,Math.PI*2);ctx.strokeStyle='rgba(255,200,50,.45)';ctx.lineWidth=3;ctx.stroke();}
    if((u.shieldTimer||0)>0){ctx.beginPath();ctx.arc(u.x,u.y,32,0,Math.PI*2);ctx.strokeStyle='rgba(100,200,255,.45)';ctx.lineWidth=2.5;ctx.stroke();}
    drawMonster(ctx,u.def,u.x,u.y,20);
    ctx.globalAlpha=1;
    // Possess ring
    const rr=26+Math.sin(now/190)*2.5;
    ctx.beginPath();ctx.arc(u.x,u.y,rr,0,Math.PI*2);
    if(poss){ctx.strokeStyle=u.def.color;ctx.lineWidth=3;ctx.globalAlpha=.55+Math.sin(now/130)*.28;}
    else{ctx.strokeStyle='rgba(255,255,255,.14)';ctx.lineWidth=1.5;ctx.globalAlpha=.4;}
    ctx.stroke();ctx.globalAlpha=1;
    if(poss){ctx.beginPath();ctx.arc(u.x,u.y,u.def.range*1.3,0,Math.PI*2);ctx.strokeStyle='rgba(255,255,255,.06)';ctx.lineWidth=1;ctx.stroke();}
    // HP bar
    const bw=28,bh=4;
    ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(u.x-bw/2,u.y-26,bw,bh);
    const hr=Math.max(0,u.hp/u.maxHp);
    ctx.fillStyle=hr>.5?'#9FE85A':hr>.25?'#F2A65A':'#E24E4E';
    ctx.fillRect(u.x-bw/2,u.y-26,bw*hr,bh);
    // Aura ring for conduits
    if(u.def.aura){ctx.beginPath();ctx.arc(u.x,u.y,u.def.aura.range,0,Math.PI*2);ctx.strokeStyle='rgba(255,230,100,.08)';ctx.lineWidth=1;ctx.stroke();}
  }
}
function drawEnemies(now){
  for(const en of RUN.enemies){
    const frozen=(en.frozen||0)>0;
    const walk=Math.sin(now*.004*(en.speed/100))*.9;
    // Boss/elite glow
    if(en.isBoss){ctx.beginPath();ctx.arc(en.x,en.y,en.size+10+Math.sin(now*.003)*2,0,Math.PI*2);ctx.strokeStyle='rgba(220,20,60,.5)';ctx.lineWidth=4;ctx.stroke();}
    else if(en.isElite){ctx.beginPath();ctx.arc(en.x,en.y,en.size+6,0,Math.PI*2);ctx.strokeStyle='rgba(212,175,55,.5)';ctx.lineWidth=2.5;ctx.stroke();}
    if(frozen){ctx.beginPath();ctx.arc(en.x,en.y,en.size+3,0,Math.PI*2);ctx.strokeStyle='rgba(140,200,255,.5)';ctx.lineWidth=2;ctx.stroke();}
    // Per-type sprite
    drawEnemySprite(ctx,en,en.x,en.y,en.size,walk,frozen,now);
    // Shield visual
    if((en.shield||0)>0){ctx.beginPath();ctx.arc(en.x,en.y,en.size+4,0,Math.PI*2);ctx.strokeStyle='rgba(160,100,255,.7)';ctx.lineWidth=1.5;ctx.stroke();}
    // HP bar
    const bw=en.size*2+6,bh=4;
    ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(en.x-bw/2,en.y-en.size-11,bw,bh);
    ctx.fillStyle=en.isBoss?'#DC143C':en.isElite?'#D4AF37':'#E24E4E';
    ctx.fillRect(en.x-bw/2,en.y-en.size-11,bw*Math.max(0,en.hp/en.maxHp),bh);
  }
}

// -- Detailed per-type enemy sprites --
function drawEnemySprite(c,en,x,y,r,walk,frozen,now){
  const fc=frozen?'#AADDFF':en.color,ac=frozen?'#88BBDD':en.accent;
  const wo=walk*1.2;
  switch(en.typeId){
    case 'peasant': drawPeasant(c,x,y,r,fc,ac,wo); break;
    case 'guard':   drawGuard(c,x,y,r,fc,ac,wo); break;
    case 'archer':  drawArcher(c,x,y,r,fc,ac,wo); break;
    case 'knight':  drawKnight(c,x,y,r,fc,ac,wo); break;
    case 'mage':    drawMage(c,x,y,r,fc,ac,wo,now); break;
    case 'elite_knight': drawEliteKnight(c,x,y,r,fc,ac,wo,now); break;
    case 'boss_king':    drawBossKing(c,x,y,r,fc,ac,wo,now); break;
    default: c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=fc;c.fill();
  }
}
function drawPeasant(c,x,y,r,fc,ac,w){
  // Body
  c.beginPath();c.ellipse(x,y+w*.3,r*.7,r*.85,0,0,Math.PI*2);c.fillStyle=fc;c.fill();
  // Head
  c.beginPath();c.arc(x,y-r*.55,r*.38,0,Math.PI*2);c.fillStyle='#D4AA80';c.fill();
  // Pitchfork
  c.strokeStyle=ac;c.lineWidth=1.5;
  c.beginPath();c.moveTo(x+r*.5,y-r*.2+w);c.lineTo(x+r*.5,y-r*1.3+w);c.stroke();
  for(let i=-1;i<=1;i++){c.beginPath();c.moveTo(x+r*.5+i*4,y-r*1.3+w);c.lineTo(x+r*.5+i*4,y-r*1.05+w);c.stroke();}
  // Tunic seam
  c.strokeStyle='rgba(0,0,0,.25)';c.lineWidth=1;c.beginPath();c.moveTo(x,y-r*.2);c.lineTo(x,y+r*.5);c.stroke();
}
function drawGuard(c,x,y,r,fc,ac,w){
  // Armored body
  c.beginPath();c.ellipse(x+w*.2,y,r*.75,r*.9,0,0,Math.PI*2);c.fillStyle=fc;c.fill();
  // Helmet
  c.beginPath();c.arc(x+w*.2,y-r*.55,r*.44,0,Math.PI*2);c.fillStyle=ac;c.fill();
  c.fillStyle='rgba(0,0,0,.4)';c.fillRect(x+w*.2-r*.3,y-r*.65,r*.6,r*.15);// visor slit
  // Shield (left)
  c.fillStyle='#4060A0';c.beginPath();c.roundRect(x-r*1.1+w*.2,y-r*.55,r*.55,r*.9,4);c.fill();
  c.strokeStyle='#8090C0';c.lineWidth=1.5;c.stroke();
  // Sword (right)
  c.fillStyle='#C0C0C8';c.fillRect(x+r*.6+w*.2,y-r*.6,r*.18,r*1.2);
  c.fillStyle=ac;c.fillRect(x+r*.5+w*.2,y-r*.05,r*.38,r*.14);// crossguard
}
function drawArcher(c,x,y,r,fc,ac,w){
  // Body
  c.beginPath();c.ellipse(x+w*.2,y,r*.65,r*.82,0,0,Math.PI*2);c.fillStyle=fc;c.fill();
  // Hood
  c.beginPath();c.arc(x+w*.2,y-r*.55,r*.4,0,Math.PI*2);c.fillStyle=ac;c.fill();
  // Bow (left)
  c.strokeStyle='#6B4010';c.lineWidth=2;
  c.beginPath();c.arc(x-r*.7+w*.2,y,r*.55,-.9,.9,false);c.stroke();
  c.strokeStyle='rgba(200,180,140,.6)';c.lineWidth=.8;// string
  c.beginPath();c.moveTo(x-r*.7+Math.cos(-.9)*r*.55+w*.2,y+Math.sin(-.9)*r*.55);
  c.lineTo(x-r*.7+Math.cos(.9)*r*.55+w*.2,y+Math.sin(.9)*r*.55);c.stroke();
  // Arrow
  c.strokeStyle='#8B6010';c.lineWidth=1;
  c.beginPath();c.moveTo(x-r*.4+w*.2,y-r*.1);c.lineTo(x+r*.5+w*.2,y-r*.1);c.stroke();
}
function drawKnight(c,x,y,r,fc,ac,w){
  // Heavy armored body
  c.beginPath();c.ellipse(x+w*.15,y,r*.82,r*.95,0,0,Math.PI*2);c.fillStyle=fc;c.fill();
  c.strokeStyle=ac;c.lineWidth=1.5;c.stroke();
  // Helmet
  c.beginPath();c.arc(x+w*.15,y-r*.58,r*.48,0,Math.PI*2);c.fillStyle=fc;c.fill();c.stroke();
  // Visor
  c.fillStyle='rgba(0,0,0,.55)';c.fillRect(x+w*.15-r*.32,y-r*.67,r*.64,r*.16);
  // Kite shield
  c.fillStyle='#505060';
  c.beginPath();c.moveTo(x-r*1.1+w*.15,y-r*.55);c.lineTo(x-r*.5+w*.15,y-r*.55);c.lineTo(x-r*.5+w*.15,y+r*.35);c.lineTo(x-r*.82+w*.15,y+r*.65);c.closePath();c.fill();
  c.strokeStyle='#8080A0';c.lineWidth=1.5;c.stroke();
  // Heraldry hint
  c.strokeStyle='rgba(180,180,220,.4)';c.lineWidth=1;c.beginPath();c.moveTo(x-r*.8+w*.15,y-r*.2);c.lineTo(x-r*.8+w*.15,y+r*.2);c.stroke();
  c.beginPath();c.moveTo(x-r*1+w*.15,y);c.lineTo(x-r*.6+w*.15,y);c.stroke();
  // Greatsword
  c.fillStyle='#B0B0BC';c.fillRect(x+r*.55+w*.15,y-r*.75,r*.22,r*1.5);
  c.fillStyle=ac;c.fillRect(x+r*.42+w*.15,y-r*.12,r*.48,r*.16);
}
function drawMage(c,x,y,r,fc,ac,w,now){
  // Robe (taller oval)
  c.beginPath();c.ellipse(x+w*.15,y+r*.1,r*.62,r*.95,0,0,Math.PI*2);c.fillStyle=fc;c.fill();
  // Robe hem
  c.strokeStyle=ac;c.lineWidth=1;
  c.beginPath();c.ellipse(x+w*.15,y+r*.95,r*.62,r*.22,0,0,Math.PI);c.stroke();
  // Hat
  c.fillStyle=ac;
  c.beginPath();c.moveTo(x+w*.15,y-r*1.35);c.lineTo(x+r*.45+w*.15,y-r*.5);c.lineTo(x-r*.45+w*.15,y-r*.5);c.closePath();c.fill();
  c.beginPath();c.ellipse(x+w*.15,y-r*.5,r*.5,r*.14,0,0,Math.PI*2);c.fillStyle=ac;c.fill();
  // Staff
  c.strokeStyle='#6B4010';c.lineWidth=2;c.beginPath();c.moveTo(x+r*.55+w*.15,y+r*.6);c.lineTo(x+r*.55+w*.15,y-r*.9);c.stroke();
  // Glowing orb at tip
  const glow=.5+Math.sin(now*.006)*.3;
  const go=c.createRadialGradient(x+r*.55+w*.15,y-r*.95,0,x+r*.55+w*.15,y-r*.95,r*.22);
  go.addColorStop(0,'rgba(200,160,255,'+glow+')');go.addColorStop(1,'rgba(160,100,255,0)');
  c.fillStyle=go;c.beginPath();c.arc(x+r*.55+w*.15,y-r*.95,r*.22,0,Math.PI*2);c.fill();
}
function drawEliteKnight(c,x,y,r,fc,ac,w,now){
  drawKnight(c,x,y,r,fc,ac,w);
  // Gold trim
  c.strokeStyle='rgba(212,175,55,.8)';c.lineWidth=2;
  c.beginPath();c.ellipse(x+w*.15,y,r*.82,r*.95,0,0,Math.PI*2);c.stroke();
  // Plume
  const pa=[-.3,0,.3];
  pa.forEach((off,i)=>{
    c.strokeStyle=i===1?'#DC143C':'#D4AF37';c.lineWidth=1.5;
    c.beginPath();c.moveTo(x+w*.15,y-r*1.02);
    c.quadraticCurveTo(x+off*r*1.2+w*.15,y-r*1.5,x+off*r+w*.15,y-r*1.7);c.stroke();
  });
}
function drawBossKing(c,x,y,r,fc,ac,w,now){
  // Cape
  c.fillStyle='rgba(139,0,0,.7)';c.beginPath();c.ellipse(x+w*.1,y+r*.2,r*1.3,r*1.1,0,0,Math.PI*2);c.fill();
  // Heavy body
  c.beginPath();c.ellipse(x+w*.1,y,r*.92,r*1.05,0,0,Math.PI*2);c.fillStyle=fc;c.fill();
  c.strokeStyle=ac;c.lineWidth=2;c.stroke();
  // Helmet
  c.beginPath();c.arc(x+w*.1,y-r*.6,r*.52,0,Math.PI*2);c.fillStyle=fc;c.fill();c.strokeStyle=ac;c.stroke();
  // Crown
  c.fillStyle='#FFD700';
  [-.25,0,.25].forEach(off=>{c.beginPath();c.moveTo(x+off*r*.8+w*.1,y-r*1.06);c.lineTo(x+off*r*.4+w*.1,y-r*1.28);c.lineTo(x+(off+.12)*r*.8+w*.1,y-r*1.06);c.fill();});
  c.fillStyle='rgba(255,215,0,.5)';c.fillRect(x-r*.45+w*.1,y-r*1.08,r*.9,r*.12);
  // Huge sword
  c.fillStyle='#C0C8D0';c.fillRect(x+r*.7+w*.1,y-r*.9,r*.28,r*1.8);
  c.fillStyle=ac;c.fillRect(x+r*.52+w*.1,y-r*.05,r*.64,r*.2);
  // Aura pulse
  const ap=.12+Math.sin(now*.004)*.06;
  c.beginPath();c.arc(x,y,r*1.5,0,Math.PI*2);c.strokeStyle='rgba(220,20,60,'+ap+')';c.lineWidth=3;c.stroke();
}

function drawProjectilesAndHomers(){
  for(const p of projectiles){
    ctx.globalAlpha=Math.max(0,p.life);
    ctx.beginPath();ctx.arc(p.x,p.y,3.5,0,Math.PI*2);ctx.fillStyle=p.color;ctx.fill();
  }
  for(const p of homingProjs){
    ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.fillStyle=p.color;ctx.fill();
    ctx.beginPath();ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.strokeStyle=p.color+'80';ctx.lineWidth=1.5;ctx.stroke();
  }
  ctx.globalAlpha=1;
}
function drawFloatTexts(){
  ctx.textAlign='center';ctx.textBaseline='middle';
  for(const f of floatTexts){
    ctx.globalAlpha=Math.max(0,f.life);ctx.font='bold '+Math.floor(12*(f.scale||1))+'px monospace';ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y);
  }
  ctx.globalAlpha=1;
}

// ============================================================
// MONSTER RENDERER — detailed per-monster procedural art
// ============================================================
function drawMonster(c,def,cx,cy,r,alpha=1){
  c.save();c.globalAlpha*=alpha;
  const id=def.id;
  if(id==='gorpax')drawGorpax(c,def,cx,cy,r);
  else if(id==='grogg')drawGrogg(c,def,cx,cy,r);
  else if(id==='thornback')drawThornback(c,def,cx,cy,r);
  else if(id==='buzz')drawBuzz(c,def,cx,cy,r);
  else if(id==='vix')drawVix(c,def,cx,cy,r);
  else if(id==='sparkmite')drawSparkmite(c,def,cx,cy,r);
  else if(id==='splotch')drawSplotch(c,def,cx,cy,r);
  else if(id==='zara')drawZara(c,def,cx,cy,r);
  else if(id==='cruxor')drawCruxor(c,def,cx,cy,r);
  else if(id==='mirrek')drawMirrek(c,def,cx,cy,r);
  else if(id==='blastt')drawBlastt(c,def,cx,cy,r);
  else if(id==='kalux')drawKalux(c,def,cx,cy,r);
  else if(id==='pip')drawPip(c,def,cx,cy,r);
  else if(id==='mirelle')drawMirelle(c,def,cx,cy,r);
  else if(id==='solenne')drawSolenne(c,def,cx,cy,r);
  else if(id==='fenwick')drawFenwick(c,def,cx,cy,r);
  else if(id==='noctis')drawNoctis(c,def,cx,cy,r);
  else if(id==='duskwing')drawDuskwing(c,def,cx,cy,r);
  else if(id==='librarian')drawLibrarian(c,def,cx,cy,r);
  else if(id==='vortex')drawVortex(c,def,cx,cy,r);
  else{c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fillStyle=def.color;c.fill();}
  c.restore();
}

function drawGorpax(c,d,cx,cy,r){
  // Boulder body with cracks
  c.beginPath();c.arc(cx,cy+r*.08,r,0,Math.PI*2);
  const g=c.createRadialGradient(cx-r*.3,cy-r*.3,r*.1,cx,cy,r);
  g.addColorStop(0,'#A0B0C8');g.addColorStop(1,d.accent);c.fillStyle=g;c.fill();
  c.strokeStyle=d.accent;c.lineWidth=r*.06;
  c.beginPath();c.moveTo(cx-r*.4,cy-r*.15);c.lineTo(cx-r*.1,cy+r*.2);c.lineTo(cx+r*.35,cy+r*.05);c.stroke();
  c.beginPath();c.moveTo(cx+r*.1,cy-r*.4);c.lineTo(cx+r*.25,cy);c.stroke();
  // Eyes
  c.fillStyle=d.eyeColor;[-r*.28,r*.28].forEach(ox=>{c.beginPath();c.arc(cx+ox,cy-r*.18,r*.1,0,Math.PI*2);c.fill();c.fillStyle='rgba(0,0,0,.6)';c.beginPath();c.arc(cx+ox+r*.02,cy-r*.16,r*.05,0,Math.PI*2);c.fill();c.fillStyle=d.eyeColor;});
  // Tiny flower (Gorpax's characteristic)
  c.fillStyle='#FFE880';c.beginPath();c.arc(cx-r*.55,cy-r*.55,r*.1,0,Math.PI*2);c.fill();
  c.strokeStyle='#90C040';c.lineWidth=1;c.beginPath();c.moveTo(cx-r*.55,cy-r*.55);c.lineTo(cx-r*.55,cy-r*.3);c.stroke();
}
function drawGrogg(c,d,cx,cy,r){
  // Troll body (hunched)
  c.beginPath();c.ellipse(cx,cy+r*.1,r*.9,r*.95,0,0,Math.PI*2);
  c.fillStyle=d.color;c.fill();c.strokeStyle=d.accent;c.lineWidth=r*.05;c.stroke();
  // Mossy patches
  c.fillStyle='rgba(60,100,40,.5)';
  [[-.3,-.4,.25,.15],[.25,-.2,.2,.13],[-.1,.3,.18,.1]].forEach(([ox,oy,rw,rh])=>{
    c.beginPath();c.ellipse(cx+ox*r,cy+oy*r,rw*r,rh*r,0,0,Math.PI*2);c.fill();});
  // Head
  c.beginPath();c.ellipse(cx,cy-r*.5,r*.55,r*.48,0,0,Math.PI*2);c.fillStyle=d.color;c.fill();
  // Brow ridge
  c.fillStyle=d.accent;c.beginPath();c.ellipse(cx,cy-r*.7,r*.45,r*.12,0,0,Math.PI);c.fill();
  // Eyes
  c.fillStyle=d.eyeColor;[-r*.2,r*.2].forEach(ox=>{c.beginPath();c.arc(cx+ox,cy-r*.5,r*.1,0,Math.PI*2);c.fill();});
  // Club
  c.fillStyle=d.accent;c.fillRect(cx+r*.6,cy-r*.2,r*.2,r*.7);
  c.beginPath();c.arc(cx+r*.7,cy-r*.25,r*.22,0,Math.PI*2);c.fill();
}
function drawThornback(c,d,cx,cy,r){
  // Shell
  c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fillStyle=d.color;c.fill();
  // Hex shell pattern
  c.strokeStyle=d.accent;c.lineWidth=r*.05;
  for(let i=0;i<6;i++){const a=i*Math.PI/3;c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+Math.cos(a)*r*.7,cy+Math.sin(a)*r*.7);c.stroke();}
  c.beginPath();c.arc(cx,cy,r*.7,0,Math.PI*2);c.stroke();
  // Thorns
  c.fillStyle='#AACCAA';
  for(let i=0;i<8;i++){const a=i*Math.PI*.25;c.beginPath();c.moveTo(cx+Math.cos(a)*r*.85,cy+Math.sin(a)*r*.85);c.lineTo(cx+Math.cos(a)*r*1.25,cy+Math.sin(a)*r*1.25);c.lineTo(cx+Math.cos(a+.15)*r*1.05,cy+Math.sin(a+.15)*r*1.05);c.closePath();c.fill();}
  // Eyes
  c.fillStyle=d.eyeColor;[-r*.25,r*.25].forEach(ox=>{c.beginPath();c.arc(cx+ox,cy-r*.15,r*.1,0,Math.PI*2);c.fill();});
}
function drawBuzz(c,d,cx,cy,r){
  // Wings
  c.globalAlpha*=.55;c.fillStyle='rgba(200,230,255,.7)';
  [[-r*.6,-r*.2,r*.5,r*.3],[r*.5,-r*.2,r*.5,r*.3],[-.5*r,-r*.1,r*.4,r*.22],[r*.4,-r*.1,r*.4,r*.22]].forEach(([x,y,w,h])=>{c.beginPath();c.ellipse(cx+x,cy+y,w,h,.3,0,Math.PI*2);c.fill();});
  c.globalAlpha/=.55;
  // Body stripes
  c.beginPath();c.ellipse(cx,cy,r*.65,r*.9,0,0,Math.PI*2);c.fillStyle=d.accent;c.fill();
  for(let i=0;i<4;i++){const yy=cy-r*.5+i*r*.28;c.fillStyle=i%2===0?d.color:d.accent;c.fillRect(cx-r*.6,yy,r*1.2,r*.26);}
  c.beginPath();c.ellipse(cx,cy,r*.65,r*.9,0,0,Math.PI*2);c.strokeStyle='rgba(0,0,0,.3)';c.lineWidth=r*.06;c.stroke();
  // Stinger
  c.fillStyle='#CC8800';c.beginPath();c.moveTo(cx,cy+r*.88);c.lineTo(cx-r*.08,cy+r*.7);c.lineTo(cx+r*.08,cy+r*.7);c.closePath();c.fill();
  // Eyes
  c.fillStyle=d.eyeColor;[-r*.2,r*.2].forEach(ox=>{c.beginPath();c.arc(cx+ox,cy-r*.35,r*.13,0,Math.PI*2);c.fill();});
}
function drawVix(c,d,cx,cy,r){
  // Mirror-geometric body
  c.beginPath();c.moveTo(cx,cy-r);c.lineTo(cx+r*.75,cy);c.lineTo(cx,cy+r*.85);c.lineTo(cx-r*.75,cy);c.closePath();
  const g=c.createLinearGradient(cx-r,cy-r,cx+r,cy+r);g.addColorStop(0,'#E0E0F8');g.addColorStop(.5,d.color);g.addColorStop(1,'#A0A0CC');c.fillStyle=g;c.fill();
  c.strokeStyle=d.accent;c.lineWidth=r*.1;c.stroke();
  // Fox ears
  c.fillStyle=d.accent;[[-r*.35,-r*.78],[r*.35,-r*.78]].forEach(([ox,oy])=>{c.beginPath();c.moveTo(cx+ox,cy+oy);c.lineTo(cx+ox-r*.18,cy+oy-r*.35);c.lineTo(cx+ox+r*.18,cy+oy-r*.35);c.closePath();c.fill();});
  // Mirror facets
  c.strokeStyle='rgba(200,220,255,.5)';c.lineWidth=r*.05;
  [[0,-r*.5,r*.5,-r*.2],[0,-r*.5,-r*.5,-r*.2],[0,r*.5,r*.35,0]].forEach(([x1,y1,x2,y2])=>{c.beginPath();c.moveTo(cx+x1,cy+y1);c.lineTo(cx+x2,cy+y2);c.stroke();});
  // Eyes
  c.fillStyle=d.eyeColor;[-r*.2,r*.2].forEach(ox=>{c.beginPath();c.arc(cx+ox,cy-r*.1,r*.11,0,Math.PI*2);c.fill();});
}
function drawSparkmite(c,d,cx,cy,r){
  // Beetle carapace
  c.beginPath();c.ellipse(cx,cy,r*.8,r,0,0,Math.PI*2);
  const g=c.createRadialGradient(cx,cy-r*.3,r*.1,cx,cy,r);g.addColorStop(0,'#80D8FF');g.addColorStop(1,d.accent);c.fillStyle=g;c.fill();
  c.strokeStyle=d.eyeColor;c.lineWidth=r*.07;c.stroke();
  // Lightning bolt pattern
  c.fillStyle=d.eyeColor;c.beginPath();
  c.moveTo(cx+r*.1,cy-r*.5);c.lineTo(cx-r*.1,cy-r*.1);c.lineTo(cx+r*.08,cy-r*.1);
  c.lineTo(cx-r*.12,cy+r*.5);c.lineTo(cx+r*.15,cy+r*.05);c.lineTo(cx-r*.05,cy+r*.05);c.lineTo(cx+r*.1,cy-r*.5);c.fill();
  // Antenna
  c.strokeStyle=d.eyeColor;c.lineWidth=r*.05;
  [-.2,.2].forEach(ox=>{c.beginPath();c.moveTo(cx+ox*r,cy-r*.85);c.quadraticCurveTo(cx+ox*r*2,cy-r*1.1,cx+ox*r*2.2,cy-r*1.3);c.stroke();
    c.beginPath();c.arc(cx+ox*r*2.2,cy-r*1.3,r*.08,0,Math.PI*2);c.fillStyle=d.eyeColor;c.fill();});
}
function drawSplotch(c,d,cx,cy,r){
  // Blobby body
  c.beginPath();
  const pts=8;for(let i=0;i<=pts;i++){const a=i/pts*Math.PI*2,bumpA=(i%2===0)?.92:1.08;const bx=cx+Math.cos(a)*r*bumpA,by=cy+Math.sin(a)*r*bumpA*(i<pts/2?.85:1.1);i===0?c.moveTo(bx,by):c.lineTo(bx,by);}
  c.closePath();c.fillStyle=d.color;c.fill();c.strokeStyle=d.accent;c.lineWidth=r*.06;c.stroke();
  // Drips at bottom
  c.fillStyle=d.color;[-.35,0,.35].forEach(ox=>{c.beginPath();c.arc(cx+ox*r,cy+r*(1.05+Math.abs(ox)*.1),r*.15,0,Math.PI*2);c.fill();});
  // Multiple eyes
  c.fillStyle='#FFFFFF';[-.3,-.1,.1,.3].forEach(ox=>{c.beginPath();c.arc(cx+ox*r,cy-r*.15,r*.1,0,Math.PI*2);c.fill();c.fillStyle='rgba(0,0,0,.7)';c.beginPath();c.arc(cx+ox*r+r*.02,cy-r*.12,r*.055,0,Math.PI*2);c.fill();c.fillStyle='#FFFFFF';});
}
function drawZara(c,d,cx,cy,r){
  // Oval body
  c.beginPath();c.ellipse(cx,cy,r*.7,r*.85,0,0,Math.PI*2);c.fillStyle=d.color;c.fill();
  c.strokeStyle=d.accent;c.lineWidth=r*.07;c.stroke();
  // Hourglass marking
  c.fillStyle='rgba(255,50,200,.4)';c.beginPath();c.ellipse(cx,cy,r*.25,r*.35,0,0,Math.PI*2);c.fill();
  // 8 legs
  c.strokeStyle=d.accent;c.lineWidth=r*.08;
  [-60,-30,30,60].forEach(angle=>{[1,-1].forEach(side=>{const a=(angle+90*side)*Math.PI/180;const mx=cx+Math.cos(a)*r*.65,my=cy+Math.sin(a)*r*.65;const ex=cx+Math.cos(a+.4*side)*r*1.4,ey=cy+Math.sin(a+.4*side)*r*1.3;c.beginPath();c.moveTo(cx+Math.cos(a)*r*.5,cy+Math.sin(a)*r*.5);c.quadraticCurveTo(mx,my,ex,ey);c.stroke();});});
  // Eyes row
  c.fillStyle=d.eyeColor;[-r*.32,-r*.12,r*.12,r*.32].forEach(ox=>{c.beginPath();c.arc(cx+ox,cy-r*.3,r*.1,0,Math.PI*2);c.fill();});
}
function drawCruxor(c,d,cx,cy,r){
  // Segmented body
  [1,.8,.65].forEach((sc,i)=>{c.beginPath();c.ellipse(cx-i*r*.3,cy,r*.6*sc,r*.5*sc,0,0,Math.PI*2);c.fillStyle=d.color;c.fill();c.strokeStyle=d.accent;c.lineWidth=r*.05;c.stroke();});
  // Scorpion tail curving up
  c.strokeStyle=d.color;c.lineWidth=r*.25;c.lineCap='round';
  c.beginPath();c.moveTo(cx-r*.9,cy);c.quadraticCurveTo(cx-r*1.4,cy-r*.8,cx-r*.7,cy-r*1.2);c.stroke();
  // Stinger
  c.fillStyle=d.eyeColor;c.beginPath();c.moveTo(cx-r*.7,cy-r*1.2);c.lineTo(cx-r*.5,cy-r*1.45);c.lineTo(cx-r*.85,cy-r*1.3);c.closePath();c.fill();
  // Claws
  [[r*.6,-r*.3],[r*.6,r*.3]].forEach(([ox,oy])=>{
    c.beginPath();c.arc(cx+ox,cy+oy,r*.28,0,Math.PI*2);c.fillStyle=d.color;c.fill();c.stroke();
    c.fillStyle=d.accent;c.beginPath();c.arc(cx+ox+r*.2,cy+oy-r*.15,r*.13,0,Math.PI*2);c.fill();
    c.beginPath();c.arc(cx+ox+r*.15,cy+oy+r*.2,r*.13,0,Math.PI*2);c.fill();});
  c.fillStyle=d.eyeColor;[-r*.08,r*.08].forEach(ox=>{c.beginPath();c.arc(cx+r*.6+ox,cy-r*.05,r*.08,0,Math.PI*2);c.fill();});
}
function drawMirrek(c,d,cx,cy,r){
  // Crab shell
  c.beginPath();c.ellipse(cx,cy,r*.9,r*.7,0,0,Math.PI*2);c.fillStyle=d.color;c.fill();c.strokeStyle=d.accent;c.lineWidth=r*.07;c.stroke();
  // Shell segments
  c.strokeStyle=d.accent;c.lineWidth=r*.04;
  [-r*.3,0,r*.3].forEach(ox=>{c.beginPath();c.moveTo(cx+ox,cy-r*.6);c.lineTo(cx+ox,cy+r*.55);c.stroke();});
  c.beginPath();c.moveTo(cx-r*.8,cy);c.lineTo(cx+r*.8,cy);c.stroke();
  // Cannon barrel
  c.fillStyle='#606060';c.fillRect(cx+r*.55,cy-r*.2,r*.7,r*.35);
  c.fillStyle='#404040';c.fillRect(cx+r*1.05,cy-r*.17,r*.2,r*.3);
  // Crab eyes on stalks
  c.strokeStyle=d.accent;c.lineWidth=r*.06;[-r*.25,r*.25].forEach(ox=>{c.beginPath();c.moveTo(cx+ox,cy-r*.6);c.lineTo(cx+ox,cy-r*.85);c.stroke();c.beginPath();c.arc(cx+ox,cy-r*.9,r*.1,0,Math.PI*2);c.fillStyle=d.eyeColor;c.fill();});
}
function drawBlastt(c,d,cx,cy,r){
  // Stone cube body
  c.fillStyle=d.color;c.fillRect(cx-r*.75,cy-r*.7,r*1.5,r*1.4);
  // Bevel edges
  c.strokeStyle=d.accent;c.lineWidth=r*.08;c.strokeRect(cx-r*.75,cy-r*.7,r*1.5,r*1.4);
  c.strokeStyle='rgba(160,160,160,.3)';c.lineWidth=r*.04;
  c.strokeRect(cx-r*.62,cy-r*.58,r*1.24,r*1.16);
  // Crack lines
  c.strokeStyle=d.accent;c.lineWidth=r*.05;
  c.beginPath();c.moveTo(cx-r*.3,cy-r*.7);c.lineTo(cx,cy-r*.2);c.lineTo(cx+r*.2,cy-r*.5);c.stroke();
  // Cannon eye (glowing)
  const ge=c.createRadialGradient(cx,cy,0,cx,cy,r*.3);ge.addColorStop(0,d.eyeColor);ge.addColorStop(1,'rgba(255,80,0,0)');
  c.fillStyle=ge;c.beginPath();c.arc(cx,cy,r*.3,0,Math.PI*2);c.fill();
  // Barrel
  c.fillStyle='#303030';c.fillRect(cx+r*.45,cy-r*.12,r*.6,r*.24);
}
function drawKalux(c,d,cx,cy,r){
  // Toad squat shape
  c.beginPath();c.ellipse(cx,cy+r*.1,r*.9,r*.75,0,0,Math.PI*2);
  const g=c.createRadialGradient(cx,cy-r*.2,r*.1,cx,cy,r);g.addColorStop(0,'#40D0C8');g.addColorStop(1,d.accent);c.fillStyle=g;c.fill();
  c.strokeStyle=d.accent;c.lineWidth=r*.07;c.stroke();
  // Belly
  c.beginPath();c.ellipse(cx,cy+r*.25,r*.55,r*.42,0,0,Math.PI*2);c.fillStyle='rgba(100,220,180,.3)';c.fill();
  // Wide mouth
  c.strokeStyle=d.accent;c.lineWidth=r*.08;c.beginPath();c.arc(cx,cy+r*.05,r*.55,Math.PI*.1,Math.PI*.9);c.stroke();
  // Eyes (big round toad eyes)
  c.fillStyle=d.eyeColor;[-r*.35,r*.35].forEach(ox=>{
    c.beginPath();c.arc(cx+ox,cy-r*.35,r*.2,0,Math.PI*2);c.fill();
    c.fillStyle='rgba(0,0,0,.6)';c.beginPath();c.arc(cx+ox+r*.04,cy-r*.32,r*.1,0,Math.PI*2);c.fill();c.fillStyle=d.eyeColor;});
  // Mortar tube on back
  c.fillStyle='#405050';c.fillRect(cx-r*.12,cy-r*.9,r*.24,r*.5);
  c.beginPath();c.arc(cx,cy-r*.88,r*.2,Math.PI,0);c.fillStyle='#303A3A';c.fill();
}
function drawPip(c,d,cx,cy,r){
  // Star-shaped body
  c.beginPath();
  for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2;const ri=i%2===0?r:r*.45;c.lineTo(cx+Math.cos(a)*ri,cy+Math.sin(a)*ri);}
  c.closePath();
  const g=c.createRadialGradient(cx,cy,r*.1,cx,cy,r);g.addColorStop(0,d.eyeColor);g.addColorStop(1,d.color);c.fillStyle=g;c.fill();
  // Rays (glow)
  c.strokeStyle=d.eyeColor;c.lineWidth=r*.06;
  for(let i=0;i<8;i++){const a=i*Math.PI/4;c.beginPath();c.moveTo(cx+Math.cos(a)*r*.9,cy+Math.sin(a)*r*.9);c.lineTo(cx+Math.cos(a)*r*1.4,cy+Math.sin(a)*r*1.4);c.stroke();}
  // Center sparkle
  c.fillStyle=d.eyeColor;c.beginPath();c.arc(cx,cy,r*.18,0,Math.PI*2);c.fill();
}
function drawMirelle(c,d,cx,cy,r){
  // Fairy body
  c.beginPath();c.ellipse(cx,cy,r*.55,r*.75,0,0,Math.PI*2);c.fillStyle=d.color;c.fill();c.strokeStyle=d.accent;c.lineWidth=r*.06;c.stroke();
  // Wings
  c.globalAlpha*=.65;c.fillStyle='rgba(255,200,240,.8)';
  [[-r*.6,-r*.15,r*.55,r*.35,-.4],[r*.5,-r*.15,r*.55,r*.35,.4]].forEach(([ox,oy,w,h,rot])=>{c.save();c.translate(cx+ox,cy+oy);c.rotate(rot);c.beginPath();c.ellipse(0,0,w,h,0,0,Math.PI*2);c.fill();c.restore();});
  c.globalAlpha/=.65;
  // Head
  c.beginPath();c.arc(cx,cy-r*.62,r*.3,0,Math.PI*2);c.fillStyle='#FFCCBB';c.fill();
  // Healing cross
  c.fillStyle='rgba(255,100,180,.8)';c.fillRect(cx-r*.05,cy-r*.35,r*.1,r*.35);c.fillRect(cx-r*.2,cy-r*.2,r*.4,r*.1);
}
function drawSolenne(c,d,cx,cy,r){
  // Bell shape
  c.beginPath();c.moveTo(cx-r*.55,cy-r*.1);c.quadraticCurveTo(cx-r*.65,cy+r*.5,cx-r*.35,cy+r*.9);
  c.lineTo(cx+r*.35,cy+r*.9);c.quadraticCurveTo(cx+r*.65,cy+r*.5,cx+r*.55,cy-r*.1);
  c.arc(cx,cy-r*.1,r*.55,0,Math.PI,true);c.closePath();
  const g=c.createLinearGradient(cx-r,cy-r,cx+r,cy+r);g.addColorStop(0,'#FFE860');g.addColorStop(.5,d.color);g.addColorStop(1,d.accent);c.fillStyle=g;c.fill();
  c.strokeStyle=d.accent;c.lineWidth=r*.07;c.stroke();
  // Crack detail (bell design)
  c.strokeStyle='rgba(200,150,0,.4)';c.lineWidth=r*.04;
  c.beginPath();c.moveTo(cx-r*.15,cy-r*.05);c.lineTo(cx-r*.08,cy+r*.6);c.stroke();
  c.beginPath();c.moveTo(cx+r*.15,cy-r*.05);c.lineTo(cx+r*.08,cy+r*.6);c.stroke();
  // Bell rim
  c.fillStyle=d.accent;c.fillRect(cx-r*.38,cy+r*.82,r*.76,r*.12);
  // Eyes (tiny, on bell face)
  c.fillStyle=d.eyeColor;[-r*.18,r*.18].forEach(ox=>{c.beginPath();c.arc(cx+ox,cy+r*.25,r*.08,0,Math.PI*2);c.fill();});
  // Clapper
  c.fillStyle=d.accent;c.beginPath();c.arc(cx,cy+r*.65,r*.1,0,Math.PI*2);c.fill();
  c.beginPath();c.moveTo(cx,cy+r*.3);c.lineTo(cx,cy+r*.65);c.strokeStyle=d.accent;c.lineWidth=r*.06;c.stroke();
}
function drawFenwick(c,d,cx,cy,r){
  // Tiny figure
  c.beginPath();c.ellipse(cx,cy+r*.15,r*.45,r*.6,0,0,Math.PI*2);c.fillStyle=d.color;c.fill();
  c.strokeStyle=d.accent;c.lineWidth=r*.06;c.stroke();
  // Head
  c.beginPath();c.arc(cx,cy-r*.4,r*.3,0,Math.PI*2);c.fillStyle='#DDCCAA';c.fill();
  // Wizard hat
  c.fillStyle=d.accent;c.beginPath();c.moveTo(cx,cy-r*1.15);c.lineTo(cx+r*.3,cy-r*.55);c.lineTo(cx-r*.3,cy-r*.55);c.closePath();c.fill();
  c.beginPath();c.ellipse(cx,cy-r*.55,r*.38,r*.1,0,0,Math.PI*2);c.fill();
  // Star wand
  c.strokeStyle=d.eyeColor;c.lineWidth=r*.06;c.beginPath();c.moveTo(cx+r*.4,cy+r*.1);c.lineTo(cx+r*.75,cy-r*.45);c.stroke();
  // Star at tip
  c.fillStyle=d.eyeColor;c.beginPath();
  for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,ri=i%2===0?r*.2:r*.1;c.lineTo(cx+r*.75+Math.cos(a)*ri,cy-r*.45+Math.sin(a)*ri);}
  c.closePath();c.fill();
}
function drawNoctis(c,d,cx,cy,r){
  // Shadow cat — partially visible
  c.globalAlpha*=.7;
  // Cat silhouette
  c.beginPath();c.ellipse(cx,cy+r*.05,r*.7,r*.8,0,0,Math.PI*2);c.fillStyle=d.color;c.fill();
  // Ears
  [[-r*.35,-r*.65],[r*.35,-r*.65]].forEach(([ox,oy])=>{c.beginPath();c.moveTo(cx+ox,cy+oy);c.lineTo(cx+ox-r*.18,cy+oy-r*.3);c.lineTo(cx+ox+r*.18,cy+oy-r*.3);c.closePath();c.fillStyle=d.color;c.fill();});
  // Tail
  c.strokeStyle=d.color;c.lineWidth=r*.2;c.lineCap='round';
  c.beginPath();c.moveTo(cx+r*.65,cy+r*.4);c.quadraticCurveTo(cx+r*1.2,cy-.1*r,cx+r*.9,cy-r*.5);c.stroke();
  c.globalAlpha/=.7;
  // Glowing eyes
  const ge=c.createRadialGradient(cx-r*.2,cy-r*.12,0,cx-r*.2,cy-r*.12,r*.2);ge.addColorStop(0,d.eyeColor);ge.addColorStop(1,'transparent');
  c.fillStyle=ge;c.beginPath();c.arc(cx-r*.2,cy-r*.12,r*.2,0,Math.PI*2);c.fill();
  const ge2=c.createRadialGradient(cx+r*.2,cy-r*.12,0,cx+r*.2,cy-r*.12,r*.2);ge2.addColorStop(0,d.eyeColor);ge2.addColorStop(1,'transparent');
  c.fillStyle=ge2;c.beginPath();c.arc(cx+r*.2,cy-r*.12,r*.2,0,Math.PI*2);c.fill();
}
function drawDuskwing(c,d,cx,cy,r){
  // Bat wings spread
  c.fillStyle=d.accent;c.globalAlpha*=.75;
  [[-1,1]].forEach(()=>{
    c.beginPath();c.moveTo(cx,cy);c.lineTo(cx-r*1.4,cy-r*.5);c.lineTo(cx-r*1.1,cy+r*.3);c.lineTo(cx-r*.4,cy+r*.1);c.closePath();c.fill();
    c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+r*1.4,cy-r*.5);c.lineTo(cx+r*1.1,cy+r*.3);c.lineTo(cx+r*.4,cy+r*.1);c.closePath();c.fill();});
  c.globalAlpha/=.75;
  // Body
  c.beginPath();c.ellipse(cx,cy,r*.45,r*.65,0,0,Math.PI*2);c.fillStyle=d.color;c.fill();
  // Head with ears
  c.beginPath();c.arc(cx,cy-r*.55,r*.32,0,Math.PI*2);c.fillStyle=d.color;c.fill();
  [[-r*.18,-r*.75],[r*.18,-r*.75]].forEach(([ox,oy])=>{c.beginPath();c.moveTo(cx+ox,cy+oy);c.lineTo(cx+ox-r*.1,cy+oy-r*.22);c.lineTo(cx+ox+r*.1,cy+oy-r*.22);c.closePath();c.fillStyle=d.color;c.fill();});
  c.fillStyle=d.eyeColor;[-r*.15,r*.15].forEach(ox=>{c.beginPath();c.arc(cx+ox,cy-r*.57,r*.1,0,Math.PI*2);c.fill();});
  // Fangs
  c.fillStyle='white';c.fillRect(cx-r*.14,cy-r*.38,r*.07,r*.14);c.fillRect(cx+r*.07,cy-r*.38,r*.07,r*.14);
}
function drawLibrarian(c,d,cx,cy,r){
  // Oversized coat
  c.beginPath();c.moveTo(cx-r*.6,cy+r*.9);c.lineTo(cx-r*.7,cy-r*.1);c.lineTo(cx-r*.35,cy-r*.6);c.lineTo(cx+r*.35,cy-r*.6);c.lineTo(cx+r*.7,cy-r*.1);c.lineTo(cx+r*.6,cy+r*.9);c.closePath();c.fillStyle=d.color;c.fill();c.strokeStyle=d.accent;c.lineWidth=r*.07;c.stroke();
  // Collar
  c.fillStyle=d.accent;c.fillRect(cx-r*.15,cy-r*.65,r*.3,r*.2);
  // Head
  c.beginPath();c.arc(cx,cy-r*.7,r*.28,0,Math.PI*2);c.fillStyle='#DDCCAA';c.fill();
  // Glasses
  c.strokeStyle='#AA8800';c.lineWidth=r*.05;[-r*.12,r*.12].forEach(ox=>{c.beginPath();c.arc(cx+ox,cy-r*.72,r*.1,0,Math.PI*2);c.stroke();});c.beginPath();c.moveTo(cx-r*.02,cy-r*.72);c.lineTo(cx+r*.02,cy-r*.72);c.stroke();
  // Floating book
  c.save();c.translate(cx+r*.55,cy-r*.65);c.rotate(.3);
  c.fillStyle='#8B4513';c.fillRect(-r*.22,-r*.18,r*.44,r*.35);
  c.fillStyle='#D4A060';c.fillRect(-r*.19,-r*.15,r*.38,r*.29);
  c.strokeStyle='#8B4513';c.lineWidth=r*.05;c.beginPath();c.moveTo(0,-r*.18);c.lineTo(0,r*.17);c.stroke();
  c.restore();
  c.fillStyle=d.eyeColor;[-r*.1,r*.1].forEach(ox=>{c.beginPath();c.arc(cx+r*.55+ox,cy-r*.75,r*.06,0,Math.PI*2);c.fill();});
}
function drawVortex(c,d,cx,cy,r){
  // Void entity — distortion rings
  for(let i=3;i>=0;i--){
    c.globalAlpha*=(.3-i*.05);
    c.beginPath();c.arc(cx,cy,r*(1+i*.15),0,Math.PI*2);c.strokeStyle=d.accent;c.lineWidth=r*.12;c.stroke();
    c.globalAlpha/=(.3-i*.05);
  }
  // Core void
  const g=c.createRadialGradient(cx,cy,r*.1,cx,cy,r*.8);g.addColorStop(0,'rgba(200,0,255,.8)');g.addColorStop(.6,d.color);g.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=g;c.beginPath();c.arc(cx,cy,r*.8,0,Math.PI*2);c.fill();
  // Eye
  c.fillStyle=d.eyeColor;c.beginPath();c.arc(cx,cy,r*.22,0,Math.PI*2);c.fill();
  c.fillStyle='rgba(0,0,0,.5)';c.beginPath();c.arc(cx+r*.05,cy,r*.11,0,Math.PI*2);c.fill();
}

// ============================================================
// INPUT HANDLING
// ============================================================
function canvasPt(e){
  const rect=canvas.getBoundingClientRect();
  const sx=canvas.width/rect.width,sy=canvas.height/rect.height;
  const src=e.changedTouches?e.changedTouches[0]:e;
  return{x:(src.clientX-rect.left)*sx,y:(src.clientY-rect.top)*sy};
}
canvas.addEventListener('pointerdown',e=>{
  if(!RUN||RUN.phase==='shop')return;
  const pt=canvasPt(e);RUN.lastInputTime=performance.now();
  if(spellAiming!==null){execSpell(spellAiming.idx,pt);return;}
  if(RUN.placingUnitIdx>=0){placeUnit(Math.floor(pt.x/CELL),Math.floor(pt.y/CELL));return;}
  for(let i=0;i<RUN.units.length;i++){
    const u=RUN.units[i];
    if(Math.hypot(pt.x-u.x,pt.y-u.y)<26){
      if(RUN.possessedIdx===i){const en=nearestEnemyAt(pt.x,pt.y,40);if(en)u.target=en;else{RUN.possessTarget=pt;u.target=null;}}
      else possessUnit(i);
      return;
    }
  }
  if(RUN.possessedIdx>=0){
    const u=RUN.units[RUN.possessedIdx];
    const en=nearestEnemyAt(pt.x,pt.y,44);
    if(en)u.target=en;else{RUN.possessTarget=pt;u.target=null;}
  }
},{passive:true});

// ============================================================
// WAVE BANNER
// ============================================================
function showWaveBanner(text,ms){
  const el=document.getElementById('wave-banner');
  document.getElementById('wave-banner-text').textContent=text;
  el.classList.remove('hidden');
  setTimeout(()=>el.classList.add('hidden'),ms);
}

// ============================================================
// VICTORY / DEFEAT / RESULT
// ============================================================
function triggerVictory(){
  if(RUN.phase==='done')return;RUN.phase='done';
  const mp=SAVE.mapProgress[activeMapId]||{};mp.normalCleared=true;SAVE.mapProgress[activeMapId]=mp;
  const goldB=Math.floor(RUN.goldEarned*.8);const orbsB=Math.floor(RUN.wave/4);
  SAVE.gold+=goldB;SAVE.orbs+=orbsB;grantXP(50+RUN.wave*3);saveGame();
  Audio.victory();showResult(true,goldB,orbsB);
}
function triggerDefeat(){
  if(RUN&&RUN.phase==='done')return;if(RUN)RUN.phase='done';
  const goldB=Math.floor((RUN?RUN.shards:0)*.25);SAVE.gold+=goldB;grantXP(10+(RUN?RUN.wave*2:0));saveGame();
  Audio.defeat();showResult(false,goldB,0);
}
function showResult(won,goldB,orbsB){
  const el=document.getElementById('overlay-result');
  const wave=RUN?RUN.wave:0;
  document.getElementById('result-header').innerHTML=won
      ?'<h2 style="color:var(--cyan)">RIFT DEFENDED</h2><div class="result-sub">The King\'s forces retreat.</div>'
      :'<h2 style="color:var(--red)">BASE OVERRUN</h2><div class="result-sub">Wave '+wave+' — a strong showing.</div>';
  document.getElementById('result-rows').innerHTML=
      '<div class="result-row"><span>Waves cleared</span><b>'+(RUN?RUN.wave:0)+'</b></div>'
      +'<div class="result-row"><span>Best wave (this map)</span><b>'+(SAVE.bestWaves[activeMapId]||wave)+'</b></div>'
      +'<div class="result-row"><span>Shards earned</span><b>'+Math.floor(RUN?RUN.shards:0)+'</b></div>'
      +'<div class="result-row"><span>Focus bonus</span><b>×'+(1+(RUN?RUN.focusMeter*FOCUS_BONUS:0)).toFixed(1)+'</b></div>';
  document.getElementById('result-reward').innerHTML=
      '<div class="reward-item"><span class="cur-icon gold-icon">◈</span>+'+goldB+' Gold</div>'
      +(orbsB>0?'<div class="reward-item"><span class="cur-icon orb-icon">◉</span>+'+orbsB+' Orbs</div>':'');
  el.classList.remove('hidden');
}
function goHub(){document.getElementById('overlay-result').classList.add('hidden');RUN=null;showScreen('screen-hub');}
function retryRun(){document.getElementById('overlay-result').classList.add('hidden');startRun();}

// ============================================================
// UTILS
// ============================================================
function d2(x1,y1,x2,y2){return(x2-x1)**2+(y2-y1)**2;}
function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v));}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}}
function cellHash(c,r){return Math.abs((c*1103515245+r*12345)&0x7fffffff);}
function segDist(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay;if(!dx&&!dy)return Math.hypot(px-ax,py-ay);const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy)));return Math.hypot(px-ax-t*dx,py-ay-t*dy);}

// ============================================================
// TOAST
// ============================================================
function showToast(msg,ms=3000){
  const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');
  clearTimeout(window._tt);window._tt=setTimeout(()=>t.classList.remove('show'),ms);
}

// ============================================================
// AUTO-SAVE
// ============================================================
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveGame();});
window.addEventListener('beforeunload',()=>saveGame());
setInterval(saveGame,18000);

// ============================================================
// INIT
// ============================================================
(()=>setTimeout(()=>{const el=document.getElementById('login-name');if(el)el.focus();},80))();