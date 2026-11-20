// Combat: bullets, the player's punch, and armed enemies for the story
// missions. Bullets are stopped by buildings; a hit on a pedestrian or a
// cop is a crime the wanted system remembers.

import { TUNE } from './config.js';
import { hitBuilding } from './world.js';
import { addWanted } from './police.js';

export function fireBullet(G, x, y, angle, from, dmg = TUNE.bulletDamage) {
  G.bullets.push({
    x, y,
    vx: Math.cos(angle) * TUNE.bulletSpeed,
    vy: Math.sin(angle) * TUNE.bulletSpeed,
    life: 1.1, from, dmg,
  });
  if (from === 'player') {
    G.shotsFired++;
    G.audio.gunshot();
    addWanted(G, TUNE.shootCrime, 'shots fired');
  }
}

function spark(G, x, y) {
  G.sparks.push({ x, y, t: 0.12 });
}

// Player bullets vs enemies, cops and pedestrians.
function hitTargets(G, b) {
  for (const e of G.enemies) {
    if (e.hp > 0 && Math.hypot(e.x - b.x, e.y - b.y) < 16) {
      e.hp -= b.dmg;
      b.life = 0;
      spark(G, b.x, b.y);
      if (e.hp <= 0 && !e.counted) {
        e.counted = true;
        G.enemiesKilled++;
        G.audio.blip(300, 0.15, 'sawtooth', 0.1);
      }
      return true;
    }
  }
  for (const c of G.cops) {
    if (Math.hypot(c.x - b.x, c.y - b.y) < 15) {
      c.hp -= b.dmg;
      b.life = 0;
      if (c.hp <= 0) {
        addWanted(G, TUNE.killCop, 'officer down');
        G.cops.splice(G.cops.indexOf(c), 1);
      }
      return true;
    }
  }
  for (const ped of G.peds) {
    if (!ped.dead && Math.hypot(ped.x - b.x, ped.y - b.y) < 14) {
      ped.dead = true;
      ped.deadTimer = 0;
      b.life = 0;
      addWanted(G, TUNE.hitPed, 'pedestrian shot');
      return true;
    }
  }
  return false;
}

export function updateBullets(G, dt) {
  const p = G.player;
  for (const b of G.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (hitBuilding(G.world, b.x, b.y, 2)) {
      b.life = 0;
      G.sparks.push({ x: b.x, y: b.y, t: 0.15 });
      continue;
    }
    if (b.from === 'player') {
      hitTargets(G, b);
    } else {
      // Enemy bullets: only the player.
      if (!G.playerCar && Math.hypot(p.x - b.x, p.y - b.y) < 15) {
        p.health -= b.dmg * 0.32;
        b.life = 0;
        G.shake = Math.max(G.shake, 3);
      } else if (G.playerCar && Math.hypot(G.playerCar.x - b.x, G.playerCar.y - b.y) < 20) {
        b.life = 0;
        spark(G, b.x, b.y);
      }
    }
  }
  G.bullets = G.bullets.filter((b) => b.life > 0);
  G.sparks = G.sparks.filter((s) => (s.t -= dt) > 0);
}

// The player's punch: a short arc in front of the player.
export function playerPunch(G) {
  const p = G.player;
  const inArc = (t, r) => {
    const dx = t.x - p.x;
    const dy = t.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > TUNE.punchRange + r) return false;
    let diff = Math.atan2(dy, dx) - p.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff) < TUNE.punchArc;
  };
  G.audio.punch();
  let landed = false;
  for (const e of G.enemies) {
    if (e.hp > 0 && inArc(e, 14)) {
      e.hp -= TUNE.punchDamage;
      landed = true;
      if (e.hp <= 0 && !e.counted) {
        e.counted = true;
        G.enemiesKilled++;
      }
    }
  }
  for (const c of G.cops) {
    if (inArc(c, 14)) {
      c.hp -= TUNE.punchDamage;
      landed = true;
      addWanted(G, 40, 'assaulted an officer');
      if (c.hp <= 0) G.cops.splice(G.cops.indexOf(c), 1);
    }
  }
  for (const ped of G.peds) {
    if (!ped.dead && inArc(ped, 12)) {
      ped.state = 'flee';
      ped.fleeX = p.x;
      ped.fleeY = p.y;
      addWanted(G, 50, 'assaulted a pedestrian');
      landed = true;
    }
  }
  if (landed) G.shake = Math.max(G.shake, 3);
}

// Armed enemies: they hold position, strafe, and shoot at the player.
export function makeEnemy(x, y) {
  return {
    x, y,
    hp: TUNE.enemyHealth,
    angle: 0,
    shootTimer: 1 + Math.random() * 0.8,
    strafe: Math.random() < 0.5 ? 1 : -1,
    strafeTimer: 0,
  };
}

export function updateEnemies(G, dt) {
  const p = G.player;
  for (const e of G.enemies) {
    if (e.hp <= 0) continue;
    const target = G.playerCar || p;
    const d = Math.hypot(target.x - e.x, target.y - e.y);
    e.angle = Math.atan2(target.y - e.y, target.x - e.x);
    if (d < 430 && d > 120) {
      // Strafe sideways while keeping distance.
      e.strafeTimer -= dt;
      if (e.strafeTimer <= 0) {
        e.strafe = -e.strafe;
        e.strafeTimer = 0.9 + G.rng() * 0.8;
      }
      const sa = e.angle + Math.PI / 2;
      e.x += Math.cos(sa) * e.strafe * 70 * dt;
      e.y += Math.sin(sa) * e.strafe * 70 * dt;
    }
    e.shootTimer -= dt;
    if (e.shootTimer <= 0 && d < 430) {
      e.shootTimer = 0.9 + G.rng() * 0.6;
      const spread = (G.rng() - 0.5) * 0.22;
      fireBullet(G, e.x + Math.cos(e.angle) * 18, e.y + Math.sin(e.angle) * 18, e.angle + spread, 'enemy', 12);
      G.audio.blip(200, 0.08, 'square', 0.08);
    }
  }
  G.enemies = G.enemies.filter((e) => e.hp > 0);
}
