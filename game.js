// Embedded demo replays (author-provided), per level id
const DEMO_REPLAYS = {
  
  1: {"meta":{"seed":"2-L1","level":1,"when":1754928105000},"actions":[{"t":2.366666666666661,"action":"down"},{"t":2.5166666666666604,"action":"up"},{"t":3.633333333333323,"action":"down"},{"t":3.899999999999989,"action":"up"},{"t":5.066666666666708,"action":"down"},{"t":5.566666666666733,"action":"up"},{"t":6.166666666666763,"action":"down"},{"t":6.31666666666677,"action":"up"},{"t":7.11666666666681,"action":"down"},{"t":7.25000000000015,"action":"up"},{"t":10.533333333333376,"action":"down"},{"t":10.716666666666699,"action":"up"},{"t":11.399999999999993,"action":"down"},{"t":11.599999999999982,"action":"up"},{"t":12.366666666666605,"action":"down"},{"t":12.49999999999993,"action":"up"},{"t":15.599999999999755,"action":"down"},{"t":15.73333333333308,"action":"up"},{"t":16.666666666666362,"action":"down"},{"t":16.824999999999687,"action":"up"},{"t":17.699999999999637,"action":"down"},{"t":17.833333333332963,"action":"up"},{"t":20.53333333333281,"action":"down"},{"t":20.699999999999466,"action":"up"},{"t":21.483333333332755,"action":"down"},{"t":21.683333333332744,"action":"up"},{"t":25.63333333333252,"action":"down"},{"t":25.86666666666584,"action":"up"},{"t":25.558333333332524,"action":"down"},{"t":26.241666666665818,"action":"up"},{"t":25.624999999999186,"action":"down"},{"t":25.80833333333251,"action":"up"},{"t":30.374999999998916,"action":"down"},{"t":30.624999999998902,"action":"up"},{"t":31.8416666666655,"action":"down"},{"t":32.00833333333216,"action":"up"},{"t":35.32499999999864,"action":"down"},{"t":35.491666666665296,"action":"up"},{"t":36.391666666665245,"action":"down"},{"t":37.358333333331856,"action":"up"},{"t":35.50833333333196,"action":"down"},{"t":35.62499999999862,"action":"up"},{"t":36.22499999999859,"action":"down"},{"t":36.391666666665245,"action":"up"},{"t":35.4416666666653,"action":"down"},{"t":35.54166666666529,"action":"up"},{"t":36.158333333331925,"action":"down"},{"t":36.274999999998585,"action":"up"},{"t":37.208333333331865,"action":"down"},{"t":37.358333333331856,"action":"up"},{"t":35.35833333333197,"action":"down"},{"t":35.47499999999863,"action":"up"},{"t":36.09166666666526,"action":"down"},{"t":36.191666666665256,"action":"up"},{"t":37.124999999998536,"action":"down"},{"t":37.25833333333186,"action":"up"},{"t":41.55833333333162,"action":"down"},{"t":41.89166666666493,"action":"up"},{"t":42.658333333331555,"action":"down"},{"t":42.891666666664875,"action":"up"},{"t":48.00833333333125,"action":"down"},{"t":48.60833333333122,"action":"up"},{"t":47.991666666664585,"action":"down"},{"t":48.82499999999787,"action":"up"},{"t":49.30833333333118,"action":"down"},{"t":49.508333333331166,"action":"up"},{"t":53.65833333333093,"action":"down"},{"t":53.84166666666425,"action":"up"},{"t":53.699999999997594,"action":"down"},{"t":54.2333333333309,"action":"up"},{"t":59.31666666666394,"action":"down"},{"t":59.999999999997236,"action":"up"},{"t":60.24999999999722,"action":"down"},{"t":60.44999999999721,"action":"up"}]}
};



function hasEmbeddedDemo(levelId){ return !!DEMO_REPLAYS[levelId]; }
function getEmbeddedDemo(levelId){ return DEMO_REPLAYS[levelId]; }
// Sekina Dash – minimalist runner inspired by Geometry Dash

const CONFIG = {
  gravity: 2200, // px/s^2
  jumpImpulse: 900, // px/s – a bit more juice for a bigger dog
  maxJumpHoldMs: 240,
  groundYRatio: 0.78,
  player: { x: 120, width: 84, height: 56 },
  speed: 320, // start speed px/s
  speedGain: 0.22, // per second
  startGapPx: 720, // fixed gap before first section (device-independent)
  spawnAheadPx: 1600, // how far ahead to keep spawning (device-independent)
  // Pointy obstacles (spikes)
  obstacle: { minGap: 320, maxGap: 520, minWidth: 28, maxWidth: 46, minHeight: 40, maxHeight: 100 },
  // Platforms you can land on (always reachable)
  platform: { minWidth: 140, maxWidth: 240, height: 18, minRise: 40, maxRise: 170, probability: 0.45 },
  coinRate: 0.6,
  shakeOnHitMs: 450
};

// Fixed-step for deterministic replay
const FIXED_DT = 1 / 120; // 120 Hz

function dbg(...args) { if (DEBUG) try { console.log('[DBG]', ...args); } catch {} }

// Debug mode: allow selecting seed and level on the title screen
// Enabled via URL parameter ?debug=1|true|on (or ?debug with no value)
const DEBUG = (() => {
  try {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('debug');
    if (v === '' || v === '1') return true;
    if (typeof v === 'string') {
      const t = v.toLowerCase();
      return t === 'true' || t === 'on' || t === 'yes';
    }
    return false;
  } catch {
    return false;
  }
})();

// Preset seeds for 10 levels (tweak as needed)
const PRESET_LEVEL_SEEDS = [
  '2',
  'L2-topspikes-start',
  'L3-tighter-platforms',
  'L4-faster-saws',
  'L5-arc-coins',
  'L6-more-blocks',
  'L7-sparse-platforms',
  'L8-saw-and-topspike-mix',
  'L9-dense-spikes',
  'L10-marathon'
];

// Single level duration in seconds
const LEVEL_DURATION_SEC = 60;

const state = {
  running: false,
  audioOn: true,
  best: Number(localStorage.getItem('sekina_best') || 0),
  score: 0,
  levelScore: 0,
  debugHitbox: false,
  uiToasts: [],
  autoHoldUntil: 0,
  autoHold2Until: 0,
  autoPlan: null
};

const dom = {
  canvas: document.getElementById('game'),
  tapHint: document.getElementById('tap-hint'),
  menu: document.getElementById('menu'),
  how: document.getElementById('howto'),
  gameover: document.getElementById('gameover'),
  leveldone: document.getElementById('leveldone'),
  play: document.getElementById('play'),
  howBtn: document.getElementById('how'),
  backBtn: document.getElementById('back'),
  retry: document.getElementById('retry'),
  menuBtn: document.getElementById('menu-btn'),
  nextLevel: document.getElementById('next-level'),
  menuBtnLevelComplete: document.getElementById('menu-btn-lc'),
  seedInput: document.getElementById('seed'),
  autoplay: document.getElementById('autoplay'),
  copyReplay: document.getElementById('copy-replay'),
  showHint: document.getElementById('show-hint'),
  stopReplay: document.getElementById('stop-replay'),
  levels: document.getElementById('levels'),
  score: document.getElementById('score'),
  best: document.getElementById('best'),
  finalScore: document.getElementById('final-score'),
  finalBest: document.getElementById('final-best'),
  share: document.getElementById('share'),
  mute: document.getElementById('mute')
};

dom.best.textContent = state.best.toString();
// Level names kept short for mobile
const LEVELS = [
  { id: 1, title: 'Start' },
  { id: 2, title: 'TopSpin' },
  { id: 3, title: 'Tight' },
  { id: 4, title: 'Saws+' },
  { id: 5, title: 'Arc+' },
  { id: 6, title: 'Blocks+' },
  { id: 7, title: 'Sparse' },
  { id: 8, title: 'Mix+' },
  { id: 9, title: 'Dense' },
  { id: 10, title: 'Marathn' }
];

function getHighs() {
  try { return JSON.parse(localStorage.getItem('sekina_highs') || '{}'); } catch { return {}; }
}

function getHighFor(levelId) {
  const raw = getHighs()[levelId];
  if (raw == null) return { score: 0, furthest: 0 };
  if (typeof raw === 'number') return { score: raw, furthest: 0 };
  const score = Number(raw.score || 0);
  const furthest = Math.max(0, Math.min(1, Number(raw.furthest || 0)));
  return { score, furthest };
}

function getProgress() {
  const unlocked = Number(localStorage.getItem('sekina_unlocked') || '1');
  const highs = getHighs();
  return { unlocked: Math.max(1, Math.min(LEVELS.length, unlocked)), highs };
}

function setUnlocked(levelId) {
  const current = Number(localStorage.getItem('sekina_unlocked') || '1');
  const next = Math.max(current, Math.min(LEVELS.length, levelId + 1));
  localStorage.setItem('sekina_unlocked', String(Math.max(next, 1)));
}

function setHighscore(levelId, score, furthestRatio) {
  const key = 'sekina_highs';
  const highs = getHighs();
  const prev = getHighFor(levelId);
  const next = {
    score: Math.max(prev.score, Number(score || 0)),
    furthest: Math.max(prev.furthest, Math.max(0, Math.min(1, Number(furthestRatio || 0))))
  };
  highs[levelId] = next;
  localStorage.setItem(key, JSON.stringify(highs));
}

// Furthest progress (0..1) per-level for subtle progress indicator
function getFurthestMap() {
  try { return JSON.parse(localStorage.getItem('sekina_furthest') || '{}'); } catch { return {}; }
}
function getFurthestRatio(levelId) {
  const map = getFurthestMap();
  const v = Number(map[levelId] || 0);
  return isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
}
function setFurthestRatio(levelId, ratio01) {
  const r = Math.max(0, Math.min(1, Number(ratio01) || 0));
  const map = getFurthestMap();
  map[levelId] = Math.max(Number(map[levelId] || 0), r);
  localStorage.setItem('sekina_furthest', JSON.stringify(map));
}

function buildLevelSelect() {
  const container = dom.levels;
  if (!container) return;
  const { unlocked, highs } = getProgress();
  container.innerHTML = '';
  LEVELS.forEach(lv => {
    const btn = document.createElement('button');
    btn.className = 'level-btn' + (lv.id > unlocked && !DEBUG ? ' locked' : '');
    btn.disabled = (lv.id > unlocked && !DEBUG);
    btn.title = `Level ${lv.id}`;
    const hf = (typeof highs[lv.id] === 'number') ? { score: highs[lv.id], furthest: 0 } : (highs[lv.id] || { score: 0, furthest: 0 });
    const furPercent = Math.round(100 * Math.max(0, Math.min(1, Number(hf.furthest || 0))));
    const scoreVal = Number(hf.score || 0);
    btn.innerHTML = `
      <div class="title">L${lv.id} · ${lv.title}</div>
      <div class="meta">HS ${scoreVal} · ${furPercent}%</div>
    `;
    btn.addEventListener('click', () => {
      // v debug lze skákat kamkoliv, jinak pouze odemčené
      const target = lv.id;
      dom.menu.classList.remove('visible');
      dom.gameover.classList.remove('visible');
      dom.how?.classList.remove('visible');
      // pokud je debug, nastavíme input levelu, aby se vzal v startLevel
      if (DEBUG) {
        const lvEl = document.getElementById('level');
        if (lvEl) lvEl.value = String(target);
      } else {
        state.level = target;
      }
      resetRun();
      state.level = target;
      state.running = true;
      hint(true);
    });
    container.appendChild(btn);
  });
}

function refreshLevelSelect() {
  buildLevelSelect();
}

const ctx = dom.canvas.getContext('2d');
let lastTs = 0;
let viewport = { width: dom.canvas.width, height: dom.canvas.height, groundY: 0 };
let world, inputs, sprites, sounds;

// Section plan generator for a given level (increasing difficulty)
function estimateLevelDistancePx() {
  const s0 = CONFIG.speed;
  const s1 = CONFIG.speed + CONFIG.speedGain * LEVEL_DURATION_SEC;
  const avg = (s0 + s1) / 2;
  return Math.floor(avg * LEVEL_DURATION_SEC);
}

function estimateLevelDistanceWithPlanPx(level) {
  // approximate target used for plan building
  return estimateLevelDistancePx() + 400;
}

function buildPlanForLevel(level) {
  const target = estimateLevelDistancePx() + 400; // small spacing between sections
  let acc = 0;
  const plan = [];
  let i = 0;
  while (acc < target && i < 200) {
    const phase = acc / target; // 0..1 progress ratio
    const sec = createSectionFor(level, phase);
    plan.push(sec);
    acc += sec.length;
    i++;
  }
  return plan;
}

function createSectionFor(level, phase) {
  const r = world.levelRng || Math.random; // fallback
  const baseLen = 640 + Math.floor(r() * 280);
  const length = Math.floor(baseLen * (1 + phase * 0.22 + level * 0.08));
  const items = [];

  const add = (obj) => items.push(obj);

  // Difficulty based on level
  const difficulty = Math.max(0, (level - 1)); // 0 for L1, increases with level

  // Level-influenced probabilities
  const platformProb = Math.max(0.35, 0.75 - difficulty * 0.05); // fewer platforms at higher levels
  const sawProb = Math.min(0.9, 0.7 + difficulty * 0.03); // more saws at higher levels

  // Platform chains
  if (r() < platformProb) {
    add({ t: 'platform', dx: 180, w: 160 + Math.floor(r() * 80), rise: 80 + Math.floor(r() * 80) });
    if (r() < 0.5 + phase * 0.4) add({ t: 'platform', dx: 420, w: 140 + Math.floor(r() * 100), rise: 100 + Math.floor(r() * 120) });
  }

  // Spikes and blocks by phase and level
  const spikeCount = Math.min(5 + Math.floor(level * 0.8) + Math.floor(difficulty * 0.4), 12);
  for (let s = 0; s < Math.floor(2 + phase * 2) + Math.floor(r() * spikeCount * 0.5); s++) {
    add({ t: 'spike', dx: 240 + s * 160, h: 60 + Math.floor(r() * 40) });
  }
  if (r() < 0.55) add({ t: 'block', dx: 200 + Math.floor(r() * 320), w: 120, h: 28 + Math.floor(r() * 16) });

  // Saws
  if (r() < sawProb) {
    add({ t: 'saw', dx: 520, y: 110 + Math.floor(r() * 80), r: 18 + Math.floor(r() * 8), amp: 34 + Math.floor(r() * 50), speed: 2.2 + phase * 1.2 + level * 0.25 });
  }
  // Ceiling spikes
  if (level >= 2 && r() < 0.25 + phase * 0.25 + Math.min(0.2, difficulty * 0.04)) {
    const h = 40 + Math.floor(r() * 50);
    add({ t: 'topSpike', dx: 520 + Math.floor(r() * 240), h, w: 32 });
  }

  // Coins
  if (r() < 0.75) add({ t: 'coinsLine', dx: 260, y: 140 + Math.floor(r() * 80), count: 5 + Math.floor(r() * 3), gap: 32 });
  if (r() < 0.35 + phase * 0.25) add({ t: 'coinsArc', dx: 520, y: 200, r: 80 + Math.floor(r() * 40), spread: Math.PI * (0.7 + r() * 0.4) });

  // Bonuses: slightly less common at higher levels to increase difficulty
  const bonusProb = Math.max(0.15, 0.25 - difficulty * 0.02);
  if (r() < bonusProb) add({ t: 'bonus', dx: 340, y: 170 + Math.floor(r() * 40), kind: r() < 0.5 ? 'shield' : 'double' });

  // Final densifying element
  if (r() < Math.min(0.7, 0.4 + phase)) add({ t: 'spike', dx: 740, h: 70 });

  return { length, items };
}

function resizeCanvasToCSSPixels() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = dom.canvas.getBoundingClientRect();
  const width = Math.floor(rect.width * dpr);
  const height = Math.floor(rect.height * dpr);
  if (dom.canvas.width !== width || dom.canvas.height !== height) {
    dom.canvas.width = width;
    dom.canvas.height = height;
  }
  viewport = {
    width,
    height,
    groundY: Math.floor(height * CONFIG.groundYRatio)
  };
}

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

// Seeded RNG (xmur3 + sfc32)
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function sfc32(a, b, c, d) {
  return function () {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

function createRng(seedStr) {
  const seedGen = xmur3(String(seedStr));
  const rng = sfc32(seedGen(), seedGen(), seedGen(), seedGen());
  return rng;
}

function createAudioContext() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    return new AudioCtx();
  } catch {
    return null;
  }
}

function makeSound(ctx, type) {
  if (!ctx) return () => {};
  return (note = 440, time = 0.05) => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = note;
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + time);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(t + time);
  };
}

function init() {
  resizeCanvasToCSSPixels();
  const imgDog = loadImage('assets/jack.svg');
  const imgObs = loadImage('assets/obstacle.svg');
  const imgCoin = loadImage('assets/coin.svg');
  const imgPlat = loadImage('assets/platform.svg');
  const imgSaw = loadImage('assets/saw.svg');
  const imgShield = loadImage('assets/shield.svg');
  const imgFeather = loadImage('assets/feather.svg');
  sprites = { dog: imgDog, obstacle: imgObs, coin: imgCoin, platform: imgPlat, saw: imgSaw, shield: imgShield, feather: imgFeather };

  const audioCtx = createAudioContext();
  sounds = {
    jump: makeSound(audioCtx, 'square'),
    coin: makeSound(audioCtx, 'triangle'),
    hit: makeSound(audioCtx, 'sawtooth')
  };

  inputs = createInputs(dom.canvas);
  world = createWorld();
  buildLevelSelect();
  draw(0);
}

function createInputs(target) {
  const pressed = { jump: false, justPressed: false };
  const start = (e) => {
    // allow tap anywhere to jump, but only during active gameplay
    const gameActive = state.running && !dom.menu.classList.contains('visible') && !dom.gameover.classList.contains('visible') && !dom.leveldone.classList.contains('visible');
    if (!gameActive) return;
    // In debug autoplay mode we still allow manual taps (we only record/rewind)
    e.preventDefault();
    if (!pressed.jump) pressed.justPressed = true;
    pressed.jump = true;
    // record manual press for replay (debug autoplay recording)
    if (DEBUG) {
      (state.autoRecording ||= []).push({ t: world.time, action: 'down' });
    }
    hint(false);
  };
  const end = (e) => { e.preventDefault(); pressed.jump = false; if (DEBUG) { (state.autoRecording ||= []).push({ t: world.time, action: 'up' }); } };
  // listen on window so taps anywhere trigger jump on mobile
  window.addEventListener('pointerdown', start, { passive: false });
  window.addEventListener('pointerup', end);
  window.addEventListener('keydown', (e) => { if ((e.code === 'Space' || e.code === 'ArrowUp') && !e.repeat) { if (!pressed.jump) pressed.justPressed = true; pressed.jump = true; if (DEBUG) { (state.autoRecording ||= []).push({ t: world.time, k: world.tick||0, action: 'down' }); } hint(false);} });
  window.addEventListener('keydown', (e) => { if (e.code === 'KeyH') state.debugHitbox = !state.debugHitbox; });
  window.addEventListener('keyup', (e) => { if (e.code === 'Space' || e.code === 'ArrowUp') { pressed.jump = false; if (DEBUG) { (state.autoRecording ||= []).push({ t: world.time, k: world.tick||0, action: 'up' }); } } });
// Rewind to previous autosave in autoplay (debug)
window.addEventListener('keydown', (e) => {
  if (!DEBUG) return;
  if (e.code === 'KeyR') {
    e.preventDefault();
    // pop last gap snapshot and restore previous one
    if (world.gapSnapshots && world.gapSnapshots.length >= 2) {
      world.gapSnapshots.pop();
      const prev = world.gapSnapshots[world.gapSnapshots.length - 1];
      restoreSnapshot(prev);
      state.uiToasts.push({ id: Math.random(), text: 'Rewind prev', born: world.time, dur: 0.8 });
    }
  } else if (e.code === 'KeyS') {
    e.preventDefault();
    // restore latest confirmed autosave (do not pop)
    const last = (world.gapSnapshots && world.gapSnapshots[world.gapSnapshots.length - 1]) || world.lastGapSnapshot;
    if (last) {
      restoreSnapshot(last);
      state.uiToasts.push({ id: Math.random(), text: 'Rewind last', born: world.time, dur: 0.8 });
    }
  }
});
  return {
    isJumping: () => pressed.jump,
    consumePress: () => { const was = pressed.justPressed; pressed.justPressed = false; return was; }
  };
}

function createWorld() {
  return {
    time: 0,
    speed: CONFIG.speed,
    distance: 0,
    player: {
      x: CONFIG.player.x,
      y: 0,
      vy: 0,
      width: CONFIG.player.width,
      height: CONFIG.player.height,
      onGround: true,
      jumpHoldMs: 0,
      usedDoubleJumpInAir: false
    },
    obstacles: [],
    platforms: [],
    blocks: [],
    saws: [],
    coins: [],
    bonuses: [],
    spawnCursorX: 0,
    nextSectionIndex: 0,
    plannedSections: [],
    sections: [], // spawned section boundaries { index, startWX, endWX }
    stopSpawning: false,
    timeUp: false,
    finalSectionEndX: null,
    finishX: null,
    // rewind support (debug)
    currentSectionIdx: -1,
    lastSectionSnapshot: null,
    lastGapSnapshot: null,
    lastGapMidWX: null,
    pendingGapMidWX: null,
    gapSnapshots: [],
    levelTimeLeft: LEVEL_DURATION_SEC,
    levelElapsed: 0,
    tick: 0
  };
}

function resetRun() {
  state.score = 0;
  state.levelScore = 0;
  dom.score.textContent = '0';
  world = createWorld();
  state.power = { shieldHits: 0, doubleJumpUntil: 0, invulnUntil: 0 };
  // level may be chosen from menu; default to 1
  state.level = state.level || 1;
  startLevel(state.level);
}

function startGame() {
  resetRun();
  state.running = true;
  dom.menu.classList.remove('visible');
  dom.gameover.classList.remove('visible');
  dom.how?.classList.remove('visible');
  hint(true);
}

function endGame() {
  state.running = false;
  dom.finalScore.textContent = state.score.toString();
  // highscore per-level
  const totalEnd = estimateLevelDistanceWithPlanPx(state.level || 1);
  const ratioEnd = totalEnd > 0 ? Math.max(0, Math.min(1, (world.distance + (world.player?.x || 0)) / totalEnd)) : 0;
  if (!DEBUG) {
    setHighscore(state.level || 1, state.score, ratioEnd);
  }
  state.best = Math.max(state.best, state.score);
  localStorage.setItem('sekina_best', String(state.best));
  dom.best.textContent = state.best.toString();
  dom.finalBest.textContent = state.best.toString();
  dom.gameover.classList.add('visible');
  shake();
  // Show hint (demo) after 5 fails if embedded demo exists
  failCount += 1;
  if (failCount >= 5 && hasEmbeddedDemo(state.level || 1)) {
    dom.showHint?.classList.remove('hidden');
  }
  // In debug autoplay, automatically retry the same level/seed until success
  if (DEBUG && dom.autoplay?.checked) {
    setTimeout(() => {
      dom.gameover.classList.remove('visible');
      startLevel(state.level || 1);
      state.running = true;
    }, 250);
  }
}

function startLevel(levelNumber) {
  world.time = 0;
  world.levelElapsed = 0;
  world.levelTimeLeft = LEVEL_DURATION_SEC;
  world.speed = CONFIG.speed;
  world.distance = 0;
  // place player safely on ground at start
  world.player.y = viewport.groundY - world.player.height;
  world.player.vy = 0;
  world.player.onGround = true;
  state.levelScore = 0;
  // start-of-level furthest marker (from previous attempts)
  world.furthestRatioAtStart = getHighFor(levelNumber).furthest || 0;
  // Deterministic RNG for level
  // Priority: in DEBUG mode you can set seed and level from menu
  let chosenLevel = levelNumber;
  const menuVisible = !!dom.menu?.classList.contains('visible');
  if (DEBUG && menuVisible) {
    const lvEl = document.getElementById('level');
    const dbgLevel = parseInt(lvEl?.value || '', 10);
    if (!Number.isNaN(dbgLevel) && dbgLevel >= 1 && dbgLevel <= PRESET_LEVEL_SEEDS.length) {
      chosenLevel = dbgLevel;
    }
  }

  const seedValueRaw = (dom.seedInput?.value?.trim() || '').toLowerCase();
  let baseSeed = '';
  if (DEBUG) {
    if (state.overrideBaseSeed) {
      baseSeed = state.overrideBaseSeed;
    } else if (menuVisible && seedValueRaw) {
      baseSeed = seedValueRaw; // manual debug seed
      state.overrideBaseSeed = baseSeed;
    } else {
      baseSeed = PRESET_LEVEL_SEEDS[(chosenLevel - 1) % PRESET_LEVEL_SEEDS.length] || `L${chosenLevel}`;
      state.overrideBaseSeed = baseSeed;
    }
  } else {
    baseSeed = PRESET_LEVEL_SEEDS[(chosenLevel - 1) % PRESET_LEVEL_SEEDS.length] || `L${chosenLevel}`;
  }
  const seed = `${baseSeed}-L${chosenLevel}`;
  world.levelRng = createRng(seed);
  world.seedStr = seed;
  world.obstacles.length = 0;
  world.platforms.length = 0;
  world.blocks.length = 0;
  world.saws.length = 0;
  world.coins.length = 0;
  world.bonuses.length = 0;
  world.topSpikes = [];
  // propagate chosen level to state for UI and fallbacks
  state.level = chosenLevel;
  world.plannedSections = buildPlanForLevel(chosenLevel);
  world.nextSectionIndex = 0;
  world.sections = [];
  world.stopSpawning = false;
  world.timeUp = false;
  world.finalSectionEndX = null;
  world.finishX = null;
  world.spawnCursorX = CONFIG.startGapPx + viewport.width * 0; // device-independent fixed start gap
  // refresh level select UI (HS, lock states)
  refreshLevelSelect();
  // recording reset in debug
  if (DEBUG) {
    state.autoPlan = null;
    state.autoRecording = [];
    state.overrideBaseSeed = state.overrideBaseSeed || undefined;
    state.recordStartTick = world.tick || 0;
    // start paused or running based on checkbox? keep running
  }
}

// --- Snapshot/rewind helpers (debug) ---
function captureSnapshot() {
  return {
    time: world.time,
    speed: world.speed,
    distance: world.distance,
    levelTimeLeft: world.levelTimeLeft,
    levelElapsed: world.levelElapsed,
    power: { ...(state.power || {}) },
    tick: world.tick || 0,
    player: { ...world.player },
    obstacles: world.obstacles.map(o => ({ ...o })),
    platforms: world.platforms.map(p => ({ ...p })),
    blocks: world.blocks.map(b => ({ ...b })),
    saws: world.saws.map(s => ({ ...s })),
    coins: world.coins.map(c => ({ ...c })),
    bonuses: world.bonuses.map(b => ({ ...b })),
    topSpikes: (world.topSpikes||[]).map(t => ({ ...t })),
    spawnCursorX: world.spawnCursorX,
    nextSectionIndex: world.nextSectionIndex
  };
}

function restoreSnapshot(s) {
  if (!s) return;
  world.time = s.time;
  world.speed = s.speed;
  world.distance = s.distance;
  if (typeof s.levelTimeLeft === 'number') world.levelTimeLeft = s.levelTimeLeft;
  if (typeof s.levelElapsed === 'number') world.levelElapsed = s.levelElapsed;
  if (s.power) state.power = { ...s.power };
  if (typeof s.tick === 'number') world.tick = s.tick;
  // clear any pending replay injections
  state._injectDown = false;
  state._injectUp = false;
  state._replayHolding = false;
  state._replayJust = false;
  world.player = { ...s.player };
  world.obstacles = s.obstacles.map(o => ({ ...o }));
  world.platforms = s.platforms.map(p => ({ ...p }));
  world.blocks = s.blocks.map(b => ({ ...b }));
  world.saws = s.saws.map(x => ({ ...x }));
  world.coins = s.coins.map(c => ({ ...c }));
  world.bonuses = s.bonuses.map(b => ({ ...b }));
  world.topSpikes = s.topSpikes.map(t => ({ ...t }));
  world.spawnCursorX = s.spawnCursorX;
  world.nextSectionIndex = s.nextSectionIndex;
  // If we annotated a desired world distance override, use it
  if (typeof s.distanceOverride === 'number') {
    world.distance = Math.max(0, s.distanceOverride);
  }
  // If recording debug actions, trim any recorded actions beyond restored tick
  if (DEBUG && Array.isArray(state.autoRecording) && state.autoRecording.length) {
    const t = world.tick || 0;
    state.autoRecording = state.autoRecording.filter(a => (typeof a.k === 'number' ? a.k <= t : true));
  }
}

function completeLevel() {
  // save per-level HS (score + furthest ratio) and unlock the next level
  const totalOk = estimateLevelDistanceWithPlanPx(state.level || 1);
  const ratioOk = totalOk > 0 ? Math.max(0, Math.min(1, (world.distance + (world.player?.x || 0)) / totalOk)) : 0;
  if (!DEBUG) {
    setHighscore(state.level || 1, state.levelScore || 0, ratioOk);
  }
  setUnlocked(state.level || 1);
  refreshLevelSelect();
  // Save successful autoplay replay for this level/seed (debug)
  if (DEBUG && Array.isArray(state.autoRecording) && state.autoRecording.length > 0) {
    try {
      const key = `sekina_replay_L${state.level}`;
      const meta = { seed: world.seedStr, level: state.level, when: Date.now() };
      localStorage.setItem(key, JSON.stringify({ meta, actions: state.autoRecording }));
      state.uiToasts.push({ id: Math.random(), text: 'Replay saved', born: world.time, dur: 1.2 });
      // show copy button
      dom.copyReplay?.classList.remove('hidden');
    } catch {}
  }
  // Show level complete overlay and wait for user action
  state.running = false;
  dom.leveldone?.classList.add('visible');
}

function hint(show) {
  dom.tapHint.classList.toggle('show', !!show);
}

function shake() {
  dom.canvas.classList.remove('shake');
  void dom.canvas.offsetWidth; // restart animation
  dom.canvas.classList.add('shake');
}

function aabb(a, b) {
  return !(a.x + a.width < b.x || a.x > b.x + b.width || a.y + a.height < b.y || a.y > b.y + b.height);
}

function circleRectIntersect(cx, cy, r, rect) {
  const rx = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
  const ry = Math.max(rect.y, Math.min(cy, rect.y + rect.height));
  const dx = cx - rx;
  const dy = cy - ry;
  return (dx * dx + dy * dy) <= r * r;
}

// --- Autoplay simulation helpers (debug) ---
function simulatePressPlan(pressDelay, holdMs, allowDoubleJump, windowSec = 1.2) {
  // Clone minimal player state
  const sim = {
    x: world.player.x,
    y: world.player.y,
    vy: world.player.vy,
    width: world.player.width,
    height: world.player.height,
    onGround: world.player.onGround,
    usedDouble: false,
    jumpHoldMs: 0
  };
  const dt = 1 / 120;
  const t0 = world.time;
  let t = 0;
  let pressAt = Math.max(0, pressDelay || 0);
  const holdTime = Math.max(0, holdMs || 0);
  let holdUntil = null;
  // Local copies of dynamic arrays with shallow refs (positions updated by dx)
  const obs = world.obstacles.map(o => ({...o}));
  const blks = world.blocks.map(b => ({...b}));
  const plats = world.platforms.map(p => ({...p}));
  const saws = world.saws.map(s => ({...s}));
  const tops = (world.topSpikes||[]).map(tp => ({...tp}));
  let speed = world.speed;

  function updateEntities(dx, time) {
    for (const o of obs) o.x += dx;
    for (const b of blks) b.x += dx;
    for (const p of plats) p.x += dx;
    for (const s of saws) s.x += dx;
    for (const tp of tops) tp.x += dx;
    // saw cy computed on demand
  }
  function playerHitbox() {
    const hitW = sim.width * 0.72;
    const hitH = sim.height * 0.60;
    return { x: sim.x - hitW / 2, y: sim.y + (sim.height - hitH) * 0.5, width: hitW, height: hitH };
  }
  function collideRect(a,b){return !(a.x + a.width < b.x || a.x > b.x + b.width || a.y + a.height < b.y || a.y > b.y + b.height);}

  while (t < windowSec) {
    // Horizontal world moves left
    const dx = -speed * dt;
    updateEntities(dx, t0 + t);

    // Handle press
    if (pressAt <= 0 && sim.onGround && holdUntil === null) {
      sim.onGround = false;
      sim.vy = -CONFIG.jumpImpulse;
      sim.jumpHoldMs = 0;
      holdUntil = t + holdTime;
    }
    pressAt -= dt;

    // Apply hold for variable jump height
    if (!sim.onGround && holdUntil !== null && t < holdUntil && sim.jumpHoldMs < CONFIG.maxJumpHoldMs) {
      sim.vy -= 900 * dt;
      sim.jumpHoldMs += dt * 1000;
    }

    // gravity
    sim.vy += CONFIG.gravity * dt;
    const prevY = sim.y;
    sim.y += sim.vy * dt;

    // platform landing
    if (sim.vy >= 0) {
      const prevBottom = prevY + sim.height;
      const currBottom = sim.y + sim.height;
      for (const pf of [...plats, ...blks]) {
        const top = pf.y;
        const left = pf.x;
        const right = pf.x + pf.width;
        const playerLeft = sim.x - sim.width / 2;
        const playerRight = sim.x + sim.width / 2;
        const horizontalOverlap = playerRight > left && playerLeft < right;
        if (horizontalOverlap && prevBottom <= top && currBottom >= top) {
          sim.y = top - sim.height;
          sim.vy = 0;
          sim.onGround = true;
          break;
        }
      }
    }
    // ground
    const groundTop = viewport.groundY - sim.height;
    if (sim.y >= groundTop) {
      sim.y = groundTop;
      sim.vy = 0;
      sim.onGround = true;
    }

    // collisions
    const pb = playerHitbox();
    for (const o of obs) { if (collideRect(pb, {x:o.x,y:o.y,width:o.width,height:o.height})) {
      // try double jump once if allowed
      if (allowDoubleJump && !sim.onGround && !sim.usedDouble) {
        sim.vy = -CONFIG.jumpImpulse * 0.9;
        sim.jumpHoldMs = 0;
        sim.usedDouble = true;
      } else {
        return false;
      }
    }}
    for (const tp of tops) { if (collideRect(pb, {x:tp.x,y:tp.y,width:tp.width,height:tp.height})) return false; }
    for (const s of saws) {
      const cy = s.baseY + Math.sin((t0 + t) * s.speed + s.phase) * s.amp;
      if (circleRectIntersect(s.x, cy, s.r, pb)) return false;
    }

    t += dt;
  }
  return true;
}

function spawnSpike(xBase) {
  const r = world.levelRng || Math.random;
  const width = Math.floor(r() * (CONFIG.obstacle.maxWidth - CONFIG.obstacle.minWidth + 1)) + CONFIG.obstacle.minWidth;
  const height = Math.floor(r() * (CONFIG.obstacle.maxHeight - CONFIG.obstacle.minHeight + 1)) + CONFIG.obstacle.minHeight;
  const x = xBase + width;
  const y = viewport.groundY - height;
  world.obstacles.push({ x, y, width, height, passed: false });
  if (Math.random() < CONFIG.coinRate) {
    world.coins.push({ x: x + width * 0.5, y: y - 48, width: 28, height: 28, taken: false });
  }
}

function spawnPlatform(xBase) {
  const r = world.levelRng || Math.random;
  const width = Math.floor(r() * (CONFIG.platform.maxWidth - CONFIG.platform.minWidth + 1)) + CONFIG.platform.minWidth;
  const height = CONFIG.platform.height;
  const rise = Math.floor(r() * (CONFIG.platform.maxRise - CONFIG.platform.minRise + 1)) + CONFIG.platform.minRise;
  const x = xBase + width;
  const y = (viewport.groundY - rise) - height;
  world.platforms.push({ x, y, width, height });
  if (Math.random() < CONFIG.coinRate) {
    world.coins.push({ x: x + width * 0.5, y: y - 40, width: 28, height: 28, taken: false });
  }
}

function spawnBlockAt(x, w, h) {
  const y = viewport.groundY - h;
  const obj = { x: x + w, y, width: w, height: h };
  world.blocks.push(obj);
  return obj;
}

function spawnPlatformAt(x, w, rise) {
  const h = CONFIG.platform.height;
  const y = (viewport.groundY - rise) - h;
  const obj = { x: x + w, y, width: w, height: h };
  world.platforms.push(obj);
  return obj;
}

function spawnSpikeAt(x, h) {
  const r = world.levelRng || Math.random;
  const w = Math.floor(r() * (CONFIG.obstacle.maxWidth - CONFIG.obstacle.minWidth + 1)) + CONFIG.obstacle.minWidth;
  const y = viewport.groundY - h;
  const obj = { x: x + w, y, width: w, height: h, passed: false };
  world.obstacles.push(obj);
  return obj;
}

function spawnTopSpikeAt(x, w, h, yTop) {
  const spikeHeight = h;
  const maxBottom = viewport.groundY - 140; // minimální clearance nad zemí
  const desiredTop = Math.max(0, (yTop ?? 0));
  const clampedTop = Math.min(desiredTop, Math.max(0, maxBottom - spikeHeight));
  const obj = { x: x + w, y: clampedTop, width: w, height: spikeHeight };
  (world.topSpikes ||= []).push(obj);
  return obj;
}

function spawnSawAt(x, yFromGround, r, amp, speed) {
  const baseY = viewport.groundY - yFromGround;
  const rnd = world.levelRng || Math.random;
  const obj = { x: x + r * 2, baseY, r, amp, speed, phase: rnd() * Math.PI * 2 };
  world.saws.push(obj);
  return obj;
}

function spawnCoinsLine(x, yFromGround, count, gap) {
  const y = (viewport.groundY - yFromGround) - 14;
  for (let i = 0; i < count; i++) {
    const cx = x + i * gap;
    world.coins.push({ x: cx, y, width: 28, height: 28, taken: false });
  }
}

function spawnCoinsArc(x, yFromGround, radius, spread) {
  const centerX = x;
  const centerY = viewport.groundY - yFromGround;
  const steps = Math.max(4, Math.floor(spread / 0.35));
  for (let i = 0; i < steps; i++) {
    const t = -spread / 2 + (i / (steps - 1)) * spread;
    const cx = centerX + Math.cos(t) * radius;
    const cy = centerY - Math.sin(t) * radius - 14;
    world.coins.push({ x: cx, y: cy, width: 28, height: 28, taken: false });
  }
}

function spawnBonusAt(x, yFromGround, kind) {
  const y = (viewport.groundY - yFromGround) - 14;
  const type = kind === 'double' ? 'double' : 'shield';
  world.bonuses.push({ x, y, width: 28, height: 28, type, taken: false });
}

function getLastSpawnX() {
  return world.spawnCursorX;
}

function spawnSection(section) {
  const base = world.spawnCursorX;
  const spawned = [];
  // When a new section spawns, we no longer precompute pending gap here
  const sectionPlatforms = section.items
    .filter(it => it.t === 'platform')
    .map(it => ({
      dx: it.dx || 0,
      yTop: (viewport.groundY - (it.rise ?? 100)) - CONFIG.platform.height
    }));

  for (const it of section.items) {
    const x = base + (it.dx || 0);
    if (it.t === 'platform') {
      const obj = spawnPlatformAt(x, it.w ?? 160, it.rise ?? 100);
      spawned.push({ type: 'platform', x: obj.x });
    } else if (it.t === 'spike') {
      const obj = spawnSpikeAt(x, it.h ?? 70);
      spawned.push({ type: 'spike', x: obj.x });
    } else if (it.t === 'topSpike') {
      let yTop;
      if (sectionPlatforms.length > 0) {
        const dxTop = it.dx || 0;
        let best = sectionPlatforms[0];
        let bestDist = Math.abs(best.dx - dxTop);
        for (let k = 1; k < sectionPlatforms.length; k++) {
          const cand = sectionPlatforms[k];
          const d = Math.abs(cand.dx - dxTop);
          if (d < bestDist) { best = cand; bestDist = d; }
        }
        const margin = 36 + Math.floor((world.levelRng || Math.random)() * 18); // 36..54 px nad platformou
        const h = it.h ?? 50;
        yTop = Math.max(0, best.yTop - margin - h);
      } else {
        const h = it.h ?? 50;
        const targetBottom = Math.max(120, viewport.groundY - 220);
        yTop = Math.max(0, targetBottom - h);
      }
      const obj = spawnTopSpikeAt(x, it.w ?? 32, it.h ?? 50, yTop);
      spawned.push({ type: 'topSpike', x: obj.x });
    } else if (it.t === 'block') {
      const obj = spawnBlockAt(x, it.w ?? 120, it.h ?? 30);
      spawned.push({ type: 'block', x: obj.x });
    } else if (it.t === 'saw') {
      const obj = spawnSawAt(x, it.y ?? 140, it.r ?? 18, it.amp ?? 36, it.speed ?? 2.2);
      spawned.push({ type: 'saw', x: obj.x });
    } else if (it.t === 'coinsLine') {
      spawnCoinsLine(x, it.y ?? 160, it.count ?? 5, it.gap ?? 36);
    } else if (it.t === 'coinsArc') {
      spawnCoinsArc(x, it.y ?? 200, it.r ?? 80, it.spread ?? Math.PI * 0.8);
    } else if (it.t === 'bonus') {
      spawnBonusAt(x, it.y ?? 170, it.kind);
    }
  }
  world.spawnCursorX += section.length;
  // record snapshot at the boundary for rewind (debug)
  // (handled at the top now as lastSectionSnapshot)
}

function spawnNext() {
  const index = world.nextSectionIndex;
  const list = world.plannedSections;
  const sec = list[index % list.length] || createSectionFor(state.level || 1, 0.9);
  const base = world.spawnCursorX;
  // capture spawned obstacle positions to define exact section bounds
  const beforeObs = world.obstacles.length;
  const beforePlat = world.platforms.length;
  const beforeBlk = world.blocks.length;
  const beforeTop = (world.topSpikes?.length || 0);
  const beforeSaws = world.saws.length;
  spawnSection(sec);
  const newObs = world.obstacles.slice(beforeObs);
  const newPlat = world.platforms.slice(beforePlat);
  const newBlk = world.blocks.slice(beforeBlk);
  const newTop = (world.topSpikes || []).slice(beforeTop);
  const newSaws = world.saws.slice(beforeSaws);
  let firstX = Infinity;
  let lastX = -Infinity;
  for (const o of newObs) { firstX = Math.min(firstX, o.x); lastX = Math.max(lastX, o.x + (o.width || 0)); }
  for (const o of newPlat) { firstX = Math.min(firstX, o.x); lastX = Math.max(lastX, o.x + (o.width || 0)); }
  for (const o of newBlk) { firstX = Math.min(firstX, o.x); lastX = Math.max(lastX, o.x + (o.width || 0)); }
  for (const o of newTop) { firstX = Math.min(firstX, o.x); lastX = Math.max(lastX, o.x + (o.width || 0)); }
  for (const s of newSaws) { const w = (s.r || 0) * 2; firstX = Math.min(firstX, s.x - w/2); lastX = Math.max(lastX, s.x + w/2); }
  // record section boundaries in world space
  const startWX = isFinite(firstX) ? firstX : base;
  const endWX = isFinite(lastX) ? lastX : (base + sec.length);
  world.sections.push({ index, startWX, endWX });
  dbg('SECTION', index, { startWX, endWX, base, length: sec.length });
  world.nextSectionIndex += 1;
  if (DEBUG) {
    world.currentSectionIdx = index;
    // set pending gap between previous section end and current section start (real positions)
    const prevSection = world.sections[world.sections.length - 2];
    if (prevSection && isFinite(firstX)) {
      const gapMid = (prevSection.endWX + startWX) / 2;
      const playerWorldX = world.distance + world.player.x;
      if (world.pendingGapMidWX == null && gapMid > playerWorldX + 20) {
        world.pendingGapMidWX = gapMid;
        dbg('PENDING_GAP', { prevEnd: prevSection.endWX, nextStart: startWX, gapMid });
      }
    }
  }
}

function update(dt) {
  world.time += dt;
  world.levelElapsed += dt;
  world.levelTimeLeft = Math.max(0, world.levelTimeLeft - dt);
  world.speed += CONFIG.speedGain * dt;
  world.distance += world.speed * dt;

  const player = world.player;
  // gravity
  player.vy += CONFIG.gravity * dt;

  // jump
  // Apply replay injections (down/up) into inputs
  if (state._injectDown) { state._replayHolding = true; state._replayJust = true; }
  if (state._injectUp) { state._injectUp = false; state._replayHolding = false; }
  let pressedNow = inputs.consumePress() || !!state._replayJust || (!!state.replay && state._injectDown);
  state._replayJust = false;
  state._injectDown = false;
  // Debug autoplay now does not auto-press; it only records (handled in input) and rewinds on fail
  if (player.onGround && pressedNow) {
    player.onGround = false;
    player.vy = -CONFIG.jumpImpulse;
    player.jumpHoldMs = 0;
    if (state.audioOn) sounds.jump(620, 0.06);
  } else if (!player.onGround && pressedNow && state?.power?.doubleJumpUntil && world.time < state.power.doubleJumpUntil && !player.usedDoubleJumpInAir) {
    player.vy = -CONFIG.jumpImpulse * 0.9;
    player.jumpHoldMs = 0;
    player.usedDoubleJumpInAir = true;
    if (state.audioOn) sounds.jump(740, 0.05);
  } else if (!player.onGround && ((inputs.isJumping()) || state._replayHolding) && player.jumpHoldMs < CONFIG.maxJumpHoldMs) {
    player.vy -= 900 * dt; // variable jump height
    player.jumpHoldMs += dt * 1000;
  }

  const prevY = player.y;
  player.y += player.vy * dt;

  // platform landing (one-way from above)
  const prevBottom = prevY + player.height;
  const currBottom = player.y + player.height;
  if (player.vy >= 0) {
    for (const pf of [...world.platforms, ...world.blocks]) {
      const top = pf.y;
      const left = pf.x;
      const right = pf.x + pf.width;
      const playerLeft = player.x - player.width / 2;
      const playerRight = player.x + player.width / 2;
      const horizontalOverlap = playerRight > left && playerLeft < right;
      if (horizontalOverlap && prevBottom <= top && currBottom >= top) {
        player.y = top - player.height;
        player.vy = 0;
        player.onGround = true;
        player.usedDoubleJumpInAir = false;
        break;
      }
    }
  }

  // ground collision
  const groundTop = viewport.groundY - player.height;
  if (player.y >= groundTop) {
    player.y = groundTop;
    player.vy = 0;
    player.onGround = true;
    player.usedDoubleJumpInAir = false;
  }

  // spawn next sections ahead so there is always something to run
  if (!world.stopSpawning) {
    while ((getLastSpawnX() - world.distance) < (CONFIG.spawnAheadPx)) {
      spawnNext();
    }
  }

  // If we have a pending gap midpoint (world-space) and player prošel za něj, potvrď gap snapshot
  if (DEBUG && typeof world.pendingGapMidWX === 'number') {
    const playerWorldX = world.distance + world.player.x;
    if (playerWorldX > world.pendingGapMidWX) {
      const gapSnap = captureSnapshot();
      // align on restore do středu gapu: distanceOverride = gapMid - player.x
      gapSnap.distanceOverride = Math.max(0, world.pendingGapMidWX - world.player.x);
      world.lastGapSnapshot = gapSnap;
      world.lastGapMidWX = world.pendingGapMidWX;
      world.gapSnapshots.push(gapSnap);
      world.pendingGapMidWX = null;
      dbg('CONFIRM_GAP', { lastGapMidWX: world.lastGapMidWX });
    }
  }

  // Time limit handling: once time is up, finish in the QUIET ZONE after the current section
  if (!world.timeUp && world.levelTimeLeft <= 0) {
    world.timeUp = true;
    world.stopSpawning = true;
    // determine current section under the player
    const playerWorldX = world.distance + world.player.x;
    let current = null;
    for (let i = 0; i < world.sections.length; i++) {
      const s = world.sections[i];
      if (playerWorldX >= s.startWX && playerWorldX < s.endWX) { current = s; break; }
    }
    // fallback: if not found (e.g., early), take the last spawned section
    const selected = current || world.sections[world.sections.length - 1];
    if (selected) {
      // finish point is midway through the QUIET gap after this section
      world.finalSectionEndX = selected.endWX;
      world.finishX = selected.endWX + Math.max(80, CONFIG.startGapPx * 0.5);
    } else {
      // if nothing spawned yet, complete immediately
      world.finalSectionEndX = world.distance + 1;
      world.finishX = world.finalSectionEndX;
    }
  }
  if (world.timeUp && world.finishX != null) {
    const playerWorldX = world.distance + world.player.x;
    if (playerWorldX >= world.finishX) {
      completeLevel();
      return;
    }
  }

  // move and recycle
  const dx = -world.speed * dt;
  for (const o of world.obstacles) o.x += dx;
  for (const p of world.platforms) p.x += dx;
  for (const b of world.blocks) b.x += dx;
  for (const s of world.saws) s.x += dx;
  for (const c of world.coins) c.x += dx;
  for (const b of world.bonuses) b.x += dx;
  if (world.topSpikes) {
    for (const t of world.topSpikes) t.x += dx;
  }
  world.obstacles = world.obstacles.filter(o => o.x + o.width > -50);
  world.platforms = world.platforms.filter(p => p.x + p.width > -50);
  world.blocks = world.blocks.filter(p => p.x + p.width > -50);
  world.saws = world.saws.filter(s => s.x + s.r * 2 > -50);
  world.coins = world.coins.filter(c => c.x + c.width > -50 && !c.taken);
  world.bonuses = world.bonuses.filter(b => b.x + b.width > -50 && !b.taken);
  if (world.topSpikes) {
    world.topSpikes = world.topSpikes.filter(t => t.x + t.width > -50);
  }

  // scoring and collisions
  for (const o of world.obstacles) {
    const hitbox = { x: o.x, y: o.y, width: o.width, height: o.height };
    const pb = getPlayerHitbox();
    if (aabb(pb, hitbox)) {
      if (state?.power?.invulnUntil && world.time < state.power.invulnUntil) {
        // ignore
      } else if (state?.power?.shieldHits > 0) {
        state.power.shieldHits -= 1;
        state.power.invulnUntil = world.time + 0.8;
        if (state.audioOn) sounds.hit(260, 0.06);
      } else {
        if (DEBUG && world.lastGapSnapshot) {
          restoreSnapshot(world.lastGapSnapshot);
          state.uiToasts.push({ id: Math.random(), text: 'Rewind', born: world.time, dur: 0.8 });
          return; // resume from snapshot
        } else {
          if (state.audioOn) sounds.hit(200, 0.08);
          endGame();
          return;
        }
      }
    }
    if (!o.passed && o.x + o.width < player.x) {
      o.passed = true;
      state.score += 1;
      state.levelScore += 1;
      dom.score.textContent = String(state.score);
    }
  }

  // top spikes collisions
  if (world.topSpikes) {
    for (const t of world.topSpikes) {
      const hitbox = { x: t.x, y: t.y, width: t.width, height: t.height };
      const pb = getPlayerHitbox();
      if (aabb(pb, hitbox)) {
        if (state?.power?.invulnUntil && world.time < state.power.invulnUntil) {
          // ignore
        } else if (state?.power?.shieldHits > 0) {
          state.power.shieldHits -= 1;
          state.power.invulnUntil = world.time + 0.8;
          if (state.audioOn) sounds.hit(260, 0.06);
        } else {
          if (DEBUG && world.lastGapSnapshot) {
            restoreSnapshot(world.lastGapSnapshot);
            state.uiToasts.push({ id: Math.random(), text: 'Rewind', born: world.time, dur: 0.8 });
            return;
          } else {
            if (state.audioOn) sounds.hit(200, 0.08);
            endGame();
            return;
          }
        }
      }
    }
  }

  // saw collisions
  for (const s of world.saws) {
    const cy = s.baseY + Math.sin(world.time * s.speed + s.phase) * s.amp;
    const cx = s.x;
    const pb = getPlayerHitbox();
    if (circleRectIntersect(cx, cy, s.r, pb)) {
      if (state?.power?.invulnUntil && world.time < state.power.invulnUntil) {
        // ignore
      } else if (state?.power?.shieldHits > 0) {
        state.power.shieldHits -= 1;
        state.power.invulnUntil = world.time + 0.8;
        if (state.audioOn) sounds.hit(260, 0.06);
      } else {
        if (DEBUG && world.lastGapSnapshot) {
          restoreSnapshot(world.lastGapSnapshot);
          state.uiToasts.push({ id: Math.random(), text: 'Rewind', born: world.time, dur: 0.8 });
          return;
        } else {
          if (state.audioOn) sounds.hit(200, 0.08);
          endGame();
          return;
        }
      }
    }
  }
  for (const c of world.coins) {
    const hb = { x: c.x, y: c.y, width: c.width, height: c.height };
    const pb = getPlayerHitbox();
    if (aabb(pb, hb) && !c.taken) {
      c.taken = true;
      state.score += 3;
      state.levelScore += 3;
      dom.score.textContent = String(state.score);
      if (state.audioOn) sounds.coin(880, 0.05);
    }
  }

  for (const b of world.bonuses) {
    const hb = { x: b.x, y: b.y, width: b.width, height: b.height };
    const pb = getPlayerHitbox();
    if (aabb(pb, hb) && !b.taken) {
      b.taken = true;
      if (b.type === 'shield') {
        state.power.shieldHits = (state.power.shieldHits || 0) + 1;
      } else if (b.type === 'double') {
        state.power.doubleJumpUntil = world.time + 9; // 9s double jump
        state.power.doubleJumpTotal = 9;
      }
      // toast
      const toastText = b.type === 'shield' ? 'Shield +1' : 'Double jump active';
      state.uiToasts.push({ id: Math.random(), text: toastText, born: world.time, dur: 1.2 });
      state.score += 2;
      state.levelScore += 2;
      dom.score.textContent = String(state.score);
      if (state.audioOn) sounds.coin(660, 0.05);
    }
  }
}

function drawBackground(ctx) {
  // parallax sky dots
  const t = world.time;
  ctx.save();
  for (let i = 0; i < 40; i++) {
    const p = i / 40;
    const x = (viewport.width * p + ((t * 15) % viewport.width)) % viewport.width;
    const y = 60 + Math.sin(i * 1.7 + t * 0.8) * 20 + p * 120;
    ctx.fillStyle = `hsla(${200 + i * 3}, 90%, ${25 + i % 20}%, 0.4)`;
    ctx.beginPath();
    ctx.arc(viewport.width - x, y, 3 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ground
  ctx.fillStyle = '#0f1426';
  ctx.fillRect(0, viewport.groundY, viewport.width, viewport.height - viewport.groundY);
  // lane
  ctx.fillStyle = '#1b2544';
  ctx.fillRect(0, viewport.groundY - 4, viewport.width, 4);

  // draw finish indicator when time is up: pulsing vertical ribbon at finishX
  if (world.timeUp && world.finishX != null) {
    const screenX = world.finishX - world.distance;
    if (screenX > -40 && screenX < viewport.width + 40) {
      const pulse = 0.5 + 0.5 * Math.sin(world.time * 6);
      const grad = ctx.createLinearGradient(0, 0, 0, viewport.groundY);
      grad.addColorStop(0, `hsla(290, 90%, ${60 + pulse * 20}%, 0.85)`);
      grad.addColorStop(1, `hsla(260, 90%, ${45 + pulse * 15}%, 0.85)`);
      ctx.save();
      ctx.translate(Math.floor(screenX), 0);
      ctx.fillStyle = grad;
      const ribbonWidth = 10 + Math.floor(pulse * 6);
      ctx.fillRect(-ribbonWidth / 2, 0, ribbonWidth, viewport.groundY);
      // chequered flag effect near top
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#ffffffcc';
      const flagY = 20;
      const flagW = 36;
      const flagH = 18;
      ctx.fillRect(-flagW / 2, flagY, flagW, flagH);
      ctx.fillStyle = '#00000088';
      for (let y = 0; y < 2; y++) {
        for (let x = 0; x < 6; x++) {
          if ((x + y) % 2 === 0) ctx.fillRect(-flagW / 2 + x * (flagW / 6), flagY + y * (flagH / 2), flagW / 6, flagH / 2);
        }
      }
      ctx.restore();
    }
  }

  // subtle level progress bar (bottom center), with personal furthest mark
  const total = estimateLevelDistanceWithPlanPx(state.level || 1);
  const progress = Math.max(0, Math.min(1, world.distance / total));
  const saved = world.furthestRatioAtStart || 0;
  const barWidth = Math.min(280, Math.floor(viewport.width * 0.5));
  const barHeight = 6;
  const x0 = Math.floor((viewport.width - barWidth) / 2);
  const y0 = viewport.groundY + 12;
  ctx.save();
  ctx.globalAlpha = 0.85;
  // background
  ctx.fillStyle = '#0b0f1a';
  ctx.fillRect(x0, y0, barWidth, barHeight);
  // progress fill
  const fillW = Math.floor(barWidth * progress);
  const grad2 = ctx.createLinearGradient(x0, 0, x0 + fillW, 0);
  grad2.addColorStop(0, '#6d28d9');
  grad2.addColorStop(1, '#22d3ee');
  ctx.fillStyle = grad2;
  ctx.fillRect(x0, y0, fillW, barHeight);
  // saved furthest marker
  const mx = x0 + Math.floor(barWidth * saved);
  ctx.fillStyle = '#ffffffbb';
  ctx.fillRect(mx - 1, y0 - 2, 2, barHeight + 4);
  ctx.restore();

  // Debug: draw marker for last gap snapshot (where rewind returns)
  if (DEBUG && typeof world.lastGapMidWX === 'number') {
    const screenX = world.lastGapMidWX - world.distance;
    if (screenX > -40 && screenX < viewport.width + 40) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#22d3ee';
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Math.floor(screenX), 0);
      ctx.lineTo(Math.floor(screenX), viewport.groundY);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawDebugSections(ctx) {
  if (!DEBUG) return;
  const pad = 40;
  const leftWorld = world.distance - pad;
  const rightWorld = world.distance + viewport.width + pad;
  ctx.save();
  ctx.lineWidth = 2;
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  // Draw section boundaries
  for (const s of world.sections) {
    if (!s) continue;
    // start line (green)
    if (s.startX >= leftWorld && s.startX <= rightWorld) {
      const x = Math.floor(s.startX - world.distance);
      ctx.strokeStyle = '#22c55e';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, viewport.groundY);
      ctx.stroke();
      ctx.fillStyle = '#22c55e';
      ctx.fillText(`S${s.index}`, x + 4, 12);
    }
    // end line (red)
    if (s.endX >= leftWorld && s.endX <= rightWorld) {
      const x = Math.floor(s.endX - world.distance);
      ctx.strokeStyle = '#ef4444';
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, viewport.groundY);
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.fillText(`E${s.index}`, x + 4, 24);
    }
  }
  // Draw gap midpoints
  if (typeof world.lastGapMidWX === 'number') {
    const gx = world.lastGapMidWX - world.distance;
    if (gx > -pad && gx < viewport.width + pad) {
      ctx.strokeStyle = '#22d3ee';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(Math.floor(gx), 0);
      ctx.lineTo(Math.floor(gx), viewport.groundY);
      ctx.stroke();
      ctx.fillStyle = '#22d3ee';
      ctx.fillText('GAP', Math.floor(gx) + 4, 36);
    }
  }
  if (typeof world.pendingGapMidWX === 'number') {
    const gx = world.pendingGapMidWX - world.distance;
    if (gx > -pad && gx < viewport.width + pad) {
      ctx.strokeStyle = '#f59e0b';
      ctx.setLineDash([2, 6]);
      ctx.beginPath();
      ctx.moveTo(Math.floor(gx), 0);
      ctx.lineTo(Math.floor(gx), viewport.groundY);
      ctx.stroke();
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('PENDING', Math.floor(gx) + 4, 48);
    }
  }
  ctx.restore();
}

function drawPlayer(ctx) {
  const p = world.player;
  const bob = Math.sin(world.time * 20) * (p.onGround ? 2 : 4);
  const img = sprites.dog;
  const scale = 1.1; // větší viditelný hráč
  const w = p.width * scale;
  const h = p.height * scale;
  const cx = Math.floor(p.x);
  const cy = Math.floor(p.y + p.height / 2) + bob;
  const angle = Math.max(-0.18, Math.min(0.22, p.vy / 2000)); // jemné naklonění směrem letu
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  if (img && img.complete) {
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
  } else {
    ctx.fillStyle = '#fff';
    ctx.fillRect(-w / 2, -h / 2, w, h);
  }
  ctx.restore();
}

function getPlayerHitbox() {
  const p = world.player;
  const hitW = p.width * 0.72;
  const hitH = p.height * 0.60;
  return {
    x: p.x - hitW / 2,
    y: p.y + (p.height - hitH) * 0.5,
    width: hitW,
    height: hitH
  };
}

function drawObstacles(ctx) {
  ctx.save();
  for (const o of world.obstacles) {
    if (sprites.obstacle && sprites.obstacle.complete) {
      ctx.drawImage(sprites.obstacle, Math.floor(o.x), Math.floor(o.y), Math.floor(o.width), Math.floor(o.height));
    } else {
      ctx.fillStyle = '#4a6bff';
      ctx.fillRect(o.x, o.y, o.width, o.height);
    }
  }
  // top spikes rendering (inverted)
  if (world.topSpikes) {
    for (const t of world.topSpikes) {
      if (sprites.obstacle && sprites.obstacle.complete) {
        ctx.save();
        ctx.translate(Math.floor(t.x), Math.floor(t.y));
        ctx.scale(1, -1);
        ctx.drawImage(sprites.obstacle, 0, -Math.floor(t.height), Math.floor(t.width), Math.floor(t.height));
        ctx.restore();
      } else {
        ctx.fillStyle = '#4a6bff';
        ctx.fillRect(t.x, t.y, t.width, t.height);
      }
    }
  }
  ctx.restore();
}

function drawPlatforms(ctx) {
  ctx.save();
  for (const p of world.platforms) {
    if (sprites.platform && sprites.platform.complete) {
      ctx.drawImage(sprites.platform, Math.floor(p.x), Math.floor(p.y), Math.floor(p.width), Math.floor(p.height));
    } else {
      const grd = ctx.createLinearGradient(0, p.y, 0, p.y + p.height);
      grd.addColorStop(0, '#78ffd152');
      grd.addColorStop(1, '#2a49ff');
      ctx.fillStyle = grd;
      ctx.fillRect(p.x, p.y, p.width, p.height);
    }
  }
  ctx.restore();
}

function drawBlocks(ctx) {
  ctx.save();
  for (const b of world.blocks) {
    ctx.fillStyle = '#2a335a';
    ctx.strokeStyle = '#0a0f2a';
    ctx.lineWidth = 2;
    ctx.fillRect(Math.floor(b.x), Math.floor(b.y), Math.floor(b.width), Math.floor(b.height));
    ctx.strokeRect(Math.floor(b.x), Math.floor(b.y), Math.floor(b.width), Math.floor(b.height));
  }
  ctx.restore();
}

function drawSaws(ctx) {
  ctx.save();
  for (const s of world.saws) {
    const cy = s.baseY + Math.sin(world.time * s.speed + s.phase) * s.amp;
    const cx = s.x;
    if (sprites.saw && sprites.saw.complete) {
      const size = s.r * 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((world.time * 6) % (Math.PI * 2));
      ctx.drawImage(sprites.saw, -size / 2, -size / 2, size, size);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy, s.r, 0, Math.PI * 2);
      ctx.fillStyle = '#cbd5e1';
      ctx.fill();
      ctx.strokeStyle = '#0a0f2a';
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawBonuses(ctx) {
  ctx.save();
  for (const b of world.bonuses) {
    let img = b.type === 'shield' ? sprites.shield : sprites.feather;
    if (img && img.complete) {
      ctx.drawImage(img, Math.floor(b.x), Math.floor(b.y), b.width, b.height);
    } else {
      ctx.fillStyle = b.type === 'shield' ? '#60a5fa' : '#f472b6';
      ctx.fillRect(b.x, b.y, b.width, b.height);
    }
  }
  ctx.restore();
}

function drawCoins(ctx) {
  ctx.save();
  for (const c of world.coins) {
    const bob = Math.sin((world.time + c.x * 0.01) * 5) * 6;
    if (sprites.coin && sprites.coin.complete) {
      ctx.drawImage(sprites.coin, Math.floor(c.x), Math.floor(c.y + bob), c.width, c.height);
    } else {
      ctx.fillStyle = '#ffd53a';
      ctx.beginPath();
      ctx.arc(c.x + c.width / 2, c.y + c.height / 2 + bob, c.width / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawPowerups(ctx) {
  const margin = 12;
  let x = margin;
  const y = margin;
  const size = 28;
  ctx.save();
  ctx.globalAlpha = 0.95;
  // Background pill depending on visible powerups
  const showShield = (state?.power?.shieldHits || 0) > 0;
  const djLeft = Math.max(0, (state?.power?.doubleJumpUntil || 0) - world.time);
  const showDJ = djLeft > 0.05;
  if (showShield || showDJ) {
    const count = (showShield ? 1 : 0) + (showDJ ? 1 : 0);
    const pillW = count * (size + 10) + 12;
    ctx.fillStyle = '#0b0f1acc';
    ctx.strokeStyle = '#ffffff1a';
    ctx.lineWidth = 1.5;
    const r = 12;
    const px = 6;
    const py = 6;
    // rounded rect
    ctx.beginPath();
    ctx.moveTo(px + r, py);
    ctx.arcTo(px + pillW, py, px + pillW, py + r, r);
    ctx.arcTo(px + pillW, py + size + 12, px + pillW - r, py + size + 12, r);
    ctx.arcTo(px, py + size + 12, px, py + size + 12 - r, r);
    ctx.arcTo(px, py, px + r, py, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    let drawX = px + 8;
    if (showShield) {
      if (sprites.shield && sprites.shield.complete) {
        ctx.drawImage(sprites.shield, drawX, py + 8, size, size);
      } else {
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(drawX, py + 8, size, size);
      }
      // hits label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`x${Math.max(0, state?.power?.shieldHits || 0)}`, drawX + size + 4, py + 26);
      drawX += size + 34;
    }
    if (showDJ) {
      if (sprites.feather && sprites.feather.complete) {
        ctx.drawImage(sprites.feather, drawX, py + 8, size, size);
      } else {
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(drawX, py + 8, size, size);
      }
      const total = Math.max(0.1, state?.power?.doubleJumpTotal || 9);
      const ratio = Math.max(0, Math.min(1, djLeft / total));
      // time bar under icon
      const barW = size;
      const barH = 5;
      const bx = drawX;
      const by = py + 8 + size + 4;
      ctx.fillStyle = '#0f1426';
      ctx.fillRect(bx, by, barW, barH);
      const grad = ctx.createLinearGradient(bx, 0, bx + barW, 0);
      grad.addColorStop(0, '#22d3ee');
      grad.addColorStop(1, '#6d28d9');
      ctx.fillStyle = grad;
      ctx.fillRect(bx, by, Math.floor(barW * ratio), barH);
      drawX += size + 18;
    }
  }
  ctx.restore();
}

function draw(timestamp) {
  const ts = timestamp || performance.now();
  let dt = Math.min(0.032, (ts - lastTs) / 1000 || 0);
  lastTs = ts;

  resizeCanvasToCSSPixels();

  ctx.clearRect(0, 0, viewport.width, viewport.height);
  drawBackground(ctx);

  if (state.running) {
    // Deterministic fixed-step loop for replay (and normal run)
    // Accumulate dt and step in FIXED_DT increments
    if (!state._accum) state._accum = 0;
    state._accum = Math.min(0.25, state._accum + dt);
    while (state._accum >= FIXED_DT) {
      state._accum -= FIXED_DT;
      // If playing a replay, inject down/up events precisely aligned to world.time
    if (state.replay && state.replay.actions) {
      const currentTick = world.tick || 0;
      while (true) {
        const idx = state.replayPtr || 0;
        const next = state.replay.actions[idx];
        if (!next) break;
        const targetTick = (typeof next.k === 'number') ? next.k : null;
        if (targetTick != null) {
          if (currentTick < targetTick) break;
        } else {
          const tRel = world.time - (state.replayStartTime || 0);
          if (tRel < (next.t || 0)) break;
        }
        if (next.action === 'down') state._injectDown = true;
        else if (next.action === 'up') state._injectUp = true;
        state.replayPtr = idx + 1;
      }
    }
      update(FIXED_DT);
      world.tick += 1;
    }
  }
  drawPlatforms(ctx);
  drawBlocks(ctx);
  drawSaws(ctx);
  drawObstacles(ctx);
  drawCoins(ctx);
  drawBonuses(ctx);
  drawDebugSections(ctx);
  drawPowerups(ctx);
  // toasts (top-center, subtle)
  if (state.uiToasts && state.uiToasts.length) {
    const now = world.time;
    const cx = Math.floor(viewport.width / 2);
    let y = 18;
    const next = [];
    for (const t of state.uiToasts) {
      const age = now - t.born;
      const life = t.dur || 1.2;
      if (age < 0 || age > life + 0.3) continue;
      const a = age < life ? 1 : Math.max(0, 1 - (age - life) / 0.3);
      const slide = Math.min(1, age / 0.15);
      const offY = Math.floor((1 - slide) * -10);
      ctx.save();
      ctx.globalAlpha = a * 0.95;
      ctx.fillStyle = '#0b0f1acc';
      ctx.strokeStyle = '#ffffff1a';
      ctx.lineWidth = 1;
      ctx.textAlign = 'center';
      ctx.font = '600 14px system-ui, sans-serif';
      const padX = 12, padY = 6;
      const textW = Math.ceil(ctx.measureText(t.text).width);
      const w = textW + padX * 2;
      const h = 26;
      const x0 = cx - Math.floor(w / 2);
      const y0 = y + offY;
      // pill
      ctx.beginPath();
      const r = 12;
      ctx.moveTo(x0 + r, y0);
      ctx.arcTo(x0 + w, y0, x0 + w, y0 + r, r);
      ctx.arcTo(x0 + w, y0 + h, x0 + w - r, y0 + h, r);
      ctx.arcTo(x0, y0 + h, x0, y0 + h - r, r);
      ctx.arcTo(x0, y0, x0 + r, y0, r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // text
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(t.text, cx, y0 + 18);
      ctx.restore();
      y += h + 6;
      if (age < life + 0.3) next.push(t);
    }
    state.uiToasts = next;
  }
  drawPlayer(ctx);

  // debug hitbox
  if (state.debugHitbox) {
    const hb = getPlayerHitbox();
    ctx.save();
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.floor(hb.x), Math.floor(hb.y), Math.floor(hb.width), Math.floor(hb.height));
    ctx.restore();
  }

  requestAnimationFrame(draw);
}

// UI wiring
window.addEventListener('resize', resizeCanvasToCSSPixels);

dom.play?.addEventListener('click', () => {
  // start currently selected level (from menu or debug input)
  resetRun();
  state.running = true;
  dom.menu.classList.remove('visible');
  dom.gameover.classList.remove('visible');
  document.getElementById('app')?.classList.add('playing');
  hint(true);
});

dom.retry?.addEventListener('click', () => startGame());

// Removed pause autoplay UI

// Show hint (play embedded demo replay)
dom.showHint?.addEventListener('click', () => {
  const lvl = state.level || 1;
  const demo = getEmbeddedDemo(lvl);
  if (!demo) return;
  startLevel(lvl);
  state.replay = demo;
  state.replayPtr = 0;
  state.replayStartTime = world.time;
  state.running = true;
  dom.gameover.classList.remove('visible');
  dom.stopReplay?.classList.remove('hidden');
});

dom.stopReplay?.addEventListener('click', () => {
  // stop replay and show menu
  state.replay = null;
  state.running = false;
  dom.stopReplay?.classList.add('hidden');
  dom.menu.classList.add('visible');
});

dom.menuBtn?.addEventListener('click', () => {
  // go back to main menu from game over
  state.running = false;
  dom.gameover.classList.remove('visible');
  dom.menu.classList.add('visible');
  refreshLevelSelect();
  document.getElementById('app')?.classList.remove('playing');
});

dom.nextLevel?.addEventListener('click', () => {
  dom.leveldone.classList.remove('visible');
  // go to next level if exists
  const next = Math.min((state.level || 1) + 1, LEVELS.length);
  state.level = next;
  startLevel(state.level);
  state.running = true;
  document.getElementById('app')?.classList.add('playing');
});

// Copy replay JSON (debug)
dom.copyReplay?.addEventListener('click', async () => {
  try {
    const key = `sekina_replay_L${state.level || 1}`;
    const val = localStorage.getItem(key) || '';
    if (!val) return;
    await navigator.clipboard.writeText(val);
    state.uiToasts.push({ id: Math.random(), text: 'Copied!', born: world.time, dur: 0.8 });
  } catch {}
});

// Watch replay offer after N fails
let failCount = 0;

dom.menuBtnLevelComplete?.addEventListener('click', () => {
  // go back to main menu from level complete overlay
  state.running = false;
  dom.leveldone.classList.remove('visible');
  dom.menu.classList.add('visible');
  refreshLevelSelect();
  document.getElementById('app')?.classList.remove('playing');
});

// How-to overlay removed from UI

// Share button removed from UI

dom.mute?.addEventListener('click', () => {
  state.audioOn = !state.audioOn;
  dom.mute.textContent = state.audioOn ? '🔊' : '🔇';
});

// UI: in debug mode show controls for seed & level; otherwise hide
window.addEventListener('load', () => {
  const seedRow = document.getElementById('seed-row');
  const levelRow = document.getElementById('level-row');
  const autoplayRow = document.getElementById('autoplay-row');
  if (!DEBUG) {
    seedRow?.classList.add('hidden');
    levelRow?.classList.add('hidden');
    autoplayRow?.classList.add('hidden');
    dom.stopReplay?.classList.add('hidden');
  } else {
    seedRow?.classList.remove('hidden');
    levelRow?.classList.remove('hidden');
    autoplayRow?.classList.remove('hidden');
    // stop replay button only if autoplay debug is visible
    dom.stopReplay?.classList.add('hidden');
  }
});

function randRange(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// start
window.addEventListener('load', init);
