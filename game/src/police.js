// Solmar Bay — the wanted level and the police who answer it.
// Stars rise with crime and decay with quiet; police cars chase on
// the roads and ram up close, foot cops run the player down and, if
// they hold on long enough, the player is busted.

import { GRID, TUNE, PALETTE } from './config.js';
import { range, int, pick, clamp, wrapAngle, turnToward, dist } from './random.js';
import { roadCenter, nearestRoadCenter, resolveCircle } from './world.js';
import { makeCar, headingFor } from './vehicles.js';

// Wanted points (0..100) to stars (0..5).
export function starsFor(wanted) {
  return Math.min(TUNE.maxStars, Math.floor(wanted / 20));
}

// Quiet time decays the heat; a fresh crime resets the clock.
export function updateWanted(G, dt) {
  G.lastCrime += dt;
  if (G.lastCrime > TUNE.wantedGrace && G.wanted > 0) {
    G.wanted = Math.max(0, G.wanted - TUNE.wantedDecay * dt);
  }
  G.stars = starsFor(G.wanted);
}

// How many police cars the current heat calls for.
export function policeTarget(G) {
  if (G.stars <= 0) return 0;
  if (G.stars === 1) return 1;
  if (G.stars === 2) return 2;
  if (G.stars === 3) return 3;
  return 4;
}

export function makeCop(x, y) {
  return {
    x,
    y,
    angle: 0,
    speed: TUNE.copSpeed,
    holdTimer: 0,
    r: 12,
  };
}

// Spawn and steer the police. Called every frame while playing.
export function updatePolice(G, dt) {
  const want = policeTarget(G);
  const policeCars = G.cars.filter((c) => c.state === 'police');

  // Spawn more cars when the heat rises, from roads near the player.
  G.policeTimer -= dt;
  if (policeCars.length < want && G.policeTimer <= 0) {
    G.policeTimer = 1.4;
    const angle = G.rng() * Math.PI * 2;
    const sx = G.player.x + Math.cos(angle) * 620;
    const sy = G.player.y + Math.sin(angle) * 620;
    const car = makeCar(nearestRoadCenter(sx), nearestRoadCenter(sy), 'police', PALETTE.police);
    car.state = 'police';
    car.speed = 200;
    car.maxSpeed = 470;
    G.cars.push(car);
  }
  // Stand the police down when the heat is gone.
  if (want === 0) {
    for (let i = G.cars.length - 1; i >= 0; i -= 1) {
      if (G.cars[i].state === 'police') G.cars.splice(i, 1);
    }
    G.cops = [];
    return;
  }

  for (const car of policeCars) {
    updatePoliceCar(G, car, dt);
  }

  // Foot cops join the chase from two stars up.
  G.copTimer -= dt;
  const wantCops = G.stars >= 2 ? Math.min(3, G.stars - 1) : 0;
  if (G.cops.length < wantCops && G.copTimer <= 0) {
    G.copTimer = 2.2;
    const angle = G.rng() * Math.PI * 2;
    G.cops.push(makeCop(
      G.player.x + Math.cos(angle) * 320,
      G.player.y + Math.sin(angle) * 320,
    ));
  }
  updateCops(G, dt);
}

// One police car: road chase from far away, ram chase up close.
export function updatePoliceCar(G, car, dt) {
  const d = dist(car.x, car.y, G.player.x, G.player.y);
  const targetAngle = Math.atan2(G.player.y - car.y, G.player.x - car.x);

  if (d < 260) {
    // Ram chase: steer straight at the player and floor it.
    updateRamChase(G, car, targetAngle, dt);
  } else {
    // Road chase: stay on the grid, closing the gap axis by axis.
    updateRoadChase(G, car, targetAngle, dt);
  }

  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  const fixed = resolveCircle(G.world, car.x, car.y, car.r);
  car.x = fixed.x;
  car.y = fixed.y;

  // Ramming the player's car: shove it, shake the camera, add heat.
  if (G.playerCar && dist(car.x, car.y, G.playerCar.x, G.playerCar.y) < car.r + G.playerCar.r + 2) {
    const push = 260;
    const nx = (G.playerCar.x - car.x) / Math.max(1, d);
    const ny = (G.playerCar.y - car.y) / Math.max(1, d);
    G.playerCar.x += nx * push * dt;
    G.playerCar.y += ny * push * dt;
    G.playerCar.speed *= 0.82;
    G.shake = Math.max(G.shake, 6);
    G.audio.thud();
  }
  // Ramming the player on foot: heavy damage, and a chance of busted.
  if (!G.playerCar && d < 30) {
    G.player.health -= 26 * dt;
    G.shake = Math.max(G.shake, 5);
  }
}

export function updateRamChase(G, car, targetAngle, dt) {
  car.angle = turnToward(car.angle, targetAngle, 3.4 * dt);
  car.speed += clamp(430 - car.speed, -320 * dt, 300 * dt);
}

export function updateRoadChase(G, car, targetAngle, dt) {
  // Pick the axis with the bigger gap and drive along it.
  const dx = G.player.x - car.x;
  const dy = G.player.y - car.y;
  const axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
  const dir = axis === 'h' ? Math.sign(dx) || 1 : Math.sign(dy) || 1;
  const want = headingFor(axis, dir);
  car.angle = turnToward(car.angle, want, 3.0 * dt);
  car.speed += clamp(380 - car.speed, -320 * dt, 260 * dt);
  // Snap onto the lane so the car reads as driving on the road.
  if (axis === 'h') {
    const lane = nearestRoadCenter(car.y);
    car.y += clamp(lane - car.y, -120 * dt, 120 * dt);
  } else {
    const lane = nearestRoadCenter(car.x);
    car.x += clamp(lane - car.x, -120 * dt, 120 * dt);
  }
}

// Foot cops run at the player; holding on for a moment busts them.
export function updateCops(G, dt) {
  for (let i = G.cops.length - 1; i >= 0; i -= 1) {
    const cop = G.cops[i];
    const d = dist(cop.x, cop.y, G.player.x, G.player.y);
    if (d > 900) {
      G.cops.splice(i, 1);
      continue;
    }
    cop.angle = Math.atan2(G.player.y - cop.y, G.player.x - cop.x);
    const speed = d < 40 ? TUNE.copSpeed * 0.55 : TUNE.copSpeed;
    cop.x += Math.cos(cop.angle) * speed * dt;
    cop.y += Math.sin(cop.angle) * speed * dt;
    const fixed = resolveCircle(G.world, cop.x, cop.y, cop.r);
    cop.x = fixed.x;
    cop.y = fixed.y;
    if (d < 30) {
      cop.holdTimer += dt;
      if (cop.holdTimer > 1.2 && !G.busted) {
        G.busted = true;
      }
    } else {
      cop.holdTimer = 0;
    }
  }
}

// The siren wails when any police car is close.
export function sirenNear(G) {
  for (const car of G.cars) {
    if (car.state === 'police' && dist(car.x, car.y, G.player.x, G.player.y) < 650) return true;
  }
  return false;
}
