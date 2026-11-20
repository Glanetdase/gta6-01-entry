// Solmar Bay — drawing the world: ground, roads, blocks, buildings,
// trees, containers, pickups and every actor. Each piece is its own
// small function so the dossier's outline reads like a map of the
// renderer. Only what the camera sees gets drawn.

import { BLOCK, ROAD, GRID, WORLD_W, PALETTE } from './config.js';
import { roadCenter, blockKind, blockOrigin } from './world.js';

// The main entry: set up the camera transform, draw the layers.
export function drawWorld(ctx, G, viewW, viewH) {
  const cam = G.camera;
  const shakeX = G.shake > 0 ? (Math.random() - 0.5) * G.shake : 0;
  const shakeY = G.shake > 0 ? (Math.random() - 0.5) * G.shake : 0;
  ctx.save();
  ctx.translate(viewW / 2, viewH / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x + shakeX, -cam.y + shakeY);
  const left = cam.x - viewW / 2 / cam.zoom - 80;
  const top = cam.y - viewH / 2 / cam.zoom - 80;
  const right = cam.x + viewW / 2 / cam.zoom + 80;
  const bottom = cam.y + viewH / 2 / cam.zoom + 80;
  const view = { left, top, right, bottom };
  drawGround(ctx, G, view);
  drawRoads(ctx, G, view);
  drawBlocks(ctx, G, view);
  drawContainers(ctx, G, view);
  drawBuildings(ctx, G, view);
  drawTrees(ctx, G, view);
  drawPickups(ctx, G, view);
  drawActors(ctx, G, view);
  drawMarkers(ctx, G, view);
  ctx.restore();
  drawNightTint(ctx, G, viewW, viewH);
}

// The clock drives the light: full dark at 21:00–05:00, clear at
// 08:00–17:00, with a dusk ramp and a dawn ramp in between. Drawn in
// screen space, after the world, so the HUD stays readable on top.
export function nightAlpha(hour) {
  if (hour >= 8 && hour < 17) return 0;
  if (hour >= 17 && hour < 21) return ((hour - 17) / 4) * 0.38;
  if (hour >= 21 || hour < 5) return 0.38;
  return ((8 - hour) / 3) * 0.38;
}

export function drawNightTint(ctx, G, viewW, viewH) {
  const hour = (G.clockMinutes / 60) % 24;
  const alpha = nightAlpha(hour);
  if (alpha <= 0) return;
  ctx.fillStyle = `rgba(10, 16, 40, ${alpha.toFixed(3)})`;
  ctx.fillRect(0, 0, viewW, viewH);
}

// The base: asphalt everywhere, then the sea strips on the edges.
export function drawGround(ctx, G, view) {
  ctx.fillStyle = PALETTE.asphalt;
  ctx.fillRect(view.left, view.top, view.right - view.left, view.bottom - view.top);
  for (const s of G.world.sea) {
    ctx.fillStyle = s.color;
    ctx.fillRect(s.x, s.y, s.w, s.h);
  }
}

// Dashed centre lines on every road, both directions.
export function drawRoads(ctx, G, view) {
  ctx.strokeStyle = PALETTE.asphaltLine;
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 30]);
  for (let i = 0; i <= GRID; i += 1) {
    const c = roadCenter(i);
    if (c >= view.top - 60 && c <= view.bottom + 60) {
      ctx.beginPath();
      ctx.moveTo(view.left, c);
      ctx.lineTo(view.right, c);
      ctx.stroke();
    }
    if (c >= view.left - 60 && c <= view.right + 60) {
      ctx.beginPath();
      ctx.moveTo(c, view.top);
      ctx.lineTo(c, view.bottom);
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);
}

// Each block: a sidewalk rim, then its own ground — lot, grass,
// sand or dock concrete — by kind.
export function drawBlocks(ctx, G, view) {
  for (const b of G.world.blocks) {
    if (b.x > view.right || b.x + b.w < view.left || b.y > view.bottom || b.y + b.h < view.top) continue;
    ctx.fillStyle = PALETTE.sidewalk;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    const inset = 14;
    if (b.kind === 'park') ctx.fillStyle = PALETTE.grass;
    else if (b.kind === 'beach') ctx.fillStyle = PALETTE.sand;
    else if (b.kind === 'docks') ctx.fillStyle = PALETTE.dockConcrete;
    else ctx.fillStyle = PALETTE.lot;
    ctx.fillRect(b.x + inset, b.y + inset, b.w - inset * 2, b.h - inset * 2);
    if (b.kind === 'park') {
      // Plaza paths crossing the park.
      ctx.fillStyle = '#b8a888';
      ctx.fillRect(b.x + b.w / 2 - 10, b.y + inset, 20, b.h - inset * 2);
      ctx.fillRect(b.x + inset, b.y + b.h / 2 - 10, b.w - inset * 2, 20);
    }
  }
}

// Shipping containers on the dock blocks.
export function drawContainers(ctx, G, view) {
  for (const c of G.world.containers) {
    if (c.x > view.right || c.x + c.w < view.left || c.y > view.bottom || c.y + c.h < view.top) continue;
    ctx.fillStyle = c.color;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 1; i < 5; i += 1) {
      ctx.fillRect(c.x + (c.w / 5) * i - 1, c.y + 4, 2, c.h - 8);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
  }
}

// Buildings: a roof slab, a darker rim, and a few lit windows.
export function drawBuildings(ctx, G, view) {
  for (const b of G.world.buildings) {
    if (b.x > view.right || b.x + b.w < view.left || b.y > view.bottom || b.y + b.h < view.top) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    ctx.fillStyle = 'rgba(255,255,220,0.5)';
    const cols = Math.max(1, Math.floor(b.w / 34));
    const rows = Math.max(1, Math.floor(b.h / 30));
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if ((r * 7 + c * 3 + b.floors) % 4 === 0) {
          ctx.fillRect(b.x + 10 + c * 34, b.y + 9 + r * 30, 12, 10);
        }
      }
    }
  }
}

// Trees: a trunk dot and a two-tone canopy.
export function drawTrees(ctx, G, view) {
  for (const t of G.world.trees) {
    if (t.x < view.left || t.x > view.right || t.y < view.top || t.y > view.bottom) continue;
    ctx.fillStyle = '#5a4632';
    ctx.beginPath();
    ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.treeDark;
    ctx.beginPath();
    ctx.arc(t.x - 2, t.y - 2, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.tree;
    ctx.beginPath();
    ctx.arc(t.x + 2, t.y - 3, t.r * 0.85, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Cash pickups: a green bundle with a dollar mark.
export function drawPickups(ctx, G, view) {
  for (const c of G.collectibles) {
    if (c.taken) continue;
    if (c.x < view.left || c.x > view.right || c.y < view.top || c.y > view.bottom) continue;
    const pulse = 1 + Math.sin(G.time * 4 + c.x) * 0.12;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = PALETTE.cash;
    roundRect(ctx, -11, -7, 22, 14, 3);
    ctx.fill();
    ctx.strokeStyle = '#1a5a24';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#eaffea';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 0.5);
    ctx.restore();
  }
}

// Every moving thing: cars, peds, cops, enemies, the player, bullets.
export function drawActors(ctx, G, view) {
  for (const car of G.cars) {
    if (car.x < view.left - 60 || car.x > view.right + 60 || car.y < view.top - 60 || car.y > view.bottom + 60) continue;
    drawCar(ctx, car);
  }
  for (const ped of G.peds) {
    if (ped.x < view.left || ped.x > view.right || ped.y < view.top || ped.y > view.bottom) continue;
    drawPed(ctx, ped);
  }
  for (const cop of G.cops) {
    drawCop(ctx, cop);
  }
  for (const e of G.enemies) {
    drawEnemy(ctx, e);
  }
  drawBullets(ctx, G);
  drawSparks(ctx, G);
  drawPlayer(ctx, G);
}

// One car: shadow, body, windshield, roof, headlights.
export function drawCar(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-19, -9, 40, 20);
  const len = car.kind === 'truck' ? 46 : 38;
  const wid = car.kind === 'truck' ? 20 : 17;
  ctx.fillStyle = car.color;
  roundRect(ctx, -len / 2, -wid / 2, len, wid, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,30,40,0.85)';
  ctx.fillRect(car.kind === 'truck' ? -4 : -2, -wid / 2 + 3, 12, wid - 6);
  if (car.kind === 'taxi') {
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TAXI', 0, 0);
  }
  if (car.state === 'police') {
    ctx.fillStyle = '#1a3f7a';
    ctx.fillRect(-len / 2 + 4, -wid / 2 + 2, 8, wid - 4);
    ctx.fillStyle = '#c23a3a';
    ctx.beginPath();
    ctx.arc(-2, -wid / 2 + 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a6ac2';
    ctx.beginPath();
    ctx.arc(-2, wid / 2 - 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffe98a';
  ctx.fillRect(len / 2 - 2, -wid / 2 + 2, 3, 4);
  ctx.fillRect(len / 2 - 2, wid / 2 - 6, 3, 4);
  ctx.restore();
}

// One pedestrian: a bobbing dot with a coloured shirt.
export function drawPed(ctx, ped) {
  const bob = Math.sin(ped.bob) * 1.5;
  ctx.save();
  ctx.translate(ped.x, ped.y + bob * 0.4);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ped.color;
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8c8a0';
  ctx.beginPath();
  ctx.arc(Math.cos(ped.angle) * 3, Math.sin(ped.angle) * 3, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// A foot cop: navy body, cap, and a badge dot.
export function drawCop(ctx, cop) {
  ctx.save();
  ctx.translate(cop.x, cop.y);
  ctx.fillStyle = PALETTE.copDark;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.cop;
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd23a';
  ctx.beginPath();
  ctx.arc(Math.cos(cop.angle) * 4, Math.sin(cop.angle) * 4, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// A gang member: red, with a gun barrel in the aim direction.
export function drawEnemy(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 5, 8, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.enemyDark;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.enemy;
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(Math.cos(e.angle) * 6, Math.sin(e.angle) * 6);
  ctx.lineTo(Math.cos(e.angle) * 16, Math.sin(e.angle) * 16);
  ctx.stroke();
  // Health pips above the head.
  ctx.fillStyle = '#ff5a5a';
  for (let i = 0; i < e.health; i += 1) {
    ctx.fillRect(-9 + i * 7, -18, 5, 3);
  }
  ctx.restore();
}

// Bullets as short bright streaks.
export function drawBullets(ctx, G) {
  ctx.strokeStyle = '#ffe98a';
  ctx.lineWidth = 2.5;
  for (const b of G.bullets) {
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.014, b.y - b.vy * 0.014);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

// Impact sparks fading out.
export function drawSparks(ctx, G) {
  for (const s of G.sparks) {
    const a = 1 - s.t / s.life;
    ctx.fillStyle = s.color;
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 3 + (1 - a) * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// The player: a gold dot with a direction tick, or nothing when driving
// (the car already shows where they are).
export function drawPlayer(ctx, G) {
  if (G.playerCar) return;
  const p = G.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 5, 8, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.playerDark;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(Math.cos(p.angle) * 7, Math.sin(p.angle) * 7);
  ctx.lineTo(Math.cos(p.angle) * 14, Math.sin(p.angle) * 14);
  ctx.stroke();
  ctx.restore();
}

// Mission target, fare pickup and destination markers.
export function drawMarkers(ctx, G, view) {
  const target = G.mission ? G.mission.target : null;
  if (target) drawDiamond(ctx, target.x, target.y, '#ffd23a', 'MISSION');
  if (G.fare) {
    if (G.fare.state === 'toPickup' && G.fare.pickup) drawDiamond(ctx, G.fare.pickup.x, G.fare.pickup.y, '#4ac25a', 'FARE');
    else if (G.fare.state === 'toDest' && G.fare.dest) drawDiamond(ctx, G.fare.dest.x, G.fare.dest.y, '#4ac25a', 'DROP');
  }
}

export function drawDiamond(ctx, x, y, color, label) {
  const bob = Math.sin(Date.now() / 300) * 4;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(11, 0);
  ctx.lineTo(0, 16);
  ctx.lineTo(-11, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label === 'MISSION' ? '!' : '$', 0, 0);
  ctx.restore();
}

// A rounded-rectangle path helper shared by the car and pickup drawing.
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
