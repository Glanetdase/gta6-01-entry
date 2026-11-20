// The player on foot and behind the wheel: movement, entering and stealing
// cars, punching and shooting, and the health that ties it together.

import { TUNE } from './config.js';
import { resolveCircle, hitBuilding } from './world.js';
import { driveCar } from './vehicles.js';
import { addWanted } from './police.js';
import { fireBullet, playerPunch } from './combat.js';
import { carHitsPed } from './pedestrians.js';

export function makePlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2,
    health: TUNE.playerHealth,
    money: TUNE.startMoney,
    punchTimer: 0,
    shootTimer: 0,
    hurtTimer: 0,
    aimAngle: -Math.PI / 2,
  };
}

export function updatePlayer(G, dt) {
  const p = G.player;
  const input = G.input;
  p.punchTimer -= dt;
  p.shootTimer -= dt;
  p.hurtTimer -= dt;

  // Slow health recovery when the heat is off and nobody is shooting.
  if (G.stars === 0 && p.hurtTimer <= 0 && p.health > 0 && p.health < 100) {
    p.health = Math.min(100, p.health + 4 * dt);
  }

  if (G.playerCar) {
    updateDriving(G, dt);
    return;
  }

  // On foot: WASD, Shift to run.
  const mv = input.moveVector();
  const running = input.down('shift');
  const speed = running ? TUNE.runSpeed : TUNE.walkSpeed;
  p.x += mv.x * speed * dt;
  p.y += mv.y * speed * dt;
  if (mv.x !== 0 || mv.y !== 0) {
    // Face where the mouse aims when the player is fighting, else the run.
    if (G.aiming) p.angle = p.aimAngle;
    else p.angle = Math.atan2(mv.y, mv.x);
  } else if (G.aiming) {
    p.angle = p.aimAngle;
  }
  resolveCircle(G.world, p, TUNE.playerRadius);

  // Aim follows the mouse (screen space -> world space).
  const cam = G.camera;
  const wx = (input.mouse.x - G.viewW / 2) / cam.zoom + cam.x;
  const wy = (input.mouse.y - G.viewH / 2) / cam.zoom + cam.y;
  p.aimAngle = Math.atan2(wy - p.y, wx - p.x);
  G.aiming = input.mouse.down || input.mouse.clicked || G.time - G.lastAimMove < 1.2;

  // Shoot.
  if (input.mouse.down && p.shootTimer <= 0) {
    p.shootTimer = TUNE.shootCooldown;
    p.angle = p.aimAngle;
    fireBullet(G, p.x + Math.cos(p.angle) * 20, p.y + Math.sin(p.angle) * 20, p.angle, 'player');
    G.shake = Math.max(G.shake, 1.5);
  }
  // Punch.
  if ((input.wasPressed('f') || input.wasPressed(' ')) && p.punchTimer <= 0) {
    p.punchTimer = 0.35;
    playerPunch(G);
  }
  // Enter a car.
  if (input.wasPressed('e')) tryEnterCar(G);
}

function updateDriving(G, dt) {
  const p = G.player;
  const input = G.input;
  const car = G.playerCar;
  const mv = input.moveVector();
  const throttle = mv.y < 0 ? 1 : mv.y > 0 ? -1 : 0;
  const steer = mv.x;
  driveCar(G, car, dt, throttle, steer);
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  G.audio.engine(true, Math.abs(car.speed) / TUNE.carMaxSpeed);
  // Ploughing through pedestrians is a crime.
  const hit = carHitsPed(G, car);
  if (hit) {
    addWanted(G, TUNE.hitPed, 'hit a pedestrian');
    G.shake = Math.max(G.shake, 6);
    G.audio.noise(0.2, 0.25, 600);
    car.speed *= 0.7;
  }
  // Exit the car when it is slow enough.
  if (input.wasPressed('e') && Math.abs(car.speed) < 60) {
    exitCar(G);
  }
  // Punch from the car window? No — honk instead.
  if (input.wasPressed('f')) G.audio.blip(330, 0.12, 'square', 0.12);
}

function tryEnterCar(G) {
  const p = G.player;
  let best = null;
  let bestD = 56;
  for (const car of G.cars) {
    if (car.kind === 'police') continue;
    const d = Math.hypot(car.x - p.x, car.y - p.y);
    if (d < bestD) { best = car; bestD = d; }
  }
  if (!best) return;
  if (best.driver) {
    // Steal it: the driver bails out and runs.
    const a = Math.atan2(p.y - best.y, p.x - best.x);
    G.peds.push({
      x: best.x + Math.cos(a) * 26, y: best.y + Math.sin(a) * 26,
      angle: a, speed: 60, color: '#7ec850', state: 'flee', axis: 'h', dir: 1,
      fleeX: best.x, fleeY: best.y, dead: false, deadTimer: 0,
      taxiWait: false, turnCooldown: 0, stepPhase: 0,
    });
    best.driver = false;
    addWanted(G, TUNE.stealOccupied, 'stole a car');
    G.stoleCar = true;
    G.audio.blip(520, 0.1, 'sawtooth', 0.12);
  } else {
    // A parked car: only the law notices if a cop is watching.
    const copNear = G.cops.some((c) => Math.hypot(c.x - p.x, c.y - p.y) < 320)
      || G.policeCars.some((c) => Math.hypot(c.x - p.x, c.y - p.y) < 320);
    if (copNear) addWanted(G, TUNE.stealParked, 'stole a parked car');
  }
  best.kind = 'player';
  G.playerCar = best;
  G.audio.engine(true, 0);
  G.audio.blip(660, 0.08);
}

function exitCar(G) {
  const car = G.playerCar;
  const p = G.player;
  car.kind = 'parked';
  car.driver = false;
  car.speed = 0;
  const a = car.angle + Math.PI / 2;
  p.x = car.x + Math.cos(a) * 26;
  p.y = car.y + Math.sin(a) * 26;
  resolveCircle(G.world, p, TUNE.playerRadius);
  G.playerCar = null;
  G.audio.engine(false, 0);
}
