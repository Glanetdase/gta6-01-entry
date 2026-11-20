// World rendering for Solmar Bay: sunset top-down city with long shadows,
// roof detail, road markings, beach and water, traffic, pedestrians, police
// and the player. Everything is drawn from the game state, so a screenshot
// is always a true frame of play.

import { WORLD_W, WORLD_H, BEACH_Y, WATER_Y, BLOCK, N, ROAD, PALETTE, streetPos, blockRect } from './config.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function disc(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

export function drawWorld(ctx, G, W, H) {
  const cam = G.camera;
  const zoom = cam.zoom;
  const shakeX = (Math.random() * 2 - 1) * (G.shake || 0);
  const shakeY = (Math.random() * 2 - 1) * (G.shake || 0);
  ctx.save();
  ctx.translate(W / 2 - (cam.x + shakeX) * zoom, H / 2 - (cam.y + shakeY) * zoom);
  ctx.scale(zoom, zoom);

  const vx0 = cam.x - W / 2 / zoom - 80;
  const vy0 = cam.y - H / 2 / zoom - 80;
  const vx1 = cam.x + W / 2 / zoom + 80;
  const vy1 = cam.y + H / 2 / zoom + 80;
  const inView = (x, y, w, h) => x + w > vx0 && x < vx1 && y + h > vy0 && y < vy1;

  drawGround(ctx, G, vx0, vy0, vx1, vy1);
  drawRoads(ctx, vx0, vy0, vx1, vy1);
  drawBlocks(ctx, G, inView);
  drawContainers(ctx, G, inView);
  drawBuildings(ctx, G, inView);
  drawTrees(ctx, G, inView);
  drawPickups(ctx, G, inView);
  drawActors(ctx, G, inView);
  ctx.restore();
}

function drawGround(ctx, G, vx0, vy0, vx1, vy1) {
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(vx0, BEACH_Y, vx1 - vx0, WATER_Y - BEACH_Y);
  const wave = Math.sin(G.time * 1.4) * 4;
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(vx0, WATER_Y + wave * 0.4, vx1 - vx0, WORLD_H - WATER_Y);
  ctx.fillStyle = PALETTE.waterDeep;
  ctx.fillRect(vx0, WATER_Y + 60 + wave * 0.4, vx1 - vx0, WORLD_H - WATER_Y - 60);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 3;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    for (let x = vx0; x <= vx1; x += 60) {
      const y = WATER_Y + 14 + k * 26 + Math.sin(x * 0.01 + G.time * 1.6 + k * 2) * 4;
      if (x === vx0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function drawRoads(ctx, vx0, vy0, vx1, vy1) {
  ctx.fillStyle = PALETTE.road;
  for (let i = 0; i <= N; i++) {
    const s = streetPos(i);
    ctx.fillRect(vx0, s - ROAD / 2, vx1 - vx0, ROAD);
    ctx.fillRect(s - ROAD / 2, vy0, ROAD, vy1 - vy0);
  }
  ctx.strokeStyle = PALETTE.roadLine;
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 30]);
  for (let i = 0; i <= N; i++) {
    const s = streetPos(i);
    ctx.beginPath(); ctx.moveTo(vx0, s); ctx.lineTo(vx1, s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s, vy0); ctx.lineTo(s, vy1); ctx.stroke();
  }
  ctx.setLineDash([]);
  // Crosswalks at intersections.
  ctx.fillStyle = PALETTE.crosswalk;
  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) {
      const cx = streetPos(i);
      const cy = streetPos(j);
      if (cx < vx0 || cx > vx1 || cy < vy0 || cy > vy1) continue;
      for (let k = -2; k <= 2; k++) {
        ctx.fillRect(cx - 26 + k * 11, cy - ROAD / 2 + 4, 6, 12);
        ctx.fillRect(cx - 26 + k * 11, cy + ROAD / 2 - 16, 6, 12);
      }
    }
  }
}

function drawBlocks(ctx, G, inView) {
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const b = blockRect(i, j);
      if (!inView(b.x, b.y, b.w, b.h)) continue;
      ctx.fillStyle = PALETTE.sidewalk;
      ctx.fillRect(b.x - 8, b.y - 8, b.w + 16, b.h + 16);
      ctx.fillStyle = PALETTE.grass;
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
  }
  for (const pk of G.world.parks) {
    if (!inView(pk.x, pk.y, pk.w, pk.h)) continue;
    ctx.fillStyle = PALETTE.grassDark;
    ctx.fillRect(pk.x, pk.y, pk.w, pk.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(pk.x + 20, pk.y + pk.h / 2);
    ctx.lineTo(pk.x + pk.w - 20, pk.y + pk.h / 2);
    ctx.stroke();
  }
  for (const lot of G.world.lots) {
    if (!inView(lot.x, lot.y, lot.w, lot.h)) continue;
    ctx.fillStyle = '#4a4f58';
    ctx.fillRect(lot.x, lot.y, lot.w, lot.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) {
      ctx.strokeRect(lot.x + 18 + k * 46, lot.y + 18, 38, 60);
      ctx.strokeRect(lot.x + 18 + k * 46, lot.y + lot.h - 78, 38, 60);
    }
  }
}

function drawContainers(ctx, G, inView) {
  for (const c of G.world.containers) {
    if (!inView(c.x, c.y, c.w, c.h)) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(c.x + 4, c.y + 5, c.w, c.h);
    ctx.fillStyle = c.color;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    for (let k = 1; k < 4; k++) {
      ctx.beginPath(); ctx.moveTo(c.x + (c.w / 4) * k, c.y); ctx.lineTo(c.x + (c.w / 4) * k, c.y + c.h); ctx.stroke();
    }
  }
}

function drawBuildings(ctx, G, inView) {
  for (const b of G.world.buildings) {
    if (!inView(b.x - 40, b.y - 40, b.w + 80, b.h + 80)) continue;
    const sh = b.hgt * 0.35;
    ctx.fillStyle = 'rgba(20,16,30,0.28)';
    ctx.fillRect(b.x + sh * 0.5, b.y + sh * 0.6, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + b.w * 0.12, b.y + b.h * 0.12, b.w * 0.76, b.h * 0.76);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(b.x + b.w * 0.2, b.y + b.h * 0.2, b.w * 0.18, b.h * 0.18);
    ctx.fillRect(b.x + b.w * 0.62, b.y + b.h * 0.58, b.w * 0.16, b.h * 0.16);
    if (b.landmark) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.landmark.toUpperCase(), b.x + b.w / 2, b.y + b.h / 2 + 4);
      ctx.textAlign = 'left';
    }
  }
}

function drawTrees(ctx, G, inView) {
  for (const t of G.world.trees) {
    if (!inView(t.x - 20, t.y - 20, 40, 40)) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(t.x + 4, t.y + 5, t.r, t.r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = t.color;
    disc(ctx, t.x, t.y, t.r);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    disc(ctx, t.x - t.r * 0.3, t.y - t.r * 0.3, t.r * 0.45);
    ctx.fill();
  }
}

function drawPickups(ctx, G, inView) {
  // Hidden packages: glowing green cases.
  for (const c of G.collectibles) {
    if (c.taken || !inView(c.x - 30, c.y - 30, 60, 60)) continue;
    const pulse = 0.6 + Math.sin(G.time * 4) * 0.3;
    ctx.fillStyle = `rgba(55,201,120,${pulse})`;
    disc(ctx, c.x, c.y, 14);
    ctx.fill();
    ctx.fillStyle = '#1d7a44';
    roundRect(ctx, c.x - 8, c.y - 6, 16, 12, 3);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(c.x - 8, c.y - 2, 16, 3);
  }
  // Mission parcels.
  const m = G.mission;
  if (m && m.def.steps[m.step] && m.def.steps[m.step].type === 'packages') {
    for (const pt of m.def.steps[m.step].points) {
      const key = 'pkg_' + pt.x + '_' + pt.y;
      if (m.stepState[key]) continue;
      const pulse = 0.6 + Math.sin(G.time * 4) * 0.3;
      ctx.fillStyle = `rgba(255,210,63,${pulse})`;
      disc(ctx, pt.x, pt.y, 16);
      ctx.fill();
      ctx.fillStyle = '#8a6d1f';
      roundRect(ctx, pt.x - 9, pt.y - 7, 18, 14, 3);
      ctx.fill();
    }
  }
}

function drawActors(ctx, G, inView) {
  for (const car of G.cars) if (inView(car.x - 40, car.y - 40, 80, 80)) drawCar(ctx, car, G.time);
  for (const ped of G.peds) if (inView(ped.x - 30, ped.y - 30, 60, 60)) drawPed(ctx, ped);
  for (const cop of G.cops) if (inView(cop.x - 30, cop.y - 30, 60, 60)) drawCop(ctx, cop);
  for (const e of G.enemies) if (e.hp > 0 && inView(e.x - 30, e.y - 30, 60, 60)) drawEnemy(ctx, e);
  drawPlayer(ctx, G);
  ctx.strokeStyle = '#ffe27a';
  ctx.lineWidth = 3;
  for (const b of G.bullets) {
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.014, b.y - b.vy * 0.014);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (const s of G.sparks) {
    ctx.fillStyle = '#ffd23f';
    disc(ctx, s.x, s.y, 4);
    ctx.fill();
  }
}

function drawCar(ctx, car, t) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  roundRect(ctx, -17, -8, 36, 20, 6);
  ctx.fill();
  ctx.fillStyle = car.color;
  roundRect(ctx, -18, -9, 36, 18, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,30,50,0.85)';
  roundRect(ctx, -6, -7, 12, 14, 3);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, -14, -7, 5, 14, 2);
  ctx.fill();
  if (car.kind === 'police') {
    ctx.fillStyle = '#fff';
    ctx.fillRect(-4, -9, 10, 18);
    ctx.fillStyle = '#1f3a93';
    ctx.fillRect(-4, -9, 10, 4);
    const flash = Math.sin(t * 10) > 0;
    ctx.fillStyle = flash ? '#ff2d2d' : '#2d7bff';
    disc(ctx, 2, -5, 3.4);
    ctx.fill();
    ctx.fillStyle = flash ? '#2d7bff' : '#ff2d2d';
    disc(ctx, 2, 5, 3.4);
    ctx.fill();
  }
  if (car.kind === 'taxi') {
    ctx.fillStyle = '#111';
    for (let k = 0; k < 4; k++) ctx.fillRect(-12 + k * 6, -9, 3, 3);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(-2, -11, 8, 3);
  }
  // Headlights.
  ctx.fillStyle = 'rgba(255,240,170,0.9)';
  disc(ctx, 18, -6, 2.2);
  ctx.fill();
  disc(ctx, 18, 6, 2.2);
  ctx.fill();
  ctx.restore();
}

function drawPed(ctx, ped) {
  ctx.save();
  ctx.translate(ped.x, ped.y);
  if (ped.dead) {
    ctx.rotate(ped.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 0, 16, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ped.color;
    ctx.beginPath(); ctx.ellipse(0, 0, 13, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c0392b';
    disc(ctx, 10, 0, 3);
    ctx.fill();
    ctx.restore();
    return;
  }
  const bob = Math.sin(ped.stepPhase) * 1.5;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(2, 3, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = ped.color;
  disc(ctx, 0, bob * 0.4, 9);
  ctx.fill();
  ctx.fillStyle = '#e8b98a';
  disc(ctx, Math.cos(ped.angle) * 3, Math.sin(ped.angle) * 3 + bob * 0.4, 4.5);
  ctx.fill();
  if (ped.taxiWait) {
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAXI?', 0, -18 + Math.sin(performance.now() / 300) * 2);
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

function drawCop(ctx, cop) {
  ctx.save();
  ctx.translate(cop.x, cop.y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(2, 3, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1f3a93';
  disc(ctx, 0, 0, 9);
  ctx.fill();
  ctx.fillStyle = '#e8b98a';
  disc(ctx, Math.cos(cop.angle) * 3, Math.sin(cop.angle) * 3, 4.5);
  ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(-6, -2, 12, 3);
  ctx.restore();
}

function drawEnemy(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(2, 3, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5c2d2d';
  disc(ctx, 0, 0, 10);
  ctx.fill();
  ctx.fillStyle = '#e8b98a';
  disc(ctx, Math.cos(e.angle) * 3, Math.sin(e.angle) * 3, 5);
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(Math.cos(e.angle) * 8, Math.sin(e.angle) * 8);
  ctx.lineTo(Math.cos(e.angle) * 18, Math.sin(e.angle) * 18);
  ctx.stroke();
  // Health bar.
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(-12, -20, 24, 4);
  ctx.fillStyle = '#e23b3b';
  ctx.fillRect(-12, -20, 24 * (e.hp / 100), 4);
  ctx.restore();
}

function drawPlayer(ctx, G) {
  const p = G.player;
  if (G.playerCar) return; // the car is drawn in the car pass
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(2, 4, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0f766e';
  disc(ctx, 0, 0, 10);
  ctx.fill();
  ctx.fillStyle = '#e8b98a';
  disc(ctx, 3, 0, 5);
  ctx.fill();
  // Pistol in hand, pointing where the player aims.
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(19, 0);
  ctx.stroke();
  ctx.restore();
}
