// Solmar Bay — the game itself: state, the main loop, screens, save/load.
// This file owns the frame: input -> systems -> render. Every other module does
// one job; this one wires them together and keeps the state in one place.

import {
  WORLD_SEED, VIEW_W, VIEW_H, WORLD, SAVE_KEY, BUST_FINE, WASTED_FINE,
  RADIO_SWITCH_SECONDS, roadCenter, blockCenter, LANDMARKS,
} from './config.js';
import { makeRng, clamp, dist } from './random.js';
import { Input } from './input.js';
import { makeWorld, landmarkCenter, randomRoadPoint } from './world.js';
import { AudioEngine } from './audio.js';
import {
  makeCar, spawnTrafficCar, spawnParkedCars, drivePlayerCar,
  stepTrafficCar, resolveCarCollisions, collideCarsWithWorld, carSpeedMph,
} from './vehicles.js';
import { spawnPeds, stepPeds, checkPedHitByCar, scarePeds } from './pedestrians.js';
import {
  makePlayer, stepPlayerOnFoot, aimAt, nearestEnterableCar,
  enterCar, exitCar, collectPickups,
} from './player.js';
import {
  commitCrime, decayWanted, wantedCopCarCount, wantedFootCopCount,
  spawnCopCar, makeFootCop, stepCopCar, stepFootCop, starsForHeat,
} from './police.js';
import { makeBullet, stepBullets, bulletHits, stepGang, makeSparks, stepSparks } from './combat.js';
import {
  MISSION_TITLES, makeMissionState, startMission, updateDialog,
  updateMission, missionMarker,
} from './missions.js';
import {
  drawGround, drawRoads, drawBlocks, drawPickups, drawCar, drawPerson,
  drawBullets, drawSparks, drawMarker,
} from './render.js';
import {
  drawHud, drawTitle, drawHowTo, drawPause, drawBusted, drawWasted, drawComplete,
} from './hud.js';
import { setupShot, readShotParams } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function newGameState(seed) {
  const rng = makeRng(seed);
  const world = makeWorld(seed);
  // Spawn on the road beside the safehouse (never inside a block, where a
  // building could overlap the player or the taxi).
  const safe = landmarkCenter('safehouse');
  const spawnX = roadCenter(LANDMARKS.safehouse.bx + 1);
  const spawnY = blockCenter(LANDMARKS.safehouse.by);
  const player = makePlayer(spawnX, spawnY);
  const cars = [];
  const taxi = makeCar(spawnX, spawnY + 100, -Math.PI / 2, 3, '#f2c230', { isTaxi: true, parked: true });
  cars.push(taxi);
  spawnParkedCars(rng, world, cars, 14);
  for (let i = 0; i < 10; i++) spawnTrafficCar(rng, safe.x, safe.y, 0, cars);
  const peds = spawnPeds(rng, 16, safe.x, safe.y);
  const pickups = [];
  for (let i = 0; i < 12; i++) {
    const p = randomRoadPoint(rng, 1800, 1800, 1600);
    pickups.push({ x: p.x, y: p.y, value: 25, bob: rng.range(0, 6) });
  }
  return {
    rng, world, seed,
    time: 0,
    clock: 17 * 60 + 40, // 5:40 PM
    state: 'title',
    player,
    cars,
    taxi,
    peds,
    copCars: [],
    footCops: [],
    bullets: [],
    enemies: [],
    sparks: [],
    pickups,
    moneyPopups: [],
    heat: 0,
    wanted: 0,
    lastCrime: -999,
    kills: 0,
    shotsFired: 0,
    radio: 0,
    radioTimer: 0,
    musicTimer: 0,
    mission: makeMissionState(),
    missionTitles: MISSION_TITLES,
    cam: { x: 0, y: 0 },
    enterHint: false,
    autoDrive: false,
    marker: null,
    bustTimer: 0,
    audio: new AudioEngine(),
    frames: 0,
    shotMode: null,
  };
}

let G = newGameState(WORLD_SEED);
const input = new Input(canvas);

function saveGame() {
  const p = G.player;
  const data = {
    money: p.money,
    health: p.health,
    missionIndex: G.mission.index,
    x: p.inCar ? p.inCar.x : p.x,
    y: p.inCar ? p.inCar.y : p.y,
    clock: G.clock,
    kills: G.kills,
    pickupsLeft: G.pickups.length,
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* private mode */ }
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function applySave(data) {
  G.player.money = data.money || 0;
  G.player.health = data.health || 100;
  G.player.x = data.x || G.player.x;
  G.player.y = data.y || G.player.y;
  G.clock = data.clock || G.clock;
  G.kills = data.kills || 0;
  startMission(G, Math.min(data.missionIndex || 0, 4));
}

function startNewGame() {
  const seed = G.seed;
  G = newGameState(seed);
  G.state = 'play';
  startMission(G, 0);
  G.audio.ensure();
}

function respawn(kind) {
  const p = G.player;
  if (p.inCar) exitCar(p, G.world);
  // Respawn on the road beside the station / hospital, never inside a block.
  const lm = kind === 'busted' ? LANDMARKS.police : LANDMARKS.hospital;
  p.x = roadCenter(lm.bx + 1);
  p.y = blockCenter(lm.by);
  p.health = 100;
  p.money = Math.max(0, p.money - (kind === 'busted' ? BUST_FINE : WASTED_FINE));
  G.heat = 0;
  G.wanted = 0;
  G.copCars.length = 0;
  G.footCops.length = 0;
  G.enemies.length = 0;
  G.state = 'play';
}

// ---- per-frame updates -------------------------------------------------

function updatePlay(dt) {
  const p = G.player;
  G.time += dt;
  G.clock = (G.clock + dt) % (24 * 60);
  G.radioTimer += dt;
  if (G.radioTimer > RADIO_SWITCH_SECONDS) {
    G.radioTimer = 0;
    G.radio = (G.radio + 1) % 3;
  }
  G.musicTimer += dt;
  if (G.musicTimer > 0.45) {
    G.musicTimer = 0;
    G.audio.musicTick(G.radio);
  }

  const ax = input.axes();
  const dialogAdvance = input.pressed('e') || input.mouseClicked;

  // Dialogue advances on E / click, or automatically after a few seconds.
  // E is NOT consumed by dialogue: the player can drive during a conversation,
  // so one E press both advances the line and (if near a car) enters it.
  if (G.mission.dialog) {
    updateDialog(G, dt, dialogAdvance);
  }

  // Enter / exit car.
  if (input.pressed('e')) {
    if (p.inCar) {
      const wasCar = p.inCar;
      exitCar(p, G.world);
      wasCar.parked = true; // a car left standing stays put
      G.audio.blip(330, 0.06);
    } else {
      const car = nearestEnterableCar(p, G.cars);
      if (car) {
        const wasTaxi = car.isTaxi;
        enterCar(p, car);
        G.audio.blip(520, 0.08);
        if (!wasTaxi) commitCrime(G, 'stealCar');
        if (wasTaxi) G.audio.chime(true);
      }
    }
    input.consume('e');
  }

  // Movement.
  if (p.inCar) {
    const car = p.inCar;
    if (G.autoDrive) {
      drivePlayerCar(car, 0, 1, false, dt);
    } else {
      drivePlayerCar(car, ax.x, -ax.y, input.down(' '), dt);
    }
    p.x = car.x; p.y = car.y;
    p.angle = car.angle;
    // Hitting pedestrians while driving is a crime.
    const hit = checkPedHitByCar(G.peds, car);
    if (hit) {
      commitCrime(G, 'hitPed');
      G.audio.thud();
      scarePeds(G.peds, car.x, car.y, 220);
      G.sparks.push(...makeSparks(hit.x, hit.y, '#a01828', 8));
      car.speed *= 0.7;
    }
  } else {
    stepPlayerOnFoot(p, G.world, ax.x, ax.y, dt);
    aimAt(p, G.cam, input.mouseX, input.mouseY);
    // Shooting (on foot only).
    if (input.mouseDown && p.shotCooldown <= 0) {
      G.bullets.push(makeBullet(p.x, p.y, p.aim, 'player'));
      p.shotCooldown = 0.22;
      G.shotsFired++;
      G.audio.shot();
      commitCrime(G, 'shoot');
      scarePeds(G.peds, p.x, p.y, 260);
    }
  }

  // Traffic + collisions (parked cars never move under traffic AI).
  for (const car of G.cars) {
    if (!car.isPlayer && !car.isCop && !car.parked) stepTrafficCar(car, G.cars, G.rng, dt);
    if (car.spark > 0) car.spark -= dt;
  }
  resolveCarCollisions(G.cars, (rel) => {
    if (rel > 260) commitCrime(G, 'crash');
    G.audio.thud();
  });
  collideCarsWithWorld(G.world, G.cars);

  // Pedestrians.
  stepPeds(G.peds, G.rng, dt, null);
  if (G.peds.length < 10 && G.rng.chance(dt * 0.2)) {
    const spot = randomRoadPoint(G.rng, p.x, p.y, 800);
    G.peds.push(...spawnPeds(G.rng, 1, spot.x, spot.y));
  }

  // Wanted decay + police spawns.
  decayWanted(G, dt);
  const wantCars = wantedCopCarCount(G.wanted);
  while (G.copCars.length < wantCars) {
    G.copCars.push(spawnCopCar(G.rng, p.x, p.y));
  }
  while (G.copCars.length > wantCars) G.copCars.pop();
  const wantCops = wantedFootCopCount(G.wanted);
  // In a staged screenshot scene the police are set dressing, not a game over:
  // no foot-cop spawns and no busted/wasted transitions while shot mode is on.
  if (!G.shotMode) {
    while (G.footCops.length < wantCops) {
      const spot = randomRoadPoint(G.rng, p.x, p.y, 500);
      G.footCops.push(makeFootCop(G.rng, spot.x, spot.y));
    }
    while (G.footCops.length > wantCops) G.footCops.pop();
  }

  const playerPos = { x: p.inCar ? p.inCar.x : p.x, y: p.inCar ? p.inCar.y : p.y };
  for (const cop of G.copCars) stepCopCar(cop, playerPos, G.rng, dt);
  for (const cop of G.footCops) stepFootCop(cop, playerPos, dt);
  resolveCarCollisions(G.copCars, null);
  collideCarsWithWorld(G.world, G.copCars);

  // Busted: a foot cop touches the player on foot, or a stopped player car is
  // pinned by a cop car. (Never in a staged screenshot scene.)
  if (!p.inCar && G.wanted >= 1 && !G.shotMode) {
    for (const cop of G.footCops) {
      if (dist(cop.x, cop.y, p.x, p.y) < 22) {
        G.state = 'busted';
        G.audio.chime(false);
        return;
      }
    }
  }
  if (p.inCar && G.wanted >= 2 && Math.abs(p.inCar.speed) < 30 && !G.shotMode) {
    let pinned = false;
    for (const cop of G.copCars) {
      if (dist(cop.x, cop.y, p.inCar.x, p.inCar.y) < 46) { pinned = true; break; }
    }
    G.bustTimer = pinned ? G.bustTimer + dt : 0;
    if (G.bustTimer > 2) {
      G.state = 'busted';
      G.audio.chime(false);
      return;
    }
  } else {
    G.bustTimer = 0;
  }

  // Enemies.
  for (const e of G.enemies) stepGang(e, playerPos, G.bullets, dt, G.rng);

  // Bullets.
  stepBullets(G.bullets, dt, G.world);
  // Player bullets vs enemies and foot cops.
  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e = G.enemies[i];
    if (bulletHits(G.bullets, e.x, e.y, 14, 'player')) {
      e.health -= 25;
      G.sparks.push(...makeSparks(e.x, e.y, '#ff5a5a', 6));
      if (e.health <= 0) {
        G.enemies.splice(i, 1);
        G.kills++;
        G.player.money += 10;
        commitCrime(G, 'killGang');
        G.audio.thud();
      }
    }
  }
  for (let i = G.footCops.length - 1; i >= 0; i--) {
    const c = G.footCops[i];
    if (bulletHits(G.bullets, c.x, c.y, 14, 'player')) {
      c.health -= 25;
      G.sparks.push(...makeSparks(c.x, c.y, '#5a8cff', 6));
      if (c.health <= 0) {
        G.footCops.splice(i, 1);
        G.kills++;
        commitCrime(G, 'killCop');
        G.audio.thud();
      }
    }
  }
  // Enemy bullets vs the player.
  if (!p.inCar && bulletHits(G.bullets, p.x, p.y, 13, 'enemy')) {
    p.health -= 8;
    G.sparks.push(...makeSparks(p.x, p.y, '#ff5a5a', 6));
    G.audio.thud();
    if (p.health <= 0 && !G.shotMode) {
      p.health = 0;
      G.state = 'wasted';
      G.audio.chime(false);
      return;
    }
    if (p.health <= 0) p.health = 1; // a staged scene never ends wasted
  }

  stepSparks(G.sparks, dt);

  // Pickups + money popups.
  const gained = collectPickups(p, G.pickups);
  if (gained > 0) {
    p.money += gained;
    G.moneyPopups.push({ x: p.x, y: p.y - 30, text: '+$' + gained, t: 0, life: 1.4 });
    G.audio.chime(true);
  }
  for (let i = G.moneyPopups.length - 1; i >= 0; i--) {
    const pop = G.moneyPopups[i];
    pop.t += dt;
    pop.life -= dt;
    if (pop.life <= 0) G.moneyPopups.splice(i, 1);
  }
  for (const pk of G.pickups) pk.bob = (pk.bob || 0) + dt * 3;

  // Missions.
  updateMission(G, dt);
  G.marker = missionMarker(G);

  // Enter-car hint.
  G.enterHint = !p.inCar && !!nearestEnterableCar(p, G.cars);

  // Camera follows the player (or the car).
  const cx = playerPos.x - VIEW_W / 2;
  const cy = playerPos.y - VIEW_H / 2;
  G.cam.x = clamp(cx, 0, WORLD - VIEW_W);
  G.cam.y = clamp(cy, 0, WORLD - VIEW_H);

  // Audio: engine + sirens.
  const speed = p.inCar ? Math.abs(p.inCar.speed) : 0;
  const sirenNear = G.copCars.some((c) => dist(c.x, c.y, playerPos.x, playerPos.y) < 520);
  G.audio.update(speed, sirenNear);

  // Keys: pause, quick save, mute.
  if (input.pressed('Escape')) { G.state = 'pause'; input.consume('Escape'); }
  if (input.pressed('p')) { saveGame(); G.audio.chime(true); input.consume('p'); }
  if (input.pressed('m')) {
    G.audio.setMuted(!G.audio.muted);
    input.consume('m');
  }
}

function render() {
  const p = G.player;
  if (G.state === 'title') { drawTitle(ctx, G, !!loadSave()); return; }
  if (G.state === 'howto') { drawHowTo(ctx); return; }
  if (G.state === 'pause') {
    renderWorld();
    drawPause(ctx, G);
    return;
  }
  if (G.state === 'busted') { drawBusted(ctx, G); return; }
  if (G.state === 'wasted') { drawWasted(ctx, G); return; }
  if (G.state === 'complete') {
    renderWorld();
    drawComplete(ctx, G);
    return;
  }
  renderWorld();
  drawHud(ctx, G);
}

function renderWorld() {
  const cam = G.cam;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  // Everything draws in screen space; each draw call subtracts the camera.
  drawGround(ctx, cam, G.world, G.clock);
  drawRoads(ctx, cam);
  drawBlocks(ctx, cam, G.world);
  drawPickups(ctx, cam, G.pickups);
  for (const car of G.cars) drawCar(ctx, cam, car);
  for (const car of G.copCars) drawCar(ctx, cam, car);
  for (const ped of G.peds) drawPerson(ctx, cam, ped);
  for (const cop of G.footCops) drawPerson(ctx, cam, { ...cop, color: '#2b4fd9', walking: true, walkPhase: G.time * 8 }, { label: 'PD' });
  for (const e of G.enemies) drawPerson(ctx, cam, { ...e, walking: true, walkPhase: G.time * 8 }, { health: e.health, label: 'GANG' });
  const p = G.player;
  if (!p.inCar) {
    drawPerson(ctx, cam, { ...p, color: '#ffd23d', walking: p.walking, walkPhase: G.time * 10 }, { aiming: true, aim: p.aim, label: 'DANNY' });
  }
  drawBullets(ctx, cam, G.bullets);
  drawSparks(ctx, cam, G.sparks);
  drawMarker(ctx, cam, G.marker, '#ffd23d', G.time);
}

// ---- the frame -----------------------------------------------------------

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (G.state === 'title') {
    if (input.pressed('Enter')) { startNewGame(); input.consume('Enter'); }
    else if (input.pressed('h')) { G.state = 'howto'; input.consume('h'); }
    else if (input.pressed('c') && loadSave()) {
      startNewGame();
      applySave(loadSave());
      G.state = 'play';
      input.consume('c');
    }
  } else if (G.state === 'howto') {
    if (input.pressed('Escape')) { G.state = 'title'; input.consume('Escape'); }
  } else if (G.state === 'pause') {
    if (input.pressed('Escape')) { G.state = 'play'; input.consume('Escape'); }
    else if (input.pressed('p')) { saveGame(); G.audio.chime(true); input.consume('p'); }
    else if (input.pressed('r')) {
      startMission(G, Math.min(G.mission.index, 4));
      G.state = 'play';
      input.consume('r');
    } else if (input.pressed('q')) { G.state = 'title'; input.consume('q'); }
  } else if (G.state === 'busted' || G.state === 'wasted') {
    if (input.pressed('Enter')) { respawn(G.state); input.consume('Enter'); }
  } else if (G.state === 'complete') {
    if (input.pressed('Enter')) { G.state = 'play'; input.consume('Enter'); }
    else updatePlay(dt);
  } else if (G.state === 'play') {
    updatePlay(dt);
  }

  render();
  G.frames++;
  if (G.shotMode && G.frames >= 2) window.__shotReady = true;
  input.endFrame();
  requestAnimationFrame(frame);
}

// ---- boot ----------------------------------------------------------------

const params = readShotParams();
if (params.seed) G = newGameState(params.seed);
if (params.shot) {
  G.shotMode = params.shot;
  setupShot(G, params.shot);
}

window.__dbg = () => {
  const p = G.player;
  return {
    state: G.state,
    x: Math.round(p.inCar ? p.inCar.x : p.x),
    y: Math.round(p.inCar ? p.inCar.y : p.y),
    inCar: !!p.inCar,
    isTaxi: !!(p.inCar && p.inCar.isTaxi),
    speed: p.inCar ? Math.round(Math.abs(p.inCar.speed)) : 0,
    mph: p.inCar ? Math.round(carSpeedMph(p.inCar)) : 0,
    health: Math.round(p.health),
    money: Math.round(p.money),
    wanted: G.wanted,
    mission: G.mission.index,
    missionStage: G.mission.stage,
    objective: G.mission.objective,
    cars: G.cars.length,
    copCars: G.copCars.length,
    peds: G.peds.length,
    enemies: G.enemies.length,
    shotsFired: G.shotsFired,
    kills: G.kills,
    clock: Math.round(G.clock),
  };
};
window.__shotReady = false;

requestAnimationFrame(frame);
