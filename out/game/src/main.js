// Solmar Bay — entry point: game state, screens, the main loop, saving.
// The city, the story and every system live in the modules; this file wires
// them together and owns the title screen, pause, busted/wasted and the
// save in localStorage.

import { WORLD_W, WORLD_H, TUNE } from './config.js';
import { mulberry32 } from './random.js';
import { generateWorld, landmarkPos } from './world.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { makePlayer, updatePlayer } from './player.js';
import { updateTraffic, maintainTraffic, collideCars, seedParkedCars } from './vehicles.js';
import { updatePeds } from './pedestrians.js';
import { updateWanted, updatePolice, starsFor } from './police.js';
import { updateBullets, updateEnemies } from './combat.js';
import { updateMission, updateFare, updateCollectibles, seedCollectibles, startMission, showDialogue } from './missions.js';
import { drawWorld } from './render.js';
import { drawHUD, drawTitle, drawHowTo, drawPause, drawEnd, drawStoryComplete } from './hud.js';
import { setupShot } from './shots.js';

const SAVE_KEY = 'solmarbay-save-v1';
const WORLD_SEED = 20261120;
const STATIONS = ['SOLMAR FM', 'BAY 98.5', 'VICE WAVE'];

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  G.viewW = canvas.width;
  G.viewH = canvas.height;
}

const G = {
  world: null,
  rng: mulberry32(WORLD_SEED),
  seed: WORLD_SEED,
  player: null,
  playerCar: null,
  cars: [],
  peds: [],
  cops: [],
  policeCars: [],
  enemies: [],
  bullets: [],
  sparks: [],
  wanted: 0,
  stars: 0,
  lastCrime: 99,
  lastCrimeReason: '',
  missionsDone: [false, false, false, false, false],
  mission: null,
  nextMissionAt: 0,
  dialogue: null,
  dialogueQueue: [],
  fare: null,
  fareTimer: 24,
  collectibles: [],
  camera: { x: 1600, y: 1600, zoom: 1 },
  time: 0,
  clockMinutes: 17 * 60 + 40,
  station: STATIONS[0],
  stationTimer: 0,
  shake: 0,
  flash: null,
  shotsFired: 0,
  enemiesKilled: 0,
  spawnTimer: 0,
  pedTimer: 0,
  policeTimer: 0,
  copTimer: 0,
  state: 'title',
  menuSel: 0,
  hasSave: false,
  storyComplete: false,
  storyShown: false,
  busted: false,
  wasted: false,
  viewW: 1280,
  viewH: 720,
  lastAimMove: -99,
  aiming: false,
  stoleCar: false,
  audio: new AudioEngine(),
  input: null,
  shotReady: false,
  shotMode: false,
};

G.input = new Input(canvas);
window.addEventListener('resize', resize);
window.addEventListener('mousemove', () => { G.lastAimMove = G.time; });
window.addEventListener('keydown', () => G.audio.ensure());
canvas.addEventListener('mousedown', () => G.audio.ensure());
window.addEventListener('blur', () => {
  if (G.state === 'play') G.state = 'pause';
});

function init(seed) {
  G.world = generateWorld(seed);
  G.rng = mulberry32(seed + 1);
  G.cars = [];
  G.peds = [];
  G.cops = [];
  G.policeCars = [];
  G.enemies = [];
  G.bullets = [];
  G.sparks = [];
  const safe = landmarkPos(G.world, 'safehouse');
  G.player = makePlayer(safe.x, safe.y + 150);
  seedParkedCars(G);
  seedCollectibles(G);
  G.camera.x = G.player.x;
  G.camera.y = G.player.y;
  G.wanted = 0;
  G.stars = 0;
  G.missionsDone = [false, false, false, false, false];
  G.mission = null;
  G.nextMissionAt = 0;
  G.storyComplete = false;
  G.storyShown = false;
  G.clockMinutes = 17 * 60 + 40;
}

// ---- Saving ---------------------------------------------------------------

G.saveGame = function () {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: G.player.money,
      missionsDone: G.missionsDone,
      taken: G.collectibles.map((c) => c.taken),
      x: G.player.x,
      y: G.player.y,
      health: G.player.health,
      clock: G.clockMinutes,
      seed: G.seed,
    }));
    G.hasSave = true;
  } catch { /* storage unavailable: the game still plays */ }
};

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function applySave(save) {
  G.player.money = save.money;
  G.missionsDone = save.missionsDone;
  save.taken.forEach((t, i) => { if (G.collectibles[i]) G.collectibles[i].taken = t; });
  G.player.x = save.x;
  G.player.y = save.y;
  G.player.health = save.health;
  G.clockMinutes = save.clock;
  G.camera.x = save.x;
  G.camera.y = save.y;
  const next = G.missionsDone.findIndex((d) => !d);
  if (next >= 0) startMission(G, next);
}

// ---- The shared world step (play and screenshot scenes) -------------------

G.stepWorld = function (dt) {
  updatePlayer(G, dt);
  updateTraffic(G, dt);
  maintainTraffic(G, dt);
  collideCars(G);
  updatePeds(G, dt);
  updateWanted(G, dt);
  updatePolice(G, dt);
  updateBullets(G, dt);
  updateEnemies(G, dt);
  updateMission(G, dt);
  updateFare(G, dt);
  updateCollectibles(G);
  // Clock, radio, dialogue, flash, shake.
  G.clockMinutes += dt * 0.5;
  G.stationTimer += dt;
  if (G.stationTimer > 75) {
    G.stationTimer = 0;
    G.station = STATIONS[(STATIONS.indexOf(G.station) + 1) % STATIONS.length];
  }
  if (G.dialogue) {
    G.dialogue.t += dt;
    if (G.dialogue.t >= G.dialogue.dur) {
      const next = G.dialogueQueue.shift();
      G.dialogue = next ? { speaker: next.speaker, text: next.text, t: 0, dur: 4.2 } : null;
    }
  }
  if (G.flash) {
    G.flash.t -= dt;
    if (G.flash.t <= 0) G.flash = null;
  }
  G.shake = Math.max(0, G.shake - dt * 22);
  // Siren when the law is close.
  const sirenNear = G.policeCars.some((c) => Math.hypot(c.x - G.player.x, c.y - G.player.y) < 650);
  G.audio.siren(sirenNear);
  if (!G.playerCar) G.audio.engine(false, 0);
  // Camera follows the player (or the car).
  const target = G.playerCar || G.player;
  G.camera.x += (target.x - G.camera.x) * Math.min(1, dt * 5);
  G.camera.y += (target.y - G.camera.y) * Math.min(1, dt * 5);
  // Busted and wasted.
  if (G.player.health <= 0 && !G.wasted) {
    G.wasted = true;
    G.state = 'wasted';
    G.audio.wasted();
    G.audio.engine(false, 0);
  }
  if (G.busted) {
    G.busted = false;
    G.state = 'busted';
    G.audio.wasted();
  }
  if (G.storyComplete && !G.storyShown) {
    G.storyShown = true;
    G.state = 'story';
  }
};

function respawn(kind) {
  const spot = kind === 'wasted' ? landmarkPos(G.world, 'hospital') : landmarkPos(G.world, 'police');
  if (G.playerCar) {
    G.playerCar.kind = 'parked';
    G.playerCar = null;
  }
  G.player.x = spot.x;
  G.player.y = spot.y + 130;
  G.player.health = 100;
  G.player.money = Math.max(0, G.player.money - TUNE.bustFine);
  G.wanted = 0;
  G.stars = 0;
  G.cops = [];
  G.policeCars = [];
  G.enemies = [];
  G.bullets = [];
  G.wasted = false;
  G.camera.x = G.player.x;
  G.camera.y = G.player.y;
  if (G.mission) {
    const idx = G.mission.index;
    G.mission = null;
    startMission(G, idx);
  }
  G.state = 'play';
}

// ---- Screens ---------------------------------------------------------------

function titleItems() {
  return ['NEW GAME', G.hasSave ? 'CONTINUE' : null, 'HOW TO PLAY'].filter(Boolean);
}

function updateTitle(dt) {
  // Attract mode: the camera drifts over the city while traffic flows.
  G.camera.x += Math.sin(G.time * 0.05) * 12 * dt;
  G.camera.y += Math.cos(G.time * 0.04) * 10 * dt;
  updateTraffic(G, dt);
  maintainTraffic(G, dt);
  updatePeds(G, dt);
  const items = titleItems();
  const input = G.input;
  if (input.wasPressed('arrowdown') || input.wasPressed('s')) G.menuSel = (G.menuSel + 1) % items.length;
  if (input.wasPressed('arrowup') || input.wasPressed('w')) G.menuSel = (G.menuSel + items.length - 1) % items.length;
  if (input.wasPressed('enter')) {
    const choice = items[G.menuSel];
    G.audio.ensure();
    G.audio.startMusic();
    if (choice === 'NEW GAME') {
      init(G.seed);
      G.state = 'play';
      startMission(G, 0);
      showDialogue(G, { speaker: 'DANNY', text: "Solmar Bay. Five jobs and I'm done. Let's get to work." });
    } else if (choice === 'CONTINUE') {
      init(G.seed);
      const save = loadSave();
      if (save) applySave(save);
      G.state = 'play';
    } else if (choice === 'HOW TO PLAY') {
      G.state = 'howto';
    }
  }
}

function updatePause() {
  const items = ['RESUME', 'SAVE GAME', 'RESTART MISSION', 'QUIT TO TITLE'];
  const input = G.input;
  if (input.wasPressed('arrowdown') || input.wasPressed('s')) G.menuSel = (G.menuSel + 1) % items.length;
  if (input.wasPressed('arrowup') || input.wasPressed('w')) G.menuSel = (G.menuSel + items.length - 1) % items.length;
  if (input.wasPressed('escape') || input.wasPressed('enter')) {
    const choice = input.wasPressed('escape') ? 'RESUME' : items[G.menuSel];
    if (choice === 'RESUME') G.state = 'play';
    else if (choice === 'SAVE GAME') { G.saveGame(); G.state = 'play'; }
    else if (choice === 'RESTART MISSION' && G.mission) {
      const idx = G.mission.index;
      G.mission = null;
      G.enemies = [];
      startMission(G, idx);
      G.state = 'play';
    } else if (choice === 'QUIT TO TITLE') {
      G.saveGame();
      G.state = 'title';
      G.menuSel = 0;
    }
  }
}

// ---- Main loop --------------------------------------------------------------

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  G.time += dt;
  const input = G.input;

  if (input.wasPressed('m')) G.audio.setMuted(!G.audio.muted);
  if (input.wasPressed('p') && G.state === 'play') G.saveGame();

  if (G.state === 'title') updateTitle(dt);
  else if (G.state === 'howto') {
    if (input.wasPressed('escape') || input.wasPressed('enter')) G.state = 'title';
  } else if (G.state === 'play') {
    if (input.wasPressed('escape')) { G.state = 'pause'; G.menuSel = 0; }
    else G.stepWorld(dt);
  } else if (G.state === 'pause') updatePause();
  else if (G.state === 'wasted') {
    if (input.wasPressed('enter')) respawn('wasted');
  } else if (G.state === 'busted') {
    if (input.wasPressed('enter')) respawn('busted');
  } else if (G.state === 'story') {
    if (input.wasPressed('enter')) { G.state = 'play'; }
  }

  // Render.
  ctx.clearRect(0, 0, G.viewW, G.viewH);
  drawWorld(ctx, G, G.viewW, G.viewH);
  if (G.state === 'play' || G.state === 'pause') drawHUD(ctx, G, G.viewW, G.viewH);
  if (G.state === 'title') drawTitle(ctx, G, G.viewW, G.viewH, G.menuSel);
  else if (G.state === 'howto') drawHowTo(ctx, G, G.viewW, G.viewH);
  else if (G.state === 'pause') drawPause(ctx, G, G.viewW, G.viewH, G.menuSel);
  else if (G.state === 'wasted') drawEnd(ctx, G, G.viewW, G.viewH, 'wasted');
  else if (G.state === 'busted') drawEnd(ctx, G, G.viewW, G.viewH, 'busted');
  else if (G.state === 'story') drawStoryComplete(ctx, G, G.viewW, G.viewH);

  if (G.shotReady && !window.__shotReady) window.__shotReady = true;
  input.endFrame();
  requestAnimationFrame(frame);
}

// ---- Boot -------------------------------------------------------------------

// A read-only state hook for automated play-tests (and curious players):
// window.__dbg() returns the live game state without changing anything.
window.__dbg = function () {
  return {
    state: G.state,
    x: Math.round(G.player.x),
    y: Math.round(G.player.y),
    health: Math.round(G.player.health),
    money: G.player.money,
    inCar: !!G.playerCar,
    speed: G.playerCar ? Math.round(G.playerCar.speed) : 0,
    wanted: Math.round(G.wanted),
    stars: G.stars,
    mission: G.mission ? { id: G.mission.def.id, step: G.mission.step, name: G.mission.def.name } : null,
    missionsDone: G.missionsDone,
    cars: G.cars.length,
    peds: G.peds.length,
    police: G.policeCars.length,
    cops: G.cops.length,
    enemies: G.enemies.length,
    bullets: G.bullets.length,
  };
};

resize();
init(WORLD_SEED);
G.hasSave = !!loadSave();
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const seedParam = Number(params.get('seed'));
if (shot) {
  G.shotMode = true;
  const seed = Number.isFinite(seedParam) ? seedParam : 7;
  init(seed);
  setupShot(G, shot);
}
requestAnimationFrame(frame);
