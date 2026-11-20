// Pedestrians: they stroll the sidewalks, wait for taxis, flee from danger,
// and remember when the player hurts them (that is what wanted stars are for).

import { ROAD, N, TUNE, streetPos } from './config.js';
import { nearestIntersection, resolveCircle, inWater } from './world.js';
import { pick, range } from './random.js';

const SHIRT = ['#d94f3d', '#3d7dd9', '#e8b93e', '#7ec850', '#c05fd9', '#e8e8e8', '#4a4a4a', '#e07a3f'];

export function makePed(G, x, y) {
  const horiz = G.rng() < 0.5;
  return {
    x, y,
    angle: G.rng() * Math.PI * 2,
    speed: range(G.rng, 42, 68),
    color: pick(G.rng, SHIRT),
    state: 'walk',
    axis: horiz ? 'h' : 'v',
    dir: G.rng() < 0.5 ? 1 : -1,
    fleeX: 0, fleeY: 0,
    dead: false, deadTimer: 0,
    taxiWait: false,
    turnCooldown: range(G.rng, 0.5, 2),
    stepPhase: G.rng() * Math.PI * 2,
  };
}

export function spawnPed(G, near) {
  const si = Math.floor(G.rng() * (N + 1));
  const sj = Math.floor(G.rng() * (N + 1));
  const side = G.rng() < 0.5 ? 1 : -1;
  let x;
  let y;
  if (G.rng() < 0.5) {
    // On a horizontal sidewalk.
    x = near.x + (G.rng() < 0.5 ? -1 : 1) * range(G.rng, 200, 560);
    y = streetPos(sj) + side * (ROAD / 2 + 10);
  } else {
    x = streetPos(si) + side * (ROAD / 2 + 10);
    y = near.y + (G.rng() < 0.5 ? -1 : 1) * range(G.rng, 200, 560);
  }
  const p = makePed(G, x, y);
  if (inWater(x, y)) return null;
  return p;
}

export function updatePeds(G, dt) {
  const p = G.player;
  for (const ped of G.peds) {
    if (ped.dead) { ped.deadTimer += dt; continue; }
    ped.stepPhase += dt * 8;
    // Danger check: a fast car nearby, a gunshot, or a body on the ground.
    const car = G.playerCar;
    let threat = null;
    if (G.shotsFired > 0 && Math.hypot(ped.x - p.x, ped.y - p.y) < 320) threat = { x: p.x, y: p.y };
    if (car && Math.abs(car.speed) > 120 && Math.hypot(ped.x - car.x, ped.y - car.y) < 130) {
      threat = { x: car.x, y: car.y };
    }
    if (threat) {
      ped.state = 'flee';
      ped.fleeX = threat.x;
      ped.fleeY = threat.y;
    } else if (ped.state === 'flee' && Math.hypot(ped.x - ped.fleeX, ped.y - ped.fleeY) > 420) {
      ped.state = 'walk';
    }
    if (ped.state === 'flee') {
      const dx = ped.x - ped.fleeX;
      const dy = ped.y - ped.fleeY;
      const d = Math.hypot(dx, dy) || 1;
      ped.angle = Math.atan2(dy, dx);
      ped.x += (dx / d) * 250 * dt;
      ped.y += (dy / d) * 250 * dt;
      resolveCircle(G.world, ped, 10);
      continue;
    }
    if (ped.taxiWait) continue; // standing at the curb, waiting for a fare
    // Stroll along the sidewalk; turn at intersections sometimes.
    ped.turnCooldown -= dt;
    const inter = nearestIntersection(ped.x, ped.y);
    if (ped.turnCooldown <= 0 && Math.hypot(ped.x - inter.x, ped.y - inter.y) < 34) {
      ped.turnCooldown = range(G.rng, 1, 3);
      if (G.rng() < 0.4) {
        ped.axis = ped.axis === 'h' ? 'v' : 'h';
        ped.dir = G.rng() < 0.5 ? 1 : -1;
      }
    }
    if (ped.axis === 'h') {
      ped.x += ped.dir * ped.speed * dt;
      ped.angle = ped.dir > 0 ? 0 : Math.PI;
    } else {
      ped.y += ped.dir * ped.speed * dt;
      ped.angle = ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    // Stay on the sidewalk band; drift back if pushed off.
    resolveCircle(G.world, ped, 10);
    if (inWater(ped.x, ped.y)) ped.y -= 40;
  }
  // Remove the long-dead and the far away; keep the street alive.
  G.peds = G.peds.filter((ped) => {
    if (ped.dead && ped.deadTimer > 14) return false;
    return Math.hypot(ped.x - p.x, ped.y - p.y) < 900;
  });
  const alive = G.peds.filter((ped) => !ped.dead).length;
  if (alive < 12 && G.pedTimer <= 0) {
    const np = spawnPed(G, p);
    if (np) G.peds.push(np);
    G.pedTimer = 0.4;
  }
  G.pedTimer -= dt;
}

// A fast car ploughing through a pedestrian. Returns true if one was hit.
export function carHitsPed(G, car) {
  for (const ped of G.peds) {
    if (ped.dead) continue;
    if (Math.hypot(ped.x - car.x, ped.y - car.y) < 26 && Math.abs(car.speed) > 90) {
      ped.dead = true;
      ped.deadTimer = 0;
      ped.angle = Math.atan2(ped.y - car.y, ped.x - car.x);
      return ped;
    }
  }
  return null;
}
