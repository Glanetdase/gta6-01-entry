// World rendering for Solmar Bay: sunset top-down city with long shadows,
// roof detail, road markings, beach and water, traffic, pedestrians, police
// and the player. Everything is drawn from the game state, so a screenshot
// is always a true frame of play.

import { WORLD_W, WORLD_H, BEACH_Y, WATER_Y, BLOCK, N, ROAD, PALETTE, streetPos, blockRect } from './config.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
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

  // Ground: grass, then sand and water along the south edge.
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

  // Roads: asphalt strips, centre dashes and crosswalks.
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
      if (!inView(cx, cy, 1, 1)) continue;
      for (let k = -2; k <= 2; k++) {
        ctx.fillRect(cx - 26 + k * 11, cy - ROAD / 2 + 4, 6, 12);
        ctx.fillRect(cx - 26 + k * 11, cy + ROAD / 2 - 16, 6, 12);
      }
    }
  }

  // Blocks: sidewalks, parks, lots.
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

  // Dock containers.
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

  // Buildings: long sunset shadows, coloured body, roof and details.
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

  // Trees.
  for (const t of G.world.trees) {
    if (!inView(t.x - 20, t.y - 20, 40, 40)) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(t.x + 4, t.y + 5, t.r, t.r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = t.color;
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.arc(t.x - t.r * 0.3, t.y - t.r * 0.3, t.r * 0.45, 0, Math.PI * 2); ctx.fill();
  }

  // Hidden packages: glowing green cases.
  for (const c of G.collectibles) {
    if (c.taken || !inView(c.x - 30, c.y - 30, 60, 60)) continue;
    const pulse = 0.6 + Math.sin(G.time * 4) * 0.3;
    ctx.fillStyle = `rgba(55,201,120,${pulse})`;
    ctx.beginPath(); ctx.arc(c.x, c.y, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1d7a44';
    rr(ctx, c.x - 8, c.y - 6, 16, 12, 3);
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
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a6d1f';
      rr(ctx, pt.x - 9, pt.y - 7, 18, 14, 3);
      ctx.fill();
    }
  }

  // Cars, pedestrians, cops, enemies, player, bullets, sparks.
  for (const car of G.cars) if (inView(car.x - 40, car.y - 40, 80, 80)) drawCar(ctx, car, G.time);
  for (const ped of G.peds) if (inView(ped.x - 30, ped.y - 30, 60, 60)) drawPed(ctx, ped, G.time);
  for (const cop of G.cops) if (inView(cop.x - 30, cop.y - 30, 60, 60)) drawCop(ctx, cop, G.time);
  for (const e of G.enemies) if (e.hp > 0 && inView(e.x - 30, e.y - 30, 60, 60)) drawEnemy(ctx, e, G.time);
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
    ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawCar(ctx, car, t) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  rr(ctx, -17, -8, 36, 20, 6);
  ctx.fill();
  ctx.fillStyle = car.color;
  rr(ctx, -18, -9, 36, 18, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,30,50,0.85)';
  rr(ctx, -6, -7, 12, 14, 3);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  rr(ctx, -14, -7, 5, 14, 2);
  ctx.fill();
  if (car.kind === 'police') {
    ctx.fillStyle = '#fff';
    ctx.fillRect(-4, -9, 10, 18);
    ctx.fillStyle = '#1f3a93';
    ctx.fillRect(-4, -9, 10, 4);
    const flash = Math.sin(t * 10) > 0 ? '#ff2d2d' : '#2d7bff';
    ctx.fillStyle = flash;
    ctx.beginPath(); ctx.arc(2, -5, 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = Math.sin(t * 10) > 0 ? '#2d7bff' : '#ff2d2d';
    ctx.beginPath(); ctx.arc(2, 5, 3.4, 0, Math.PI * 2); ctx.fill();
  }
  if (car.kind === 'taxi') {
    ctx.fillStyle = '#111';
    for (let k = 0; k < 4; k++) ctx.fillRect(-12 + k * 6, -9, 3, 3);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(-2, -11, 8, 3);
  }
  // Headlights.
  ctx.fillStyle = 'rgba(255,240,170,0.9)';
  ctx.beginPath(); ctx.arc(18, -6, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(18, 6, 2.2, 0, Math.PI * 2); ctx.fill();
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
    ctx.beginPath(); ctx.arc(10, 0, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }
  const bob = Math.sin(ped.stepPhase) * 1.5;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(2, 3, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = ped.color;
  ctx.beginPath(); ctx.arc(0, bob * 0.4, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath(); ctx.arc(Math.cos(ped.angle) * 3, Math.sin(ped.angle) * 3 + bob * 0.4, 4.5, 0, Math.PI * 2); ctx.fill();
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
  ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath(); ctx.arc(Math.cos(cop.angle) * 3, Math.sin(cop.angle) * 3, 4.5, 0, Math.PI * 2); ctx.fill();
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
  ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath(); ctx.arc(Math.cos(e.angle) * 3, Math.sin(e.angle) * 3, 5, 0, Math.PI * 2); ctx.fill();
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
  ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath(); ctx.arc(3, 0, 5, 0, Math.PI * 2); ctx.fill();
  // Pistol in hand, pointing where the player aims.
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(19, 0);
  ctx.stroke();
  ctx.restore();
}
