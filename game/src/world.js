// Solmar Bay city generation and collision.
// The city is a deterministic road grid: N x N blocks separated by streets,
// with a beach and water along the south edge and a dock district in the
// south-east. Blocks hold buildings, parks, parking lots or named landmarks.

import { BLOCK, N, ROAD, WORLD_W, WORLD_H, BEACH_Y, WATER_Y, PALETTE, blockRect, streetPos } from './config.js';
import { mulberry32, range, int, pick, chance } from './random.js';

// Named landmark blocks (block coordinates). Everything is fictional.
export const LANDMARKS = {
  bank: { bi: 5, bj: 5, name: 'Solmar National Bank' },
  safehouse: { bi: 1, bj: 8, name: "Danny's Safehouse" },
  hospital: { bi: 9, bj: 1, name: 'St. Marina Hospital' },
  police: { bi: 2, bj: 2, name: 'Solmar PD HQ' },
  docks: { bi: 9, bj: 9, name: 'Port Solmar Docks' },
};

const CONTAINER_COLORS = ['#b5542c', '#2c6e8f', '#7a8a3a', '#8f5aa8', '#a8832f'];
const DOCK_MIN_I = 9;
const DOCK_MIN_J = 9;

function landmarkAt(i, j) {
  for (const lm of Object.values(LANDMARKS)) {
    if (lm.bi === i && lm.bj === j) return lm;
  }
  return null;
}

function isDockBlock(i, j) {
  return i >= DOCK_MIN_I && j >= DOCK_MIN_J;
}

// Fill one block: docks get containers, landmarks get one big building,
// anything else rolls park / parking lot / 1-4 towers.
function buildBlock(rng, i, j, out) {
  const b = blockRect(i, j);
  if (isDockBlock(i, j)) {
    // Dock district: flat concrete, stacked containers, no buildings.
    for (let k = 0; k < 5; k++) {
      out.containers.push({
        x: b.x + 18 + rng() * (BLOCK - 90),
        y: b.y + 18 + rng() * (BLOCK - 60),
        w: 52 + rng() * 20,
        h: 22,
        color: pick(rng, CONTAINER_COLORS),
      });
    }
    return;
  }
  const lm = landmarkAt(i, j);
  if (lm) {
    const w = BLOCK * 0.62;
    const h = BLOCK * 0.5;
    out.buildings.push({
      x: b.x + (BLOCK - w) / 2,
      y: b.y + (BLOCK - h) / 2,
      w,
      h,
      hgt: lm === LANDMARKS.bank ? 46 : 34,
      color: lm === LANDMARKS.bank ? '#d9b380' : lm === LANDMARKS.hospital ? '#e8e8e8' : '#9fb4c7',
      roof: '#5d6b7a',
      landmark: lm.name,
    });
    return;
  }
  const roll = rng();
  if (roll < 0.10) {
    // Park: dark grass with trees and a footpath across it.
    out.parks.push({ x: b.x, y: b.y, w: BLOCK, h: BLOCK });
    const n = int(rng, 6, 10);
    for (let k = 0; k < n; k++) {
      out.trees.push({
        x: b.x + 22 + rng() * (BLOCK - 44),
        y: b.y + 22 + rng() * (BLOCK - 44),
        r: 12 + rng() * 9,
        color: pick(rng, PALETTE.parkTree),
      });
    }
    return;
  }
  if (roll < 0.18) {
    // Parking lot: flat asphalt with painted bays (drawn by the renderer).
    out.lots.push({ x: b.x, y: b.y, w: BLOCK, h: BLOCK });
    return;
  }
  // Towers: split the block into 1-4 buildings with a margin.
  const cols = chance(rng, 0.5) ? 2 : 1;
  const rows = chance(rng, 0.5) ? 2 : 1;
  const gap = 14;
  const cw = (BLOCK - gap * (cols + 1)) / cols;
  const ch = (BLOCK - gap * (rows + 1)) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.buildings.push({
        x: b.x + gap + c * (cw + gap) + range(rng, -3, 3),
        y: b.y + gap + r * (ch + gap) + range(rng, -3, 3),
        w: cw + range(rng, -8, 8),
        h: ch + range(rng, -8, 8),
        hgt: int(rng, 18, 84),
        color: pick(rng, PALETTE.building),
        roof: pick(rng, PALETTE.roof),
        landmark: null,
      });
    }
  }
}

export function generateWorld(seed) {
  const rng = mulberry32(seed);
  const out = { seed, buildings: [], parks: [], lots: [], trees: [], containers: [] };
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      buildBlock(rng, i, j, out);
    }
  }
  // Street trees along every third avenue.
  for (let i = 0; i <= N; i++) {
    if (i % 3 !== 0) continue;
    for (let j = 0; j < N; j++) {
      out.trees.push({
        x: streetPos(i) - ROAD / 2 - 6,
        y: streetPos(j) + ROAD / 2 + 40,
        r: 10,
        color: '#4c7a35',
        street: true,
      });
    }
  }
  return out;
}

// ---- Geometry helpers -------------------------------------------------

export function onRoad(x, y) {
  if (y >= BEACH_Y) return true; // the beach promenade counts as open ground
  for (let i = 0; i <= N; i++) {
    const s = streetPos(i);
    if (Math.abs(x - s) <= ROAD / 2 || Math.abs(y - s) <= ROAD / 2) return true;
  }
  return false;
}

export function inWater(x, y) {
  return y >= WATER_Y && y <= WORLD_H;
}

export function nearestIntersection(x, y) {
  const gi = Math.max(0, Math.min(N, Math.round((x - ROAD / 2) / (BLOCK + ROAD))));
  const gj = Math.max(0, Math.min(N, Math.round((y - ROAD / 2) / (BLOCK + ROAD))));
  return { i: gi, j: gj, x: streetPos(gi), y: streetPos(gj) };
}

// Circle vs building and container AABBs. First hit, or null.
export function hitBuilding(world, x, y, r) {
  for (const b of world.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  for (const c of world.containers) {
    if (x + r > c.x && x - r < c.x + c.w && y + r > c.y && y - r < c.y + c.h) return c;
  }
  return null;
}

// Push a circle out of buildings and the world bounds. True if it hit.
export function resolveCircle(world, p, r) {
  let hit = false;
  const b = hitBuilding(world, p.x, p.y, r);
  if (b) {
    hit = true;
    // Shove out along the smallest overlap.
    const overlaps = [
      { d: p.x + r - b.x, fn: () => { p.x = b.x - r; } },
      { d: b.x + b.w - (p.x - r), fn: () => { p.x = b.x + b.w + r; } },
      { d: p.y + r - b.y, fn: () => { p.y = b.y - r; } },
      { d: b.y + b.h - (p.y - r), fn: () => { p.y = b.y + b.h + r; } },
    ];
    let best = overlaps[0];
    for (const o of overlaps) if (o.d < best.d) best = o;
    best.fn();
  }
  if (p.x < r) { p.x = r; hit = true; }
  if (p.x > WORLD_W - r) { p.x = WORLD_W - r; hit = true; }
  if (p.y < r) { p.y = r; hit = true; }
  if (p.y > WORLD_H - r) { p.y = WORLD_H - r; hit = true; }
  // Water blocks movement (the docks pier is land; the water is south).
  if (p.y > WATER_Y - r) { p.y = WATER_Y - r; hit = true; }
  return hit;
}

// A point is drivable if it is inside the world, above the water, and not
// inside a building: roads, lots, dock concrete and beach sand all qualify.
export function drivable(world, x, y) {
  if (x < 0 || x > WORLD_W || y < 0 || y > WATER_Y) return false;
  if (hitBuilding(world, x, y, 2)) return false;
  return true;
}

// Landmark world position (centre of its block).
export function landmarkPos(world, key) {
  const lm = LANDMARKS[key];
  const b = blockRect(lm.bi, lm.bj);
  return { x: b.x + BLOCK / 2, y: b.y + BLOCK / 2, name: lm.name };
}
