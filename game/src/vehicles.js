// Cars: player driving physics, traffic AI and parked cars.
// Traffic drives the road grid in the right lane, turns at intersections
// and slows for the car ahead. Police cars reuse this body in police.js.

import { ROAD, N, BLOCK, TUNE, streetPos, blockRect } from './config.js';
import { hitBuilding, resolveCircle, nearestIntersection, drivable } from './world.js';
import { pick, range } from './random.js';

let nextId = 1;

const TRAFFIC_COLORS = ['#c0392b', '#2980b9', '#f1c40f', '#ecf0f1', '#2c3e50', '#e67e22', '#9b59b6', '#1abc9c', '#7f8c8d', '#16a085'];

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
// bleeds speed off, and buildings stop the car with a thud.
export function driveCar(G, car, dt, throttle, steer) {
  const maxF = TUNE.carMaxSpeed;
  const maxR = TUNE.carMaxReverse;
  if (throttle > 0) {
    car.speed += TUNE.carAccel * throttle * dt;
  } else if (throttle < 0) {
    // Brake first, then reverse once nearly stopped.
    if (car.speed > 5) car.speed -= TUNE.carBrake * dt;
    else car.speed += TUNE.carReverseAccel * throttle * dt;
  } else {
    car.speed -= Math.sign(car.speed) * TUNE.carDrag * 220 * dt;
    if (Math.abs(car.speed) < 8) car.speed = 0;
  }
  car.speed -= car.speed * TUNE.carDrag * dt * 0.35;
  car.speed = Math.max(-maxR, Math.min(maxF, car.speed));
  const grip = Math.max(0, Math.min(1, Math.abs(car.speed) / 160));
  car.angle += steer * TUNE.carSteer * grip * Math.sign(car.speed || 1) * dt;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  // Two-circle body (front and back) against buildings.
  const fx = car.x + Math.cos(car.angle) * 11;
  const fy = car.y + Math.sin(car.angle) * 11;
  const bx = car.x - Math.cos(car.angle) * 11;
  const by = car.y - Math.sin(car.angle) * 11;
  const front = { x: fx, y: fy };
  const back = { x: bx, y: by };
  const hitF = resolveCircle(G.world, front, 12);
  const hitB = resolveCircle(G.world, back, 12);
  if (hitF || hitB) {
    car.x = (front.x + back.x) / 2;
    car.y = (front.y + back.y) / 2;
    if (Math.abs(car.speed) > 180) G.shake = Math.min(9, Math.abs(car.speed) / 60);
    car.speed *= 0.45;
  }
}

// ---- Traffic ------------------------------------------------------------

// Right-hand traffic: eastbound sits south of the centre line, and so on.
function laneOffset(axis, dir, center) {
  if (axis === 'h') return center + (dir > 0 ? 14 : -14);
  return center + (dir > 0 ? -14 : 14);
}

function headingToAxisDir(angle) {
  const a = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  if (Math.abs(a) < 0.1 || Math.abs(a - Math.PI * 2) < 0.1) return { axis: 'h', dir: 1 };
  if (Math.abs(a - Math.PI / 2) < 0.1) return { axis: 'v', dir: 1 };
  if (Math.abs(a - Math.PI) < 0.1) return { axis: 'h', dir: -1 };
  return { axis: 'v', dir: -1 };
}

export function spawnTrafficCar(G, near) {
  const rng = G.rng;
  const horiz = rng() < 0.5;
  const si = Math.floor(rng() * (N + 1));
  const sj = Math.floor(rng() * (N + 1));
  const dir = rng() < 0.5 ? 1 : -1;
  let x, y, axis;
  if (horiz) {
    axis = 'h';
    y = laneOffset('h', dir, streetPos(sj));
    x = near.x + (rng() < 0.5 ? -1 : 1) * range(rng, 380, 640);
  } else {
    axis = 'v';
    x = laneOffset('v', dir, streetPos(si));
    y = near.y + (rng() < 0.5 ? -1 : 1) * range(rng, 380, 640);
  }
  const angle = axis === 'h' ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
  const car = makeCar(x, y, angle, pick(rng, TRAFFIC_COLORS), rng() < 0.06 ? 'taxi' : 'traffic');
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
      if (G.rng() < 0.34) {
        // Turn left or right at the intersection: rotate the heading by
        // 90 degrees (clockwise is + in canvas coordinates, y down).
        const turn = G.rng() < 0.5 ? 1 : -1;
        car.angle += turn * Math.PI / 2;
        const next = headingToAxisDir(car.angle);
        ai.axis = next.axis;
        ai.dir = next.dir;
      }
      // Snap onto the new lane.
      if (ai.axis === 'h') {
        car.y = laneOffset('h', ai.dir, inter.y);
        car.angle = ai.dir > 0 ? 0 : Math.PI;
      } else {
        car.x = laneOffset('v', ai.dir, inter.x);
        car.angle = ai.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
    }
    // Ease toward the lane centre and slow for traffic ahead.
    const jitter = 0.85 + 0.3 * (((car.id * 37) % 10) / 10);
    const targetSpeed = carAhead(G, car, 62) ? 0 : TUNE.trafficSpeed * jitter;
    car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 2.2);
    const centre = nearestIntersection(car.x, car.y);
    if (ai.axis === 'h') {
      car.y += (laneOffset('h', ai.dir, centre.y) - car.y) * Math.min(1, dt * 3);
      car.x += ai.dir * car.speed * dt;
    } else {
      car.x += (laneOffset('v', ai.dir, centre.x) - car.x) * Math.min(1, dt * 3);
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
    if (c.kind === 'player' || c.kind === 'police') return true;
    return Math.hypot(c.x - p.x, c.y - p.y) < 900;
  });
  const traffic = G.cars.filter((c) => c.kind === 'traffic' || c.kind === 'taxi');
  if (traffic.length < 9 && G.spawnTimer <= 0) {
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
        const avg = ((a.speed + b.speed) / 2) * 0.85;
        a.speed = avg;
        b.speed = avg;
      }
    }
  }
}

// Parked cars in lots and along curbs for the player to steal.
export function seedParkedCars(G) {
  const rng = G.rng;
  const colors = ['#c0392b', '#2980b9', '#f1c40f', '#2c3e50', '#e67e22', '#1abc9c'];
  for (const lot of G.world.lots) {
    const n = 2 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) {
      const x = lot.x + 30 + rng() * (BLOCK - 60);
      const y = lot.y + 30 + rng() * (BLOCK - 60);
      const car = makeCar(x, y, rng() < 0.5 ? 0 : Math.PI / 2, pick(rng, colors), 'parked');
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
