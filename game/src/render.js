// Solmar Bay — rendering: the city, the cars, the people, the effects.
// Everything is drawn with Canvas 2D paths in small named functions, one job
// each, so the dossier outline reads like a map of the game.

import {
  VIEW_W, VIEW_H, BLOCK, ROAD, PITCH, GRID, WORLD,
  blockStart, roadCenter, PALETTE, LANDMARKS,
} from './config.js';
import { clamp, fmtClock } from './random.js';
import { isRoad } from './world.js';

export function drawGround(ctx, cam, world, timeOfDay) {
  // All coordinates here are SCREEN space (the camera is subtracted by hand).
  // Base grass.
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Beach sand along the south edge, water beyond it.
  const beachY = blockStart(GRID - 1) - cam.y;
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(0, beachY, VIEW_W, VIEW_H - beachY);
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(0, beachY + BLOCK, VIEW_W, VIEW_H);
  // Docks concrete on the east edge.
  const docksX = blockStart(GRID - 1) - cam.x;
  ctx.fillStyle = '#8a8a92';
  ctx.fillRect(docksX, 0, VIEW_W - docksX, VIEW_H);
  // Park plaza.
  const park = LANDMARKS.park;
  ctx.fillStyle = PALETTE.plaza;
  ctx.fillRect(blockStart(park.bx) - cam.x, blockStart(park.by) - cam.y, BLOCK, BLOCK);
  // Day tint: warm at dusk, dark at night.
  const hour = (timeOfDay / 60) % 24;
  if (hour >= 18 || hour < 6) {
    ctx.fillStyle = PALETTE.night;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  } else if (hour >= 16.5) {
    ctx.fillStyle = PALETTE.sunset;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

export function drawRoads(ctx, cam) {
  // Screen space: each road is a strip across the visible viewport.
  ctx.fillStyle = PALETTE.road;
  for (let i = 0; i <= GRID; i++) {
    const c = roadCenter(i);
    ctx.fillRect(c - ROAD / 2 - cam.x, 0, ROAD, VIEW_H);
    ctx.fillRect(0, c - ROAD / 2 - cam.y, VIEW_W, ROAD);
  }
  // Centre dashes.
  ctx.fillStyle = PALETTE.roadLine;
  ctx.strokeStyle = PALETTE.roadLine;
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 22]);
  for (let i = 0; i <= GRID; i++) {
    const c = roadCenter(i);
    ctx.beginPath();
    ctx.moveTo(c - cam.x, 0);
    ctx.lineTo(c - cam.x, VIEW_H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, c - cam.y);
    ctx.lineTo(VIEW_W, c - cam.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // Sidewalk edges.
  ctx.strokeStyle = PALETTE.sidewalk;
  ctx.lineWidth = 5;
  for (let i = 0; i <= GRID; i++) {
    const c = roadCenter(i);
    ctx.strokeRect(c - ROAD / 2 - cam.x, -6, ROAD, VIEW_H + 12);
    ctx.strokeRect(-6, c - ROAD / 2 - cam.y, VIEW_W + 12, ROAD);
  }
}

export function drawBlocks(ctx, cam, world) {
  for (const b of world.blocks) {
    if (b.kind === 'park') continue; // plaza already drawn in drawGround
    if (b.kind === 'beach') continue;
    if (b.kind === 'docks') continue;
    ctx.fillStyle = b.kind === 'city' ? PALETTE.grassDark : '#7a7f8a';
    ctx.fillRect(b.x - cam.x, b.y - cam.y, b.w, b.h);
  }
  for (const b of world.buildings) {
    const sx = b.x - cam.x;
    const sy = b.y - cam.y;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(sx + 5, sy + 6, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(sx, sy, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(sx + 6, sy + 6, b.w - 12, b.h - 12);
    // Windows.
    ctx.fillStyle = 'rgba(255,240,180,0.85)';
    for (let wy = sy + 16; wy < sy + b.h - 10; wy += 22) {
      for (let wx = sx + 12; wx < sx + b.w - 12; wx += 20) {
        ctx.fillRect(wx, wy, 9, 7);
      }
    }
    if (b.tall) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(sx + b.w / 2 - 3, sy - 14, 6, 14);
    }
  }
  for (const c of world.containers) {
    ctx.save();
    ctx.translate(c.x + c.w / 2 - cam.x, c.y + c.h / 2 - cam.y);
    ctx.rotate(c.angle);
    ctx.fillStyle = c.color;
    ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 10, -c.h / 2);
      ctx.lineTo(i * 10, c.h / 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  for (const t of world.trees) {
    const sx = t.x - cam.x;
    const sy = t.y - cam.y;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(sx + 3, sy + 4, t.r, t.r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.tree;
    ctx.beginPath(); ctx.arc(sx, sy, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.treeDark;
    ctx.beginPath(); ctx.arc(sx - 3, sy - 3, t.r * 0.55, 0, Math.PI * 2); ctx.fill();
  }
}

export function drawPickups(ctx, cam, pickups) {
  for (const p of pickups) {
    const sx = p.x - cam.x;
    const sy = p.y - cam.y;
    const bob = Math.sin(p.bob || 0) * 2;
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(sx - 9, sy - 7 + bob, 18, 14);
    ctx.fillStyle = '#ffd23d';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', sx, sy + 4 + bob);
  }
}

export function drawCar(ctx, cam, car) {
  const sx = car.x - cam.x;
  const sy = car.y - cam.y;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(car.angle);
  const w = car.kind.w;
  const h = car.kind.h;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w, h);
  ctx.fillStyle = car.color;
  roundRect(ctx, -w / 2, -h / 2, w, h, 6);
  ctx.fill();
  // Windows + roof.
  ctx.fillStyle = '#1d2733';
  ctx.fillRect(-w * 0.18, -h / 2 + 3, w * 0.32, h - 6);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(-w * 0.18, -h / 2 + 3, w * 0.32, 4);
  // Headlights / taillights.
  ctx.fillStyle = '#fff8c0';
  ctx.fillRect(w / 2 - 3, -h / 2 + 2, 3, 5);
  ctx.fillRect(w / 2 - 3, h / 2 - 7, 3, 5);
  ctx.fillStyle = '#ff3b30';
  ctx.fillRect(-w / 2, -h / 2 + 2, 3, 5);
  ctx.fillRect(-w / 2, h / 2 - 7, 3, 5);
  if (car.isTaxi) {
    ctx.fillStyle = '#111';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, 3);
  }
  if (car.isCop) {
    ctx.fillStyle = PALETTE.copBlue;
    ctx.fillRect(-w * 0.32, -h / 2 + 2, w * 0.14, h - 4);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PD', -w * 0.02, 3);
  }
  if (car.spark > 0) {
    ctx.fillStyle = PALETTE.spark;
    for (let i = 0; i < 5; i++) {
      ctx.fillRect((Math.random() - 0.5) * w, (Math.random() - 0.5) * h, 3, 3);
    }
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawPerson(ctx, cam, p, opts = {}) {
  const sx = p.x - cam.x;
  const sy = p.y - cam.y;
  const bob = p.walking ? Math.sin(p.walkPhase || 0) * 1.5 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(sx, sy + 10, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  // Legs.
  ctx.strokeStyle = '#22242e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(sx - 3, sy + 2); ctx.lineTo(sx - 3, sy + 10 + bob);
  ctx.moveTo(sx + 3, sy + 2); ctx.lineTo(sx + 3, sy + 10 - bob);
  ctx.stroke();
  // Body.
  ctx.fillStyle = p.color || PALETTE.player;
  ctx.beginPath(); ctx.arc(sx, sy - 2, 9, 0, Math.PI * 2); ctx.fill();
  // Head.
  ctx.fillStyle = '#f2c79b';
  ctx.beginPath(); ctx.arc(sx, sy - 13, 6, 0, Math.PI * 2); ctx.fill();
  // Aim gun when shooting.
  if (opts.aiming) {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 2);
    ctx.lineTo(sx + Math.cos(opts.aim) * 18, sy - 2 + Math.sin(opts.aim) * 18);
    ctx.stroke();
  }
  if (opts.label) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(opts.label, sx, sy - 24);
  }
  // Health bar for gang/cops.
  if (opts.health != null && opts.health < 50) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(sx - 12, sy - 26, 24, 4);
    ctx.fillStyle = '#ff5a5a';
    ctx.fillRect(sx - 12, sy - 26, 24 * (opts.health / 50), 4);
  }
}

export function drawBullets(ctx, cam, bullets) {
  ctx.strokeStyle = PALETTE.bullet;
  ctx.lineWidth = 3;
  for (const b of bullets) {
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.012 - cam.x, b.y - b.vy * 0.012 - cam.y);
    ctx.lineTo(b.x - cam.x, b.y - cam.y);
    ctx.stroke();
  }
}

export function drawSparks(ctx, cam, sparks) {
  for (const s of sparks) {
    ctx.globalAlpha = clamp(s.life * 4, 0, 1);
    ctx.fillStyle = s.color;
    ctx.fillRect(s.x - cam.x - 2, s.y - cam.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
}

export function drawMarker(ctx, cam, marker, color, pulse) {
  if (!marker) return;
  const sx = marker.x - cam.x;
  const sy = marker.y - cam.y;
  const r = 26 + Math.sin(pulse * 4) * 5;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(sx, sy - r - 14);
  ctx.lineTo(sx - 8, sy - r + 2);
  ctx.lineTo(sx + 8, sy - r + 2);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export function drawMinimap(ctx, G) {
  const size = 176;
  const x0 = VIEW_W - size - 14;
  const y0 = 14;
  const scale = size / WORLD;
  ctx.fillStyle = PALETTE.hudBg;
  ctx.fillRect(x0 - 4, y0 - 4, size + 8, size + 8);
  ctx.fillStyle = '#1d2b1d';
  ctx.fillRect(x0, y0, size, size);
  // Roads.
  ctx.fillStyle = '#3a3d47';
  for (let i = 0; i <= GRID; i++) {
    const c = roadCenter(i) * scale;
    ctx.fillRect(x0, y0 + c - 2, size, 4);
    ctx.fillRect(x0 + c - 2, y0, 4, size);
  }
  // Water + beach strip.
  ctx.fillStyle = '#2e6f9e';
  ctx.fillRect(x0, y0 + size - 8, size, 8);
  const marker = G.marker;
  if (marker) {
    ctx.fillStyle = '#ffd23d';
    const mx = x0 + marker.x * scale;
    const my = y0 + marker.y * scale;
    ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd23d';
    ctx.beginPath(); ctx.arc(mx, my, 9, 0, Math.PI * 2); ctx.stroke();
  }
  for (const car of G.copCars) {
    ctx.fillStyle = '#5a8cff';
    ctx.fillRect(x0 + car.x * scale - 2, y0 + car.y * scale - 2, 4, 4);
  }
  for (const e of G.enemies) {
    ctx.fillStyle = '#ff5a5a';
    ctx.fillRect(x0 + e.x * scale - 2, y0 + e.y * scale - 2, 4, 4);
  }
  const px = G.player.inCar ? G.player.inCar.x : G.player.x;
  const py = G.player.inCar ? G.player.inCar.y : G.player.y;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x0 + px * scale, y0 + py * scale, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffd23d';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x0 + px * scale, y0 + py * scale, 6, 0, Math.PI * 2); ctx.stroke();
}
