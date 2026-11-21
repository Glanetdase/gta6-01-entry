// Solmar Bay — the city: deterministic generation, landmarks, collision.
// Blocks are 240 px, roads 80 px, pitch 320 px; 11 blocks and 12 roads a side.
// Every building, tree and container comes from the world seed, so the city is
// identical on every load.

import {
  BLOCK, ROAD, PITCH, GRID, WORLD, PALETTE,
  blockStart, blockCenter, roadCenter, LANDMARKS,
} from './config.js';
import { makeRng, clamp } from './random.js';

export function makeWorld(seed) {
  const rng = makeRng(seed);
  const buildings = [];
  const trees = [];
  const containers = [];
  const blocks = []; // { bx, by, kind, x, y, w, h }

  const landmarkAt = (bx, by) => {
    for (const [key, lm] of Object.entries(LANDMARKS)) {
      if (lm.bx === bx && lm.by === by) return key;
    }
    return null;
  };

  for (let by = 0; by < GRID; by++) {
    for (let bx = 0; bx < GRID; bx++) {
      const lm = landmarkAt(bx, by);
      const x = blockStart(bx);
      const y = blockStart(by);
      let kind = 'city';
      if (lm === 'park') kind = 'park';
      else if (lm === 'beach' || by === GRID - 1) kind = 'beach';
      else if (lm === 'docks' || bx === GRID - 1) kind = 'docks';
      else if (lm === 'hospital') kind = 'hospital';
      else if (lm === 'police') kind = 'police';
      else if (lm === 'safehouse') kind = 'safehouse';
      else if (lm === 'bank') kind = 'bank';
      blocks.push({ bx, by, kind, x, y, w: BLOCK, h: BLOCK, landmark: lm });

      if (kind === 'city' || kind === 'hospital' || kind === 'police' || kind === 'bank' || kind === 'safehouse') {
        // 1-3 buildings per block, leaving a plaza strip along one edge.
        const count = kind === 'city' ? rng.int(1, 3) : 1;
        const spots = [
          { x: x + 24, y: y + 24, w: 96, h: 80 },
          { x: x + 132, y: y + 24, w: 84, h: 96 },
          { x: x + 24, y: y + 132, w: 110, h: 84 },
          { x: x + 140, y: y + 136, w: 76, h: 76 },
        ];
        const chosen = rng.shuffle(spots).slice(0, count);
        for (const s of chosen) {
          const ci = rng.int(0, PALETTE.building.length - 1);
          buildings.push({
            x: s.x, y: s.y, w: s.w, h: s.h,
            color: PALETTE.building[ci], roof: PALETTE.roof[ci],
            tall: rng.chance(0.35), landmark: lm,
          });
        }
        // A couple of trees on the block's open corners.
        for (let t = 0; t < 2; t++) {
          trees.push({
            x: x + rng.range(16, BLOCK - 16),
            y: y + rng.range(16, BLOCK - 16),
            r: rng.range(9, 14),
          });
        }
      } else if (kind === 'park') {
        for (let t = 0; t < 14; t++) {
          trees.push({
            x: x + rng.range(20, BLOCK - 20),
            y: y + rng.range(20, BLOCK - 20),
            r: rng.range(10, 16),
          });
        }
      } else if (kind === 'beach') {
        for (let t = 0; t < 5; t++) {
          trees.push({
            x: x + rng.range(20, BLOCK - 20),
            y: y + rng.range(20, BLOCK - 60),
            r: rng.range(10, 15),
          });
        }
      } else if (kind === 'docks') {
        for (let c = 0; c < 8; c++) {
          containers.push({
            x: x + rng.range(12, BLOCK - 72),
            y: y + rng.range(12, BLOCK - 40),
            w: 56, h: 26,
            color: rng.pick(['#b3543a', '#3a6db3', '#4a8a3a', '#b3893a', '#7a4a8a']),
            angle: rng.chance(0.5) ? 0 : Math.PI / 2,
          });
        }
      }
    }
  }

  return { seed, buildings, trees, containers, blocks };
}

// Is a point on a road (not inside a block)?
export function isRoad(x, y) {
  const mx = ((x % PITCH) + PITCH) % PITCH;
  const my = ((y % PITCH) + PITCH) % PITCH;
  return mx < ROAD || my < ROAD;
}

// Nearest road centre line for a point, on the given axis.
export function nearestRoadCenter(v) {
  const i = Math.round((v - ROAD / 2) / PITCH);
  return roadCenter(clamp(i, 0, GRID));
}

// Push a circle (x, y, radius) out of every solid rect it overlaps.
// Returns the corrected { x, y }.
export function collideCircle(world, x, y, r) {
  let nx = x;
  let ny = y;
  const solids = [];
  for (const b of world.buildings) solids.push(b);
  for (const c of world.containers) solids.push(c);
  for (const s of solids) {
    const cx = clamp(nx, s.x, s.x + s.w);
    const cy = clamp(ny, s.y, s.y + s.h);
    const dx = nx - cx;
    const dy = ny - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (d2 > 0.001) {
        const d = Math.sqrt(d2);
        nx = cx + (dx / d) * r;
        ny = cy + (dy / d) * r;
      } else {
        // Centre inside the rect: push out along the smallest penetration.
        const left = nx - s.x;
        const right = s.x + s.w - nx;
        const top = ny - s.y;
        const bottom = s.y + s.h - ny;
        const m = Math.min(left, right, top, bottom);
        if (m === left) nx = s.x - r;
        else if (m === right) nx = s.x + s.w + r;
        else if (m === top) ny = s.y - r;
        else ny = s.y + s.h + r;
      }
    }
  }
  nx = clamp(nx, r, WORLD - r);
  ny = clamp(ny, r, WORLD - r);
  return { x: nx, y: ny };
}

// A point inside a building (for spawning checks)?
export function insideBuilding(world, x, y) {
  for (const b of world.buildings) {
    if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return true;
  }
  for (const c of world.containers) {
    if (x > c.x && x < c.x + c.w && y > c.y && y < c.y + c.h) return true;
  }
  return false;
}

// Centre of a landmark block, in world pixels.
export function landmarkCenter(key) {
  const lm = LANDMARKS[key];
  return { x: blockCenter(lm.bx), y: blockCenter(lm.by) };
}

// A random road point near (x, y), for spawns.
export function randomRoadPoint(rng, x, y, radius) {
  for (let tries = 0; tries < 20; tries++) {
    const px = clamp(x + rng.range(-radius, radius), 60, WORLD - 60);
    const py = clamp(y + rng.range(-radius, radius), 60, WORLD - 60);
    if (isRoad(px, py)) return { x: px, y: py };
  }
  return { x: nearestRoadCenter(x), y: nearestRoadCenter(y) };
}
