// Cars: player driving physics, traffic AI and parked cars.
// Traffic drives the road grid in the right lane, turns at intersections and
// slows for the car ahead. Police cars reuse the same body in police.js.

import { ROAD, N, BLOCK, TUNE, streetPos, blockRect } from './config.js';
import { hitBuilding, resolveCircle, nearestIntersection, drivable } from './world.js';
import { pick, range } from './random.js';

let nextId = 1;

export function makeCar(x, y, angle, color, kind = 'traffic') {
  return {
    id: nextId++,
    x, y, angle, speed: 0,
    color, kind,
    driver: kind === 'traffic' || kind === 'taxi',
    w: 36, h: 19,
    ai: null,
    stuck: 0,
  };
}

// Arcade driving: throttle accelerates, steering scales with speed, drag
// bleeds speed, and buildings stop the car with a thud.
export function driveCar(G, car, dt, throttle, steer) {
  const maxF = TUNE.carMaxSpeed;
  const maxR = TUNE.carMaxReverse;
  if (throttle > 0) car.speed += TUNE.carAccel * throttle * dt;
  else if (throttle < 0) {
    if (car.speed > 5) car.speed -= TUNE.carBrake * dt; // brake first
    else car.speed += TUNE.carReverseAccel * throttle * dt;
  } else {
    car.speed -= Math.sign(car.speed) * TUNE.carDrag * 220 * dt;
    if (Math.abs(car.speed) < 8) car.speed = 0;
  }
  car.speed -= car.speed * TUNE.carDrag * dt * 0.35;
  car.speed = Math.max(-maxR, Math.min(maxF, car.speed));
  const steerFactor = Math.max(0, Math.min(1, Math.abs(car.speed) / 160));
  car.angle += steer * TUNE.carSteer * steerFactor * Math.sign(car.speed || 1) * dt;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  car.x = nx;
  car.y = ny;
  // Two-circle body (front and back) against buildings.
  const fx = car.x + Math.cos(car.angle) * 11;
  const fy = car.y + Math.sin(car.angle) * 11;
  const bx = car.x - Math.cos(car.angle) * 11;
  const by = car.y - Math.sin(car.angle) * 11;
  const fp = { x: fx, y: fy };
  const bp = { x: bx, y: by };
  const hitF = resolveCircle(G.world, fp, 12);
  const hitB = resolveCircle(G.world, bp, 12);
  if (hitF || hitB) {
    car.x = (fp.x + bp.x) / 2;
    car.y = (fp.y + bp.y) / 2;
    if (Math.abs(car.speed) > 180) G.shake = Math.min(9, Math.abs(car.speed) / 60);
    car.speed *= 0.45;
  }
}

// ---- Traffic ------------------------------------------------------------

function laneFor(axis, dir, center) {
  // Right-hand traffic: eastbound sits south of the centre line, and so on.
  if (axis === 'h') return center + (dir > 0 ? 14 : -14);
  return center + (dir > 0 ? -14 : 14);
}

export function spawnTrafficCar(G, near) {
  const rng = G.rng;
  const horiz = rng() < 0.5;
  const si = Math.floor(rng() * (N + 1));
  const sj = Math.floor(rng() * (N + 1));
  let x;
  let y;
  let axis;
  let dir;
  if (horiz) {
    axis = 'h';
    dir = rng() < 0.5 ? 1 : -1;
    y = laneFor('h', dir, streetPos(sj));
    x = near.x + (rng() < 0.5 ? -1 : 1) * range(rng, 380, 640);
  } else {
    axis = 'v';
    dir = rng() < 0.5 ? 1 : -1;
    x = laneFor('v', dir, streetPos(si));
    y = near.y + (rng() < 0.5 ? -1 : 1) * range(rng, 380, 640);
  }
  const color = pick(rng, ['#c0392b', '#2980b9', '#f1c40f', '#ecf0f1', '#2c3e50', '#e67e22', '#9b59b6', '#1abc9c', '#7f8c8d', '#16a085']);
  const car = makeCar(x, y, axis === 'h' ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2), color, rng() < 0.06 ? 'taxi' : 'traffic');
  if (car.kind === 'taxi') car.color = '#f7c948';
  car.speed = range(rng, TUNE.trafficSpeed * 0.8, TUNE.trafficSpeed * 1.25);
  car.ai = { axis, dir, turnCooldown: 0.5, wantTurn: false };
  return car;
}

function carAhead(G, car, dist) {
  const dx = Math.cos(car.angle);
  const dy = Math.sin(car.angle);
  for (const o of G.cars) {
    if (o === car) continue;
    const rx = o.x - car.x;
    const ry = o.y - car.y;
    const along = rx * dx + ry * dy;
    if (along > 0 && along < dist && Math.abs(rx * dy - ry * dx) < 22) return true;
  }
  return false;
}

export function updateTraffic(G, dt) {
  for (const car of G.cars) {
    if (car.kind !== 'traffic' && car.kind !== 'taxi') continue;
    const ai = car.ai;
    if (!ai) continue;
    ai.turnCooldown -= dt;
    const inter = nearestIntersection(car.x, car.y);
    const distToInter = Math.hypot(car.x - inter.x, car.y - inter.y);
    if (ai.turnCooldown <= 0 && distToInter < 30) {
      ai.turnCooldown = 1.2;
      const roll = G.rng();
      if (roll < 0.34) {
        // Turn left or right at the intersection: rotate the heading by
        // 90 degrees (clockwise is + in canvas coordinates, y down) and
        // derive the new axis and direction from the new heading.
        const turn = G.rng() < 0.5 ? 1 : -1;
        car.angle += turn * Math.PI / 2;
        const a = ((car.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        if (Math.abs(a) < 0.1 || Math.abs(a - Math.PI * 2) < 0.1) { ai.axis = 'h'; ai.dir = 1; }
        else if (Math.abs(a - Math.PI / 2) < 0.1) { ai.axis = 'v'; ai.dir = 1; }
        else if (Math.abs(a - Math.PI) < 0.1) { ai.axis = 'h'; ai.dir = -1; }
        else { ai.axis = 'v'; ai.dir = -1; }
      }
      // Snap onto the new lane.
      if (ai.axis === 'h') {
        car.y = laneFor('h', ai.dir, inter.y);
        car.angle = ai.dir > 0 ? 0 : Math.PI;
      } else {
        car.x = laneFor('v', ai.dir, inter.x);
        car.angle = ai.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
    }
    // Ease toward the lane centre and slow for traffic ahead.
    const targetSpeed = carAhead(G, car, 62) ? 0 : TUNE.trafficSpeed * (0.85 + 0.3 * ((car.id * 37) % 10) / 10);
    car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 2.2);
    const laneCenter = nearestIntersection(car.x, car.y);
    if (ai.axis === 'h') {
      car.y += (laneFor('h', ai.dir, laneCenter.y) - car.y) * Math.min(1, dt * 3);
      car.x += ai.dir * car.speed * dt;
    } else {
      car.x += (laneFor('v', ai.dir, laneCenter.x) - car.x) * Math.min(1, dt * 3);
      car.y += ai.dir * car.speed * dt;
    }
    // Keep traffic on the road: if it drifted into a block, nudge it back.
    if (!drivable(G.world, car.x, car.y)) {
      const inter2 = nearestIntersection(car.x, car.y);
      car.x = inter2.x;
      car.y = inter2.y;
    }
  }
}

// Keep a handful of traffic cars near the player; park a few cars in lots.
export function maintainTraffic(G, dt) {
  const p = G.player;
  G.cars = G.cars.filter((c) => {
    if (c.kind === 'player') return true;
    if (c.kind === 'police') return true;
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    return d < 900;
  });
  const traffic = G.cars.filter((c) => c.kind === 'traffic' || c.kind === 'taxi');
  const want = 9;
  if (traffic.length < want && G.spawnTimer <= 0) {
    G.cars.push(spawnTrafficCar(G, p));
    G.spawnTimer = 0.7;
  }
  G.spawnTimer -= dt;
}

// Push overlapping cars apart (circle test on centres).
export function collideCars(G) {
  const cars = G.cars;
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i];
      const b = cars[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = 30;
      if (d > 0.01 && d < min) {
        const push = (min - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        const avg = (a.speed + b.speed) / 2;
        a.speed = avg * 0.85;
        b.speed = avg * 0.85;
      }
    }
  }
}

// Parked cars in lots and along curbs for the player to steal.
export function seedParkedCars(G) {
  const rng = G.rng;
  for (const lot of G.world.lots) {
    const n = 2 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) {
      const x = lot.x + 30 + rng() * (BLOCK - 60);
      const y = lot.y + 30 + rng() * (BLOCK - 60);
      const car = makeCar(x, y, rng() < 0.5 ? 0 : Math.PI / 2, pick(rng, ['#c0392b', '#2980b9', '#f1c40f', '#2c3e50', '#e67e22', '#1abc9c']), 'parked');
      car.driver = false;
      G.cars.push(car);
    }
  }
  // A sports car by the safehouse, and a taxi near the hospital.
  const sh = blockRect(1, 8);
  const sports = makeCar(sh.x + 40, sh.y + BLOCK + 26, 0, '#d7263d', 'parked');
  sports.driver = false;
  G.cars.push(sports);
}
