'use strict';
/* ============================================================
   SOUNDS.JS — Rift Warden Audio Engine
   All audio generated procedurally via Web Audio API.
   No external files required.
   ============================================================ */

const Audio = (() => {

  let ctx = null;
  let masterGain, musicGain, sfxGain;
  let sfxEnabled  = true;
  let musicActive = false;

  /* ---------- frequencies ---------- */
  const N = {
    A1:55.00, Bb1:58.27, B1:61.74,
    C2:65.41, D2:73.42, E2:82.41, F2:87.31, G2:98.00, A2:110.00, Bb2:116.54, B2:123.47,
    C3:130.81, D3:146.83, Eb3:155.56, E3:164.81, F3:174.61, G3:196.00, A3:220.00, Bb3:233.08, B3:246.94,
    C4:261.63, D4:293.66, Eb4:311.13, E4:329.63, F4:349.23, G4:392.00, A4:440.00, Bb4:466.16, B4:493.88,
    C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:783.99, A5:880.00
  };

  /* ================================================================
     INIT
     ================================================================ */
  function init () {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    masterGain = ctx.createGain();  masterGain.gain.value = 0.65;
    masterGain.connect(ctx.destination);

    musicGain = ctx.createGain();   musicGain.gain.value = 0;   // start silent, fade in
    musicGain.connect(masterGain);

    sfxGain = ctx.createGain();     sfxGain.gain.value = 0.75;
    sfxGain.connect(masterGain);
  }

  function resume () { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  /* ================================================================
     LOW-LEVEL HELPERS
     ================================================================ */
  function tone (freq, type, vol, dur, dest, t0, atk, rel) {
    if (!ctx || !sfxEnabled) return;
    t0  = t0  || ctx.currentTime;
    atk = atk || 0.012;
    rel = rel || Math.min(dur * 0.45, 0.22);
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(vol, t0 + atk);
    env.gain.setValueAtTime(vol, t0 + dur - rel);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(env); env.connect(dest || sfxGain);
    osc.start(t0); osc.stop(t0 + dur + 0.01);
  }

  function noise (dur, vol, dest, t0, filterHz, filterType) {
    if (!ctx) return;
    t0 = t0 || ctx.currentTime;
    const samples = Math.ceil(ctx.sampleRate * dur);
    const buf  = ctx.createBuffer(1, samples, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const flt = ctx.createBiquadFilter();
    flt.type = filterType || 'bandpass';
    flt.frequency.value = filterHz || 1000;
    flt.Q.value = 1.2;
    const env = ctx.createGain();
    env.gain.setValueAtTime(vol, t0);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(flt); flt.connect(env); env.connect(dest || sfxGain);
    src.start(t0); src.stop(t0 + dur + 0.01);
  }

  /* ================================================================
     SOUND EFFECTS
     ================================================================ */
  function click () {
    if (!ctx || !sfxEnabled) return;
    resume();
    tone(700, 'sine', 0.25, 0.07);
    tone(1100,'sine', 0.12, 0.04);
  }

  function place () {
    if (!ctx || !sfxEnabled) return;
    resume();
    noise(0.09, 0.35, null, null, 600);
    tone(380, 'sine', 0.28, 0.14, null, null, 0.005, 0.08);
  }

  function possess () {
    if (!ctx || !sfxEnabled) return;
    resume();
    const t = ctx.currentTime;
    // rising sweep
    const osc = ctx.createOscillator(); const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(1400, t + 0.28);
    env.gain.setValueAtTime(0.35, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.connect(env); env.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.38);
    // chime after
    tone(N.A5, 'sine', 0.22, 0.4, null, t + 0.18, 0.005, 0.3);
    tone(N.D5, 'sine', 0.14, 0.35, null, t + 0.24, 0.005, 0.28);
  }

  function releasePossess () {
    if (!ctx || !sfxEnabled) return;
    resume();
    tone(1100, 'sine', 0.18, 0.1);
    tone(550,  'sine', 0.15, 0.18, null, null, 0.005, 0.14);
  }

  function attack (role) {
    if (!ctx || !sfxEnabled) return;
    resume();
    switch (role) {
      case 'anchor':
        noise(0.13, 0.42, null, null, 220, 'lowpass');
        tone(85, 'sine', 0.38, 0.18, null, null, 0.005, 0.1);
        break;
      case 'ravager':
        tone(520, 'sawtooth', 0.22, 0.08, null, null, 0.003, 0.06);
        noise(0.06, 0.18, null, null, 3000, 'highpass');
        break;
      case 'weaver':
        tone(280, 'sine', 0.18, 0.14);
        tone(420, 'sine', 0.10, 0.10, null, null, 0.01, 0.08);
        break;
      case 'artillerist':
        noise(0.22, 0.55, null, null, 350, 'lowpass');
        tone(65,  'sine', 0.48, 0.22, null, null, 0.005, 0.12);
        break;
      case 'whisper':
        tone(920, 'sine', 0.10, 0.14);
        tone(1380,'sine', 0.07, 0.10, null, null, 0.008, 0.08);
        break;
      case 'conduit':
        tone(528, 'sine', 0.16, 0.18);
        tone(792, 'sine', 0.10, 0.14, null, null, 0.01, 0.1);
        break;
      default:
        tone(320, 'square', 0.15, 0.1);
    }
  }

  function enemyDeath (isElite, isBoss) {
    if (!ctx || !sfxEnabled) return;
    resume();
    if (isBoss) {
      for (let i = 0; i < 5; i++) {
        const t = ctx.currentTime + i * 0.11;
        noise(0.28, 0.55, null, t, 250 + i*80, 'lowpass');
        tone(90 + i*25, 'sawtooth', 0.38, 0.32, null, t, 0.005, 0.15);
      }
    } else if (isElite) {
      noise(0.22, 0.5, null, null, 320, 'lowpass');
      tone(120, 'sine', 0.35, 0.28, null, null, 0.005, 0.12);
      tone(200, 'sine', 0.22, 0.22, null, null, 0.005, 0.1);
    } else {
      noise(0.11, 0.32, null, null, 550, 'bandpass');
      tone(160, 'sawtooth', 0.22, 0.13, null, null, 0.003, 0.08);
    }
  }

  function waveClear () {
    if (!ctx || !sfxEnabled) return;
    resume();
    const seq = [N.D4, N.F4, N.A4, N.D5];
    seq.forEach((f, i) => tone(f, 'sine', 0.32, 0.45, null, ctx.currentTime + i*0.09, 0.008, 0.3));
  }

  function waveStart () {
    if (!ctx || !sfxEnabled) return;
    resume();
    tone(220, 'sawtooth', 0.22, 0.18);
    tone(330, 'sawtooth', 0.16, 0.14, null, ctx.currentTime + 0.09);
    tone(440, 'sawtooth', 0.12, 0.12, null, ctx.currentTime + 0.18);
  }

  function specialAbility () {
    if (!ctx || !sfxEnabled) return;
    resume();
    const t = ctx.currentTime;
    [N.A4, N.C5, N.E5].forEach((f, i) => tone(f, 'sine', 0.28-i*0.05, 0.35, null, t+i*0.04, 0.006, 0.25));
    noise(0.28, 0.42, null, t + 0.08, 900, 'bandpass');
  }

  function breach () {
    if (!ctx || !sfxEnabled) return;
    resume();
    const t = ctx.currentTime;
    noise(0.38, 0.62, null, t, 180, 'lowpass');
    tone(75, 'sawtooth', 0.55, 0.38, null, t, 0.005, 0.15);
    tone(60, 'sawtooth', 0.42, 0.32, null, t+0.14, 0.005, 0.12);
  }

  function shopOpen () {
    if (!ctx || !sfxEnabled) return;
    resume();
    const t = ctx.currentTime;
    tone(N.D4, 'sine', 0.22, 0.22, null, t,      0.008, 0.15);
    tone(N.A4, 'sine', 0.22, 0.22, null, t+0.09, 0.008, 0.15);
    tone(N.F5, 'sine', 0.22, 0.3,  null, t+0.18, 0.008, 0.2);
  }

  function purchase () {
    if (!ctx || !sfxEnabled) return;
    resume();
    tone(660,  'sine', 0.22, 0.18);
    tone(1100, 'sine', 0.16, 0.14, null, ctx.currentTime + 0.05, 0.006, 0.1);
  }

  function giftCode () {
    if (!ctx || !sfxEnabled) return;
    resume();
    const seq = [N.D4, N.F4, N.A4, N.D5, N.F5, N.A5];
    seq.forEach((f, i) => tone(f, 'sine', 0.30, 0.35, null, ctx.currentTime + i*0.075, 0.006, 0.25));
  }

  function pull (rarity) {
    if (!ctx || !sfxEnabled) return;
    resume();
    const t = ctx.currentTime;
    if (rarity === 'legendary' || rarity === 'mythic') {
      [N.D4,N.F4,N.A4,N.D5,N.A5].forEach((f,i) => {
        tone(f, 'sine', 0.32, 0.5, null, t+i*0.06, 0.006, 0.35);
      });
    } else if (rarity === 'epic') {
      [N.D4,N.A4,N.D5].forEach((f,i) => tone(f,'sine',0.28,0.4,null,t+i*0.07,0.006,0.28));
    } else if (rarity === 'rare') {
      tone(N.A4, 'sine', 0.25, 0.35, null, t, 0.006, 0.22);
      tone(N.D5, 'sine', 0.22, 0.3,  null, t+0.08, 0.006, 0.2);
    } else {
      tone(N.D4, 'sine', 0.2, 0.25, null, t, 0.008, 0.18);
    }
  }

  function victory () {
    if (!ctx || !sfxEnabled) return;
    resume();
    const fanfare = [
      [N.D4,0.14],[N.D4,0.14],[N.D4,0.14],[N.F4,0.48],[N.D5,0.48],
      [N.C5,0.14],[N.A4,0.14],[N.G4,0.14],[N.F4,0.14],[N.D5,0.7]
    ];
    let t = ctx.currentTime;
    fanfare.forEach(([f,dur]) => {
      tone(f,      'sine',     0.38, dur*0.9, null, t, 0.008, 0.12);
      tone(f*1.25, 'triangle', 0.14, dur*0.9, null, t, 0.008, 0.12);
      t += dur;
    });
  }

  function defeat () {
    if (!ctx || !sfxEnabled) return;
    resume();
    const seq = [N.D4, N.C4, N.Bb3, N.G3];
    seq.forEach((f, i) => tone(f, 'sine', 0.3, 0.55, null, ctx.currentTime+i*0.18, 0.01, 0.38));
  }

  /* ================================================================
     BACKGROUND MUSIC
     Procedural looping score in D minor.
     4-bar loop at BPM 88. Layers: bass, pad chords, melody, rhythm.
     ================================================================ */
  const BPM   = 88;
  const BEAT  = 60 / BPM;        // 0.6818s per beat
  const LOOP  = BEAT * 4 * 4;    // 4 bars × 4 beats

  /* ---- Bass: 8 half-note pulses per loop ---- */
  const BASS_PATTERN = [
    [N.D2, BEAT*2], [N.A1,  BEAT*2],
    [N.F2, BEAT*2], [N.C2,  BEAT*2],
    [N.D2, BEAT*2], [N.A1,  BEAT*2],
    [N.Bb1,BEAT*2], [N.A1,  BEAT*2]
  ];

  /* ---- Pad chords (one per bar) ---- */
  const PADS = [
    [N.D3, N.F3, N.A3],   // Dm
    [N.A2, N.E3, N.A3],   // Am
    [N.F2, N.C3, N.F3],   // F
    [N.C3, N.G3, N.C4]    // C
  ];

  /* ---- Melody (beat offsets + freq + duration in beats) ---- */
  const MELODY = [
    [0,    N.A4, 0.6], [1.5, N.F4, 0.5], [2.5, N.D4, 1.0],
    [4,    N.F4, 0.5], [5,   N.A4, 0.5], [6,   N.C5, 0.4],
    [6.5,  N.A4, 0.5], [8,   N.G4, 0.6], [9,   N.F4, 1.5],
    [11,   N.E4, 0.5], [12,  N.D4, 1.0], [13.5,N.F4, 0.5],
    [14.5, N.A4, 0.5], [15.5,N.D5, 1.4]
  ];

  let schedInterval = null;
  let nextLoopAt    = 0;
  const AHEAD       = 0.35; // seconds to schedule ahead

  function scheduleMusicLoop (t0) {
    /* Bass */
    let bt = t0;
    BASS_PATTERN.forEach(([freq, dur]) => {
      if (!ctx || !musicActive) return;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0, bt);
      env.gain.linearRampToValueAtTime(0.55, bt + 0.04);
      env.gain.setValueAtTime(0.50, bt + dur - 0.12);
      env.gain.exponentialRampToValueAtTime(0.0001, bt + dur);
      osc.connect(env); env.connect(musicGain);
      osc.start(bt); osc.stop(bt + dur + 0.02);
      bt += dur;
    });

    /* Pads */
    PADS.forEach((chord, bar) => {
      const t = t0 + bar * BEAT * 4;
      chord.forEach(freq => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        osc.detune.value = (Math.random()-0.5) * 5;
        const dur = BEAT * 4 * 0.95;
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.10, t + BEAT * 0.5);
        env.gain.setValueAtTime(0.10, t + dur - BEAT * 0.5);
        env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(env); env.connect(musicGain);
        osc.start(t); osc.stop(t + dur + 0.02);
      });
    });

    /* Melody */
    MELODY.forEach(([beat, freq, durBeats]) => {
      const t   = t0 + beat * BEAT;
      const dur = durBeats * BEAT * 0.88;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      // slight vibrato
      const lfo = ctx.createOscillator();
      const lfoG = ctx.createGain();
      lfo.frequency.value = 5.2;
      lfoG.gain.value = 4;
      lfo.connect(lfoG); lfoG.connect(osc.frequency);
      lfo.start(t); lfo.stop(t + dur + 0.02);
      const atk = Math.min(0.06, dur * 0.15);
      const rel = Math.min(0.35, dur * 0.4);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.18, t + atk);
      env.gain.setValueAtTime(0.16, t + dur - rel);
      env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(env); env.connect(musicGain);
      osc.start(t); osc.stop(t + dur + 0.02);
    });

    /* Rhythm */
    for (let bar = 0; bar < 4; bar++) {
      const b = t0 + bar * BEAT * 4;
      // Kick on beats 1 & 3
      [0, 2].forEach(beat => {
        const t = b + beat * BEAT;
        const ko = ctx.createOscillator(); const kg = ctx.createGain();
        ko.type = 'sine';
        ko.frequency.setValueAtTime(160, t);
        ko.frequency.exponentialRampToValueAtTime(42, t + 0.16);
        kg.gain.setValueAtTime(0.48, t);
        kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        ko.connect(kg); kg.connect(musicGain);
        ko.start(t); ko.stop(t + 0.25);
      });
      // Snare on beats 2 & 4
      [1, 3].forEach(beat => {
        const t = b + beat * BEAT;
        noise(0.12, 0.14, musicGain, t, 2200, 'bandpass');
        noise(0.09, 0.08, musicGain, t, 5000, 'highpass');
      });
      // Hi-hats
      for (let s = 0; s < 8; s++) {
        const t = b + s * BEAT * 0.5;
        const vol = s % 2 === 0 ? 0.07 : 0.04;
        noise(0.04, vol, musicGain, t, 9000, 'highpass');
      }
    }
  }

  function musicTick () {
    if (!ctx || !musicActive) return;
    const now = ctx.currentTime;
    while (nextLoopAt < now + AHEAD) {
      scheduleMusicLoop(nextLoopAt);
      nextLoopAt += LOOP;
    }
  }

  function startMusic () {
    if (!ctx || musicActive) return;
    musicActive = true;
    nextLoopAt  = ctx.currentTime + 0.12;
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setValueAtTime(0, ctx.currentTime);
    musicGain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 2.5);
    schedInterval = setInterval(musicTick, 80);
    musicTick();
  }

  function stopMusic () {
    musicActive = false;
    if (schedInterval) { clearInterval(schedInterval); schedInterval = null; }
    if (ctx) {
      musicGain.gain.cancelScheduledValues(ctx.currentTime);
      musicGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
    }
  }

  function toggleMusic () {
    if (!ctx) return false;
    if (musicActive) { stopMusic(); return false; }
    else { startMusic(); return true; }
  }

  function toggleSFX () { sfxEnabled = !sfxEnabled; return sfxEnabled; }

  /* ================================================================
     PUBLIC API
     ================================================================ */
  return {
    init, resume, startMusic, stopMusic, toggleMusic, toggleSFX,
    click, place, possess, releasePossess, attack,
    enemyDeath, waveClear, waveStart, specialAbility, breach,
    shopOpen, purchase, giftCode, pull, victory, defeat
  };
})();
