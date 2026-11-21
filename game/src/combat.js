// Solmar Bay — combat: bullets, muzzle sparks, gang enemies.
// Player bullets fly from the gun toward the mouse; gang enemies stand their
// ground and shoot back when the player is in range. Every hit is a circle test.

import { BULLET_SPEED, BULLET_LIFE, ENEMY_RANGE, ENEMY_SHOT_COOLDOWN, PALETTE } from './config.js';
import { dist, clamp } from './random.js';

export function makeBullet(x, y, angle, owner) {
  return {
    x, y,
    vx: Math.cos(angle) * BULLET_SPEED,
    vy: Math.sin(angle) * BULLET_SPEED,
    life: BULLET_LIFE,
    owner, // 'player' | 'enemy'
  };
}

export function makeGang(x, y, rng) {
  return {
    x, y,
    angle: rng ? rng.range(0, Math.PI * 2) : 0,
    health: 50,
    shotCooldown: rng ? rng.range(0.3, 1.2) : 0.5,
    speed: 55,
    color: PALETTE.gang,
    kind: 'gang',
    wander: 0,
  };
}

// Step all bullets; returns hits: { bullet, target } for the caller to resolve.
export function stepBullets(bullets, dt, world) {
  const alive = [];
  for (const b of bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) continue;
    if (b.x < 0 || b.y < 0 || b.x > 3600 || b.y > 3600) continue;
    alive.push(b);
  }
  bullets.length = 0;
  bullets.push(...alive);
}

// Player bullet vs a target circle; returns the bullet if it hit (and removes it).
export function bulletHits(bullets, x, y, radius, owner) {
  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    if (b.owner !== owner) continue;
    if (dist(b.x, b.y, x, y) < radius + 4) {
      bullets.splice(i, 1);
      return b;
    }
  }
  return null;
}

// Gang AI: hold position, shoot the player in range; shuffle sideways sometimes.
export function stepGang(enemy, playerPos, bullets, dt, rng) {
  const d = dist(enemy.x, enemy.y, playerPos.x, playerPos.y);
  enemy.angle = Math.atan2(playerPos.y - enemy.y, playerPos.x - enemy.x);
  enemy.shotCooldown -= dt;
  if (d < ENEMY_RANGE && d > 60 && enemy.shotCooldown <= 0) {
    const spread = rng.range(-0.09, 0.09);
    bullets.push(makeBullet(enemy.x, enemy.y, enemy.angle + spread, 'enemy'));
    enemy.shotCooldown = ENEMY_SHOT_COOLDOWN * rng.range(0.8, 1.3);
  }
  // Side-step now and then so they are not statues.
  enemy.wander -= dt;
  if (enemy.wander <= 0) {
    enemy.wander = rng.range(1.2, 2.6);
    enemy.strafe = rng.chance(0.5) ? 1 : -1;
  }
  const sx = Math.cos(enemy.angle + Math.PI / 2) * (enemy.strafe || 1) * enemy.speed * 0.25;
  const sy = Math.sin(enemy.angle + Math.PI / 2) * (enemy.strafe || 1) * enemy.speed * 0.25;
  enemy.x = clamp(enemy.x + sx * dt, 20, 3580);
  enemy.y = clamp(enemy.y + sy * dt, 20, 3580);
}

// A small spark burst for hit feedback.
export function makeSparks(x, y, color, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 60 + Math.random() * 160;
    out.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.25 + Math.random() * 0.2, color });
  }
  return out;
}

export function stepSparks(sparks, dt) {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    if (s.life <= 0) sparks.splice(i, 1);
  }
}
