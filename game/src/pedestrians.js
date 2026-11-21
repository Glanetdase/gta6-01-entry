// Solmar Bay — pedestrians: sidewalk walkers who flee from danger.
// They stroll along road edges; a gunshot, a crash or a car bearing down on them
// makes them run away screaming (well, silently — this is a canvas game).

import { PALETTE, WORLD } from './config.js';
import { clamp, dist, makeRng } from './random.js';
import { isRoad, randomRoadPoint } from './world.js';

let nextPedId = 1;

export function makePed(rng, x, y) {
  return {
    id: nextPedId++,
    x, y,
    angle: rng.range(0, Math.PI * 2),
    speed: rng.range(28, 52),
    target: null,
    color: rng.pick(PALETTE.ped),
    fleeing: 0,
    fleeX: 0,
    fleeY: 0,
    walkPhase: rng.range(0, Math.PI * 2),
    panic: 0,
  };
}

export function spawnPeds(rng, count, cx, cy) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    const p = randomRoadPoint(rng, cx, cy, 900);
    peds.push(makePed(rng, p.x, p.y));
  }
  return peds;
}

// A danger at (x, y) with the given radius makes nearby peds flee.
export function scarePeds(peds, x, y, radius) {
  for (const p of peds) {
    if (dist(p.x, p.y, x, y) < radius) {
      p.fleeing = 2.5;
      p.panic = 1;
      const dx = p.x - x;
      const dy = p.y - y;
      const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      p.fleeX = p.x + (dx / d) * 300;
      p.fleeY = p.y + (dy / d) * 300;
    }
  }
}

export function stepPeds(peds, rng, dt, danger) {
  for (const p of peds) {
    p.walkPhase += dt * 8;
    if (danger) scarePeds([p], danger.x, danger.y, danger.r);
    let tx;
    let ty;
    let speed = p.speed;
    if (p.fleeing > 0) {
      p.fleeing -= dt;
      tx = p.fleeX;
      ty = p.fleeY;
      speed = 150;
      if (dist(p.x, p.y, tx, ty) < 30) p.fleeing = 0;
    } else {
      if (!p.target || dist(p.x, p.y, p.target.x, p.target.y) < 24) {
        p.target = randomRoadPoint(rng, p.x, p.y, 420);
      }
      tx = p.target.x;
      ty = p.target.y;
    }
    const dx = tx - p.x;
    const dy = ty - p.y;
    const d = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
    p.angle = Math.atan2(dy, dx);
    p.x += (dx / d) * speed * dt;
    p.y += (dy / d) * speed * dt;
    p.x = clamp(p.x, 30, WORLD - 30);
    p.y = clamp(p.y, 30, WORLD - 30);
    p.panic = Math.max(0, p.panic - dt * 0.4);
  }
}

// A pedestrian hit by a car: they fall (removed) and the driver committed a crime.
export function checkPedHitByCar(peds, car) {
  for (let i = peds.length - 1; i >= 0; i--) {
    const p = peds[i];
    if (Math.abs(car.speed) > 60 && dist(p.x, p.y, car.x, car.y) < 30) {
      peds.splice(i, 1);
      return p;
    }
  }
  return null;
}
