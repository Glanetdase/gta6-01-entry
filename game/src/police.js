// Wanted level and the police who answer it.
// Crimes add wanted points; stars come from thresholds. Police cars chase on
// the roads and ram; foot cops chase on foot and arrest. Lay low and the
// heat fades — or lose it by finishing a mission.

import { TUNE, POLICE_COLOR, N } from './config.js';
import { makeCar } from './vehicles.js';
import { nearestIntersection, resolveCircle } from './world.js';

export function starsFor(wanted) {
  let s = 0;
  for (const t of TUNE.starThresholds) if (wanted >= t) s++;
  return s;
}

export function addWanted(G, points, reason) {
  if (G.mission && G.mission.noWanted) return;
  G.wanted = Math.min(TUNE.wantedMax, G.wanted + points);
  G.lastCrime = 0;
  G.lastCrimeReason = reason;
}

function wrapAngle(diff) {
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

export function updateWanted(G, dt) {
  G.lastCrime += dt;
  const stars = starsFor(G.wanted);
  G.stars = stars;
  const policeNear = G.policeCars.some((c) => Math.hypot(c.x - G.player.x, c.y - G.player.y) < 520)
    || G.cops.some((c) => Math.hypot(c.x - G.player.x, c.y - G.player.y) < 420);
  if (G.lastCrime > 12 && !policeNear && G.wanted > 0) {
    G.wanted = Math.max(0, G.wanted - TUNE.wantedDecay * dt);
  }
  // Spawn police to match the heat.
  const wantCars = stars === 0 ? 0 : Math.min(6, 1 + stars);
  if (G.policeCars.length < wantCars && G.policeTimer <= 0) {
    spawnPoliceCar(G);
    G.policeTimer = 2.2;
  }
  G.policeTimer -= dt;
  const wantCops = stars === 0 ? 0 : Math.min(4, stars);
  if (G.cops.length < wantCops && G.copTimer <= 0) {
    spawnCop(G);
    G.copTimer = 3;
  }
  G.copTimer -= dt;
  // Despawn the heat when it is gone.
  if (stars === 0) {
    G.policeCars = G.policeCars.filter((c) => Math.hypot(c.x - G.player.x, c.y - G.player.y) < 700);
    G.cops = G.cops.filter((c) => Math.hypot(c.x - G.player.x, c.y - G.player.y) < 600);
  }
}

function spawnPoliceCar(G) {
  const p = G.player;
  const inter = nearestIntersection(
    p.x + (G.rng() < 0.5 ? -1 : 1) * 520,
    p.y + (G.rng() < 0.5 ? -1 : 1) * 520,
  );
  const car = makeCar(inter.x, inter.y, 0, POLICE_COLOR, 'police');
  car.speed = 200;
  car.ai = { mode: 'road' };
  G.cars.push(car);
  G.policeCars.push(car);
}

function spawnCop(G) {
  const p = G.player;
  const a = G.rng() * Math.PI * 2;
  G.cops.push({
    x: p.x + Math.cos(a) * 420,
    y: p.y + Math.sin(a) * 420,
    angle: 0, hp: 100, arrest: 0, punchTimer: 0, speed: TUNE.copFootSpeed,
  });
}

export function updatePolice(G, dt) {
  const p = G.player;
  for (const car of G.policeCars) {
    const dist = Math.hypot(p.x - car.x, p.y - car.y);
    const target = G.playerCar || p;
    if (dist < 300) car.ai.mode = 'ram';
    else if (dist > 520) car.ai.mode = 'road';
    if (car.ai.mode === 'ram') {
      updateRamChase(G, car, target, dt);
    } else {
      updateRoadChase(G, car, p, dt);
    }
  }
  // Foot cops: chase, punch, and arrest a player on foot who stays close.
  for (const cop of G.cops) {
    const d = Math.hypot(p.x - cop.x, p.y - cop.y);
    cop.angle = Math.atan2(p.y - cop.y, p.x - cop.x);
    if (!G.playerCar && d < 560) {
      cop.x += Math.cos(cop.angle) * cop.speed * dt;
      cop.y += Math.sin(cop.angle) * cop.speed * dt;
      resolveCircle(G.world, cop, 10);
    }
    cop.punchTimer -= dt;
    if (d < 30 && !G.playerCar) {
      cop.arrest += dt;
      if (cop.punchTimer <= 0) {
        cop.punchTimer = 0.8;
        G.player.health -= 6;
        G.shake = Math.max(G.shake, 4);
      }
      if (cop.arrest > 1.2) G.busted = true;
    } else {
      cop.arrest = Math.max(0, cop.arrest - dt * 2);
    }
  }
}

// Ram mode: steer straight at the player and push the speed up.
function updateRamChase(G, car, target, dt) {
  const want = Math.atan2(target.y - car.y, target.x - car.x);
  const diff = wrapAngle(want - car.angle);
  car.angle += Math.max(-2.6, Math.min(2.6, diff)) * dt * 2.2;
  car.speed += (TUNE.policeCarSpeed - car.speed) * Math.min(1, dt * 1.4);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  const front = { x: car.x + Math.cos(car.angle) * 11, y: car.y + Math.sin(car.angle) * 11 };
  if (resolveCircle(G.world, front, 12)) {
    car.x = front.x - Math.cos(car.angle) * 11;
    car.y = front.y - Math.sin(car.angle) * 11;
    car.speed *= 0.4;
  }
  // Ramming the player's car hurts; running down a player on foot hurts more.
  if (G.playerCar) {
    const d = Math.hypot(G.playerCar.x - car.x, G.playerCar.y - car.y);
    if (d < 34 && Math.abs(car.speed) > 200) {
      G.player.health -= 4 * dt * 10;
      G.player.hurtTimer = 8;
      G.shake = Math.max(G.shake, 5);
      car.speed *= 0.5;
    }
  } else {
    const d = Math.hypot(G.player.x - car.x, G.player.y - car.y);
    if (d < 30 && Math.abs(car.speed) > 150) {
      G.player.health -= 12 * dt * 10;
      G.player.hurtTimer = 8;
      G.shake = Math.max(G.shake, 6);
      car.speed *= 0.5;
    }
  }
}

// Road mode: drive the grid toward the player's intersection.
function updateRoadChase(G, car, p, dt) {
  const inter = nearestIntersection(p.x, p.y);
  const dx = inter.x - car.x;
  const dy = inter.y - car.y;
  const want = Math.abs(dx) > Math.abs(dy)
    ? (dx > 0 ? 0 : Math.PI)
    : (dy > 0 ? Math.PI / 2 : -Math.PI / 2);
  const diff = wrapAngle(want - car.angle);
  car.angle += Math.max(-2.2, Math.min(2.2, diff)) * dt * 2;
  car.speed += (TUNE.policeCarSpeed * 0.8 - car.speed) * Math.min(1, dt);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  const pos = { x: car.x, y: car.y };
  resolveCircle(G.world, pos, 12);
  car.x = pos.x;
  car.y = pos.y;
}
