// Solmar Bay — combat: bullets, muzzle sparks, and the gang members
// who shoot back. The player shoots on foot with the mouse; enemies
// take three hits, and their bullets hurt.

import { TUNE } from './config.js';
import { range, dist, clamp } from './random.js';
import { isBlocked } from './world.js';
import { senseThreat } from './pedestrians.js';

export function spawnBullet(G, x, y, angle, from) {
  G.bullets.push({
    x,
    y,
    vx: Math.cos(angle) * TUNE.bulletSpeed,
    vy: Math.sin(angle) * TUNE.bulletSpeed,
    life: TUNE.bulletLife,
    from,
  });
  G.audio.shot();
}

export function spawnSpark(G, x, y, color) {
  G.sparks.push({ x, y, t: 0, life: 0.28, color: color || '#ffd23a' });
}

// The player fires toward the mouse. Only on foot, one shot per click.
export function playerShoot(G, angle) {
  const px = G.player.x + Math.cos(angle) * 22;
  const py = G.player.y + Math.sin(angle) * 22;
  spawnBullet(G, px, py, angle, 'player');
  spawnSpark(G, px, py, '#ffe98a');
  G.shotsFired += 1;
  G.lastCrime = 0;
  G.lastCrimeReason = 'fired a weapon';
  G.wanted = Math.min(100, G.wanted + 8);
  senseThreat(G, G.player.x, G.player.y, 380);
}

export function makeEnemy(x, y) {
  return {
    x,
    y,
    angle: 0,
    health: TUNE.enemyHealth,
    shootTimer: range(Math.random, 0.4, 1.2),
    r: 13,
  };
}

// Move bullets, test hits against enemies, the player and the world.
export function updateBullets(G, dt) {
  for (let i = G.bullets.length - 1; i >= 0; i -= 1) {
    const b = G.bullets[i];
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    let dead = b.life <= 0;
    if (!dead && isBlocked(G.world, b.x, b.y)) {
      spawnSpark(G, b.x, b.y, '#c8c8c8');
      dead = true;
    }
    if (!dead && b.from === 'player') {
      for (let j = G.enemies.length - 1; j >= 0; j -= 1) {
        const e = G.enemies[j];
        if (dist(b.x, b.y, e.x, e.y) < e.r + 6) {
          e.health -= 1;
          spawnSpark(G, b.x, b.y, '#ff5a5a');
          if (e.health <= 0) {
            G.enemies.splice(j, 1);
            G.enemiesKilled += 1;
            G.audio.chime();
          }
          dead = true;
          break;
        }
      }
    }
    if (!dead && b.from === 'enemy') {
      const target = G.playerCar || G.player;
      const rr = G.playerCar ? 20 : 13;
      if (dist(b.x, b.y, target.x, target.y) < rr + 5) {
        if (G.playerCar) {
          G.playerCar.speed *= 0.9;
        } else {
          G.player.health -= TUNE.playerDamage;
          G.shake = Math.max(G.shake, 4);
        }
        spawnSpark(G, b.x, b.y, '#ff8a5a');
        dead = true;
      }
    }
    if (dead) G.bullets.splice(i, 1);
  }
  for (let i = G.sparks.length - 1; i >= 0; i -= 1) {
    G.sparks[i].t += dt;
    if (G.sparks[i].t >= G.sparks[i].life) G.sparks.splice(i, 1);
  }
}

// Enemies stand their ground and shoot at the player in range.
export function updateEnemies(G, dt) {
  for (const e of G.enemies) {
    const d = dist(e.x, e.y, G.player.x, G.player.y);
    e.angle = Math.atan2(G.player.y - e.y, G.player.x - e.x);
    if (d < TUNE.enemyRange) {
      e.shootTimer -= dt;
      if (e.shootTimer <= 0) {
        e.shootTimer = TUNE.enemyShootGap * range(Math.random, 0.8, 1.3);
        const spread = range(Math.random, -0.09, 0.09);
        const bx = e.x + Math.cos(e.angle) * 22;
        const by = e.y + Math.sin(e.angle) * 22;
        spawnBullet(G, bx, by, e.angle + spread, 'enemy');
        spawnSpark(G, bx, by, '#ff9a5a');
      }
    }
  }
}

// Every live target the current mission still needs dead.
export function enemiesLeft(G) {
  return G.enemies.length;
}
