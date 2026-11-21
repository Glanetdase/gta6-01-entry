// Solmar Bay — the wanted system and the police who answer it.
// Heat rises with crime and falls after a quiet spell; stars are thresholds on
// heat. Cop cars chase on the road network (turning at intersections toward the
// player) and ram when close; foot cops run the player down on foot.

import { MAX_WANTED, WANTED_DECAY_DELAY, WANTED_DECAY_RATE, WORLD, PITCH, ROAD, GRID, roadCenter } from './config.js';
import { clamp, dist, angleDiff, makeRng } from './random.js';
import { randomRoadPoint } from './world.js';
import { makeCar } from './vehicles.js';

// Heat added by each crime.
export const CRIME_HEAT = {
  stealCar: 22,
  hitPed: 30,
  shoot: 12,
  killCop: 40,
  killGang: 6,
  crash: 4,
};

// Stars from heat: 0, 18, 36, 54, 72, 90.
export function starsForHeat(heat) {
  if (heat < 18) return 0;
  if (heat < 36) return 1;
  if (heat < 54) return 2;
  if (heat < 72) return 3;
  if (heat < 90) return 4;
  return 5;
}

export function commitCrime(G, kind) {
  G.heat = clamp(G.heat + (CRIME_HEAT[kind] || 10), 0, 100);
  G.lastCrime = G.time;
  G.wanted = starsForHeat(G.heat);
}

export function decayWanted(G, dt) {
  if (G.wanted === 0) return;
  if (G.time - G.lastCrime > WANTED_DECAY_DELAY) {
    G.heat = Math.max(0, G.heat - WANTED_DECAY_RATE * 18 * dt);
    G.wanted = starsForHeat(G.heat);
  }
}

export function wantedCopCarCount(wanted) {
  return wanted === 0 ? 0 : Math.min(1 + wanted, 6);
}
export function wantedFootCopCount(wanted) {
  return wanted >= 2 ? Math.min(wanted - 1, 4) : 0;
}

export function spawnCopCar(rng, playerX, playerY) {
  const p = randomRoadPoint(rng, playerX, playerY, 700);
  const car = makeCar(p.x, p.y, 0, 0, '#e8e8e8', { isCop: true, aiSpeed: 210 });
  car.speed = 200;
  car.mode = 'road';
  return car;
}

export function makeFootCop(rng, x, y) {
  return {
    x, y,
    angle: 0,
    speed: 150,
    kind: 'cop',
    health: 50,
  };
}

// One cop car step: on the road network toward the player; ram when close.
export function stepCopCar(car, playerPos, rng, dt) {
  const d = dist(car.x, car.y, playerPos.x, playerPos.y);
  if (d < 320) car.mode = 'ram';
  else if (d > 520) car.mode = 'road';

  if (car.mode === 'ram') {
    const want = Math.atan2(playerPos.y - car.y, playerPos.x - car.x);
    const turn = clamp(angleDiff(car.angle, want), -1, 1);
    car.angle += turn * 3.2 * dt;
    car.speed = Math.min(car.speed + 320 * dt, 520);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
  } else {
    // Road mode: pick the axis/road that gets closer to the player.
    const tx = playerPos.x;
    const ty = playerPos.y;
    // At an intersection, choose the turn that shrinks the Manhattan distance.
    const along = car.axis === 'x' ? car.x : car.y;
    const cross = Math.round((along - ROAD / 2) / PITCH);
    const crossCenter = roadCenter(cross);
    if (cross >= 0 && cross <= GRID && Math.abs(along - crossCenter) < 8) {
      const options = [];
      if (car.axis === 'x') {
        options.push({ axis: 'y', roadIdx: cross, dir: ty > car.y ? 1 : -1 });
        options.push({ axis: 'x', roadIdx: car.roadIdx, dir: car.dir });
      } else {
        options.push({ axis: 'x', roadIdx: cross, dir: tx > car.x ? 1 : -1 });
        options.push({ axis: 'y', roadIdx: car.roadIdx, dir: car.dir });
      }
      let best = options[options.length - 1];
      let bestScore = Infinity;
      for (const o of options) {
        const nx = o.axis === 'x' ? car.x + o.dir * 100 : roadCenter(o.roadIdx);
        const ny = o.axis === 'y' ? car.y + o.dir * 100 : roadCenter(o.roadIdx);
        const score = Math.abs(nx - tx) + Math.abs(ny - ty);
        if (score < bestScore) { bestScore = score; best = o; }
      }
      car.axis = best.axis;
      car.roadIdx = best.roadIdx;
      car.dir = best.dir;
    }
    car.speed = Math.min(car.speed + 260 * dt, 470);
    const laneOff = car.dir > 0 ? 20 : -20;
    const centre = roadCenter(car.roadIdx);
    if (car.axis === 'x') {
      car.x += car.speed * car.dir * dt;
      car.y += (centre + laneOff - car.y) * Math.min(1, dt * 4);
      car.angle = car.dir > 0 ? 0 : Math.PI;
    } else {
      car.y += car.speed * car.dir * dt;
      car.x += (centre + laneOff - car.x) * Math.min(1, dt * 4);
      car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    if (car.x < 40 || car.x > WORLD - 40 || car.y < 40 || car.y > WORLD - 40) {
      car.dir *= -1;
    }
  }
  car.x = clamp(car.x, 24, WORLD - 24);
  car.y = clamp(car.y, 24, WORLD - 24);
}

// One foot cop step: run straight at the player.
export function stepFootCop(cop, playerPos, dt) {
  const want = Math.atan2(playerPos.y - cop.y, playerPos.x - cop.x);
  cop.angle = want;
  cop.x += Math.cos(want) * cop.speed * dt;
  cop.y += Math.sin(want) * cop.speed * dt;
}
