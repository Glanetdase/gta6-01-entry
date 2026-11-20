// Solmar Bay — pedestrians: people walking the sidewalks, who run
// away from gunfire and screeching cars. They give the city life and
// the wanted system something to react to.

import { GRID, TUNE, PALETTE } from './config.js';
import { mulberry32, range, int, pick, clamp, dist } from './random.js';
import { randomSidewalkPoint, resolveCircle } from './world.js';

const PED_COLORS = [PALETTE.pedA, PALETTE.pedB, PALETTE.pedC, PALETTE.pedD];

export function makePed(x, y, rng) {
  return {
    x,
    y,
    angle: rng() * Math.PI * 2,
    speed: range(rng, TUNE.pedSpeed * 0.7, TUNE.pedSpeed * 1.3),
    color: pick(rng, PED_COLORS),
    state: 'walk', // walk | flee
    target: null,
    fleeTimer: 0,
    bob: rng() * Math.PI * 2,
  };
}

// Seed the starting crowd.
export function seedPeds(G) {
  const rng = mulberry32(G.seed + 31);
  G.peds = [];
  for (let i = 0; i < 42; i += 1) {
    const p = randomSidewalkPoint(rng, G.world);
    G.peds.push(makePed(p.x, p.y, rng));
  }
}

// Keep the crowd near the player: spawn ahead, remove far behind.
export function maintainPeds(G, dt) {
  G.pedTimer -= dt;
  if (G.peds.length < 34 && G.pedTimer <= 0) {
    G.pedTimer = 0.9;
    const p = randomSidewalkPoint(G.rng, G.world);
    if (dist(p.x, p.y, G.player.x, G.player.y) < 420) return;
    if (dist(p.x, p.y, G.player.x, G.player.y) > 1100) return;
    G.peds.push(makePed(p.x, p.y, G.rng));
  }
  for (let i = G.peds.length - 1; i >= 0; i -= 1) {
    const ped = G.peds[i];
    if (dist(ped.x, ped.y, G.player.x, G.player.y) > 1400) {
      G.peds.splice(i, 1);
    }
  }
}

// A nearby threat (a gunshot, a fast car) makes peds run away.
export function senseThreat(G, x, y, radius) {
  for (const ped of G.peds) {
    if (dist(ped.x, ped.y, x, y) < radius) {
      ped.state = 'flee';
      ped.fleeTimer = 2.5;
      ped.angle = Math.atan2(ped.y - y, ped.x - x);
    }
  }
}

export function updatePeds(G, dt) {
  for (const ped of G.peds) {
    ped.bob += dt * 7;
    if (ped.state === 'flee') {
      ped.fleeTimer -= dt;
      const speed = TUNE.pedFleeSpeed;
      ped.x += Math.cos(ped.angle) * speed * dt;
      ped.y += Math.sin(ped.angle) * speed * dt;
      if (ped.fleeTimer <= 0) ped.state = 'walk';
    } else {
      // Wander: pick a new sidewalk target when the old one is reached.
      if (!ped.target || dist(ped.x, ped.y, ped.target.x, ped.target.y) < 24) {
        ped.target = randomSidewalkPoint(G.rng, G.world);
      }
      const want = Math.atan2(ped.target.y - ped.y, ped.target.x - ped.x);
      let diff = want - ped.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      ped.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
    }
    const fixed = resolveCircle(G.world, ped.x, ped.y, 11);
    ped.x = fixed.x;
    ped.y = fixed.y;
  }

  // The player's car running a ped over is a crime, and the ped is gone.
  if (G.playerCar && Math.abs(G.playerCar.speed) > 60) {
    for (let i = G.peds.length - 1; i >= 0; i -= 1) {
      const ped = G.peds[i];
      if (dist(ped.x, ped.y, G.playerCar.x, G.playerCar.y) < 26) {
        G.peds.splice(i, 1);
        G.lastCrime = 0;
        G.lastCrimeReason = 'hit a pedestrian';
        G.wanted = Math.min(100, G.wanted + 25);
        G.shake = Math.max(G.shake, 6);
        G.audio.thud();
        senseThreat(G, ped.x, ped.y, 320);
      }
    }
  }
}
