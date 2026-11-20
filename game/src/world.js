// Solmar Bay — the city: an 11x11 block grid with roads, buildings,
// trees, a beach on the south edge, docks on the east edge, a park in
// the middle, and the landmarks the story uses. Everything is seeded,
// so the same seed always builds the same city.

import { BLOCK, ROAD, GRID, WORLD_W, WORLD_H, PALETTE } from './config.js';
import { mulberry32, range, int, pick } from './random.js';

// Centre of road `i` (0..GRID) on either axis.
export function roadCenter(i) {
  return i * (BLOCK + ROAD) + ROAD / 2;
}

// True when a coordinate sits on a road band.
export function onRoadBand(v) {
  return (v % (BLOCK + ROAD)) < ROAD;
}

// True when a point is on any road.
export function isOnRoad(x, y) {
  return onRoadBand(x) || onRoadBand(y);
}

// Snap a coordinate to the nearest road centre line.
export function nearestRoadCenter(v) {
  const step = BLOCK + ROAD;
  const i = Math.round((v - ROAD / 2) / step);
  const clamped = Math.max(0, Math.min(GRID, i));
  return roadCenter(clamped);
}

// The kind of block at (col, row): 'beach' along the south edge,
// 'docks' along the east edge, 'park' in the middle, 'city' elsewhere.
export function blockKind(col, row) {
  if (row === GRID - 1) return 'beach';
  if (col === GRID - 1) return 'docks';
  if (col === 5 && row === 5) return 'park';
  return 'city';
}

// Top-left corner of block (col, row), in world pixels.
export function blockOrigin(col, row) {
  return {
    x: ROAD + col * (BLOCK + ROAD),
    y: ROAD + row * (BLOCK + ROAD),
  };
}

// Centre of block (col, row).
export function blockCenter(col, row) {
  const o = blockOrigin(col, row);
  return { x: o.x + BLOCK / 2, y: o.y + BLOCK / 2 };
}

const ROOF_COLORS = [PALETTE.roofA, PALETTE.roofB, PALETTE.roofC, PALETTE.roofD, PALETTE.roofE];
const CONTAINER_COLORS = [PALETTE.containerA, PALETTE.containerB, PALETTE.containerC, PALETTE.containerD];

// Build the whole city from a seed. Returns the world object the
// renderer and the collision code share.
export function generateWorld(seed) {
  const rng = mulberry32(seed);
  const buildings = [];
  const trees = [];
  const containers = [];
  const blocks = [];
  const lots = [];

  for (let row = 0; row < GRID; row += 1) {
    for (let col = 0; col < GRID; col += 1) {
      const kind = blockKind(col, row);
      const o = blockOrigin(col, row);
      blocks.push({ col, row, x: o.x, y: o.y, w: BLOCK, h: BLOCK, kind });
      if (kind === 'city') {
        lots.push({ x: o.x, y: o.y, w: BLOCK, h: BLOCK });
        const count = int(rng, 1, 2);
        for (let b = 0; b < count; b += 1) {
          const bw = range(rng, 90, 190);
          const bh = range(rng, 80, 170);
          const bx = o.x + range(rng, 26, BLOCK - 26 - bw);
          const by = o.y + range(rng, 26, BLOCK - 26 - bh);
          buildings.push({
            x: bx,
            y: by,
            w: bw,
            h: bh,
            color: pick(rng, ROOF_COLORS),
            floors: int(rng, 1, 4),
          });
        }
        const treeCount = int(rng, 0, 3);
        for (let t = 0; t < treeCount; t += 1) {
          trees.push({
            x: o.x + range(rng, 30, BLOCK - 30),
            y: o.y + range(rng, 30, BLOCK - 30),
            r: range(rng, 10, 16),
          });
        }
      } else if (kind === 'park') {
        const treeCount = 14;
        for (let t = 0; t < treeCount; t += 1) {
          trees.push({
            x: o.x + range(rng, 34, BLOCK - 34),
            y: o.y + range(rng, 34, BLOCK - 34),
            r: range(rng, 12, 20),
          });
        }
      } else if (kind === 'beach') {
        const palmCount = int(rng, 3, 6);
        for (let t = 0; t < palmCount; t += 1) {
          trees.push({
            x: o.x + range(rng, 34, BLOCK - 34),
            y: o.y + range(rng, 30, BLOCK - 90),
            r: range(rng, 12, 17),
          });
        }
      } else if (kind === 'docks') {
        const stackCount = int(rng, 4, 7);
        for (let s = 0; s < stackCount; s += 1) {
          containers.push({
            x: o.x + range(rng, 24, BLOCK - 24 - 110),
            y: o.y + range(rng, 24, BLOCK - 24 - 44),
            w: range(rng, 84, 110),
            h: range(rng, 30, 44),
            color: pick(rng, CONTAINER_COLORS),
          });
        }
      }
    }
  }

  // The sea: a strip along the south edge and the east edge, drawn
  // blue and blocked like a building so nobody walks into the water.
  const sea = [
    { x: -40, y: WORLD_H - 58, w: WORLD_W + 80, h: 58, color: PALETTE.sea, water: true },
    { x: WORLD_W - 58, y: -40, w: 58, h: WORLD_H + 80, color: PALETTE.sea, water: true },
  ];

  // Landmarks sit on road intersections so every one is reachable.
  const landmarks = {
    safehouse: { x: roadCenter(2), y: roadCenter(3) },
    hospital: { x: roadCenter(8), y: roadCenter(2) },
    police: { x: roadCenter(3), y: roadCenter(8) },
    bank: { x: roadCenter(8), y: roadCenter(8) },
    taxi: { x: roadCenter(2), y: roadCenter(2) },
    docks: { x: roadCenter(10), y: roadCenter(5) },
    beach: { x: roadCenter(5), y: roadCenter(10) },
    park: blockCenter(5, 5),
  };

  return {
    seed,
    size: WORLD_W,
    width: WORLD_W,
    height: WORLD_H,
    blocks,
    lots,
    buildings,
    trees,
    containers,
    sea,
    landmarks,
  };
}

// All solid rectangles in the world: buildings, containers and sea.
export function solidRects(world) {
  return world.buildings.concat(world.containers, world.sea);
}

// Push a circle (x, y, r) out of every solid rectangle it overlaps,
// then clamp it inside the world. Returns the corrected position.
export function resolveCircle(world, x, y, r) {
  const rects = solidRects(world);
  for (let pass = 0; pass < 3; pass += 1) {
    let moved = false;
    for (const b of rects) {
      const cx = Math.max(b.x, Math.min(x, b.x + b.w));
      const cy = Math.max(b.y, Math.min(y, b.y + b.h));
      const dx = x - cx;
      const dy = y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 >= r * r) continue;
      if (d2 === 0) {
        // Centre inside the rectangle: push out along the shortest side.
        const left = x - b.x;
        const right = b.x + b.w - x;
        const top = y - b.y;
        const bottom = b.y + b.h - y;
        const m = Math.min(left, right, top, bottom);
        if (m === left) x = b.x - r;
        else if (m === right) x = b.x + b.w + r;
        else if (m === top) y = b.y - r;
        else y = b.y + b.h + r;
      } else {
        const d = Math.sqrt(d2);
        const push = r - d;
        x += (dx / d) * push;
        y += (dy / d) * push;
      }
      moved = true;
    }
    if (!moved) break;
  }
  if (x < r) x = r;
  if (y < r) y = r;
  if (x > world.width - r) x = world.width - r;
  if (y > world.height - r) y = world.height - r;
  return { x, y };
}

// True when the point is inside any solid rectangle.
export function isBlocked(world, x, y) {
  for (const b of solidRects(world)) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
  }
  return false;
}

// A random point on a road, for spawning traffic and pedestrians.
export function randomRoadPoint(rng, world) {
  const horizontal = rng() < 0.5;
  const road = Math.floor(rng() * (GRID + 1));
  const along = range(rng, ROAD, world.width - ROAD);
  if (horizontal) return { x: along, y: roadCenter(road) };
  return { x: roadCenter(road), y: along };
}

// A random point on a sidewalk edge of a random city block.
export function randomSidewalkPoint(rng, world) {
  const col = int(rng, 0, GRID - 2);
  const row = int(rng, 0, GRID - 2);
  const o = blockOrigin(col, row);
  const side = int(rng, 0, 3);
  if (side === 0) return { x: o.x + range(rng, 0, BLOCK), y: o.y - 14 };
  if (side === 1) return { x: o.x + range(rng, 0, BLOCK), y: o.y + BLOCK + 14 };
  if (side === 2) return { x: o.x - 14, y: o.y + range(rng, 0, BLOCK) };
  return { x: o.x + BLOCK + 14, y: o.y + range(rng, 0, BLOCK) };
}
