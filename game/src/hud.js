// HUD, minimap, dialogue and menus for Solmar Bay. Everything is drawn on
// the same canvas as the world, so screenshots show exactly what the player
// sees: health, money, wanted stars, clock, radio, minimap, objective and
// the off-screen marker arrow.

import { WORLD_W, WORLD_H, streetPos, N } from './config.js';
import { starsFor } from './police.js';
import { missionMarker, missionObjective } from './missions.js';

function starShape(ctx, x, y, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    const a2 = a + Math.PI / 5;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.lineTo(x + Math.cos(a2) * r * 0.45, y + Math.sin(a2) * r * 0.45);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? '#ffd23f' : 'rgba(20,20,20,0.55)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function bar(ctx, x, y, w, h, frac, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(x, y, w, h);
}

export function drawHUD(ctx, G, W, H) {
  const p = G.player;
  ctx.textBaseline = 'alphabetic';
  // Top-left: money, health, progress.
  panel(ctx, 14, 14, 250, 64);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`$${p.money.toLocaleString('en-US')}`, 26, 40);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#cfe3ff';
  ctx.fillText('HEALTH', 26, 60);
  bar(ctx, 84, 50, 160, 12, p.health / 100, p.health > 30 ? '#37c978' : '#e23b3b');
  ctx.fillStyle = '#cfe3ff';
  ctx.fillText(`Missions ${G.missionsDone.filter(Boolean).length}/5   Packages ${G.collectibles.filter((c) => c.taken).length}/10`, 26, 72);

  // Top-right: wanted stars, clock, radio station.
  const stars = starsFor(G.wanted);
  for (let i = 0; i < 5; i++) starShape(ctx, W - 150 + i * 30, 34, 13, i < stars);
  const hh = Math.floor(G.clockMinutes / 60) % 24;
  const mm = Math.floor(G.clockMinutes % 60);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, W - 16, 62);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#ffd98a';
  ctx.fillText(`♪ ${G.station}`, W - 16, 80);
  ctx.textAlign = 'left';

  // Bottom-left: minimap.
  drawMinimap(ctx, G, 16, H - 206, 190);

  // Bottom-right: controls hint, then speed.
  ctx.font = '11px system-ui, sans-serif';
  const hint = 'WASD move/drive · E car · F punch · Click shoot · Esc pause';
  const hw = ctx.measureText(hint).width;
  panel(ctx, W - hw - 34, H - 96, hw + 20, 20);
  ctx.fillStyle = '#cfe3ff';
  ctx.textAlign = 'right';
  ctx.fillText(hint, W - 24, H - 82);
  panel(ctx, W - 216, H - 64, 202, 50);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(G.playerCar ? `${Math.round(Math.abs(G.playerCar.speed) * 0.24)} MPH` : 'ON FOOT', W - 26, H - 34);
  ctx.textAlign = 'left';

  // Objective line, bottom-centre.
  const obj = missionObjective(G);
  ctx.font = 'bold 15px system-ui, sans-serif';
  const ow = ctx.measureText(obj).width;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(W / 2 - ow / 2 - 12, H - 52, ow + 24, 28);
  ctx.fillStyle = '#ffe27a';
  ctx.textAlign = 'center';
  ctx.fillText(obj, W / 2, H - 32);
  ctx.textAlign = 'left';

  // Dialogue subtitles.
  if (G.dialogue) {
    const d = G.dialogue;
    const alpha = Math.min(1, d.t * 4, Math.max(0, (d.dur - d.t) * 2));
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 13px system-ui, sans-serif';
    const tw = ctx.measureText(d.text).width;
    const bw = Math.min(W - 40, tw + 90);
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(W / 2 - bw / 2, H - 132, bw, 46);
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(d.speaker, W / 2 - bw / 2 + 14, H - 114);
    ctx.fillStyle = '#fff';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(d.text, W / 2 - bw / 2 + 14, H - 96);
    ctx.globalAlpha = 1;
  }

  // Centre flash (mission passed, fare complete...).
  if (G.flash) {
    ctx.globalAlpha = Math.min(1, G.flash.t);
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(G.flash.text, W / 2 + 2, H / 2 - 98);
    ctx.fillStyle = '#ffe27a';
    ctx.fillText(G.flash.text, W / 2, H / 2 - 100);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  // Off-screen mission marker arrow (or the fare marker).
  const mk = missionMarker(G)
    || (G.fare ? (G.fare.state === 'pickup'
      ? { x: G.fare.ped.x, y: G.fare.ped.y, label: 'Pick up the fare' }
      : { x: G.fare.dest.x, y: G.fare.dest.y, label: 'Drop off the fare' }) : null);
  if (mk) drawMarkerArrow(ctx, G, W, H, mk);

  // Red pulse when the heat is on.
  if (stars >= 3) {
    const pulse = 0.10 + 0.06 * Math.sin(G.time * 5);
    ctx.fillStyle = `rgba(200,30,30,${pulse})`;
    ctx.fillRect(0, 0, W, 10);
    ctx.fillRect(0, H - 10, W, 10);
    ctx.fillRect(0, 0, 10, H);
    ctx.fillRect(W - 10, 0, 10, H);
  }
}

function drawMarkerArrow(ctx, G, W, H, mk) {
  const cam = G.camera;
  const sx = (mk.x - cam.x) * cam.zoom + W / 2;
  const sy = (mk.y - cam.y) * cam.zoom + H / 2;
  const dist = Math.hypot(mk.x - G.player.x, mk.y - G.player.y);
  if (sx > 40 && sx < W - 40 && sy > 40 && sy < H - 40) {
    // On screen: a bouncing diamond over the target.
    const bob = Math.sin(G.time * 4) * 6;
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(sx, sy - 26 + bob);
    ctx.lineTo(sx + 10, sy - 12 + bob);
    ctx.lineTo(sx, sy + 2 + bob);
    ctx.lineTo(sx - 10, sy - 12 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.stroke();
    return;
  }
  // Off screen: an arrow on the edge pointing at it.
  const cx = W / 2;
  const cy = H / 2;
  const ang = Math.atan2(sy - cy, sx - cx);
  const ex = cx + Math.cos(ang) * (Math.min(W, H) / 2 - 60);
  const ey = cy + Math.sin(ang) * (Math.min(W, H) / 2 - 60);
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(ang);
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-10, -11);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-10, 11);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillStyle = '#ffd23f';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(dist / 4)}m`, ex, ey + 28);
  ctx.textAlign = 'left';
}

function drawMinimap(ctx, G, x, y, size) {
  const s = size / WORLD_W;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x - 4, y - 4, size + 8, size + 8);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.clip();
  // Water, sand, land.
  ctx.fillStyle = '#245a75';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = '#d9b380';
  ctx.fillRect(x, y + (3150 * s), size, size - 3150 * s);
  ctx.fillStyle = '#5d8a4a';
  ctx.fillRect(x, y, size, 3150 * s);
  // Roads.
  ctx.strokeStyle = '#3b4048';
  ctx.lineWidth = Math.max(1.5, 70 * s);
  for (let i = 0; i <= N; i++) {
    const c = streetPos(i) * s;
    ctx.beginPath(); ctx.moveTo(x, y + c); ctx.lineTo(x + size, y + c); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + c, y); ctx.lineTo(x + c, y + size); ctx.stroke();
  }
  // Buildings.
  ctx.fillStyle = 'rgba(30,30,40,0.75)';
  for (const b of G.world.buildings) {
    ctx.fillRect(x + b.x * s, y + b.y * s, Math.max(1, b.w * s), Math.max(1, b.h * s));
  }
  const dot = (wx, wy, color, r = 3) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + wx * s, y + wy * s, r, 0, Math.PI * 2);
    ctx.fill();
  };
  for (const c of G.collectibles) if (!c.taken) dot(c.x, c.y, '#37c978', 2);
  for (const e of G.enemies) if (e.hp > 0) dot(e.x, e.y, '#e23b3b', 3);
  for (const c of G.policeCars) dot(c.x, c.y, '#3d7dd9', 3);
  const mk = missionMarker(G);
  if (mk) dot(mk.x, mk.y, '#ffd23f', 3 + Math.sin(G.time * 5) * 1.5);
  if (G.fare) {
    dot(G.fare.state === 'pickup' ? G.fare.ped.x : G.fare.dest.x, G.fare.state === 'pickup' ? G.fare.ped.y : G.fare.dest.y, '#37c978', 3);
  }
  // Player arrow.
  const px = x + G.player.x * s;
  const py = y + G.player.y * s;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(G.player.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 4, y - 4, size + 8, size + 8);
}

// ---- Screens ---------------------------------------------------------------

function menuList(ctx, items, selected, cx, y0, step = 44) {
  items.forEach((label, i) => {
    const y = y0 + i * step;
    if (selected === i) {
      ctx.fillStyle = 'rgba(255,210,63,0.9)';
      ctx.fillRect(cx - 170, y - 24, 340, 34);
      ctx.fillStyle = '#111';
    } else {
      ctx.fillStyle = '#fff';
    }
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(label, cx, y);
  });
}

export function drawTitle(ctx, G, W, H, selected) {
  ctx.fillStyle = 'rgba(10,12,24,0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 84px system-ui, sans-serif';
  ctx.fillText('SOLMAR BAY', W / 2, H / 2 - 120);
  ctx.fillStyle = '#fff';
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText('An open-world crime story — in the spirit of GTA 6', W / 2, H / 2 - 82);
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = '#cfe3ff';
  ctx.fillText('Steal cars. Outrun the law. Run five jobs. Own the city.', W / 2, H / 2 - 54);
  const items = ['NEW GAME', G.hasSave ? 'CONTINUE' : null, 'HOW TO PLAY'].filter(Boolean);
  menuList(ctx, items, selected, W / 2, H / 2 + 10);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('WASD move / drive · E enter & steal cars · F punch · Mouse aim, click to shoot', W / 2, H - 64);
  ctx.fillText('Esc pause · M mute · P save · A fictional city. No real people, places or brands.', W / 2, H - 42);
  ctx.textAlign = 'left';
}

export function drawHowTo(ctx, G, W, H) {
  ctx.fillStyle = 'rgba(10,12,24,0.8)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillText('HOW TO PLAY', W / 2, 120);
  ctx.fillStyle = '#fff';
  ctx.font = '17px system-ui, sans-serif';
  const lines = [
    'Move on foot with WASD or arrows. Hold Shift to run.',
    'Walk up to any car and press E to get in. If someone is driving it, you steal it — and the law notices.',
    'Drive with W to accelerate, S to brake and reverse, A / D to steer.',
    'Crimes raise your wanted stars. Police cars ram you; foot cops arrest you. Lay low and the heat fades.',
    'Aim with the mouse and click to shoot. Press F to punch.',
    'Follow the yellow marker: five story missions, from a first fare to the big bank job.',
    'Taxi fares appear while you drive. Hidden packages pay $50 each. Your progress saves automatically.',
  ];
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 180 + i * 38));
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText('Press Esc to go back', W / 2, H - 80);
  ctx.textAlign = 'left';
}

export function drawPause(ctx, G, W, H, selected) {
  ctx.fillStyle = 'rgba(8,10,20,0.65)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.fillText('PAUSED', W / 2, H / 2 - 90);
  const items = ['RESUME', 'SAVE GAME', 'RESTART MISSION', 'QUIT TO TITLE'];
  menuList(ctx, items, selected, W / 2, H / 2 - 30, 42);
  ctx.fillStyle = '#cfe3ff';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(`Money $${G.player.money} · Missions ${G.missionsDone.filter(Boolean).length}/5 · Wanted ${starsFor(G.wanted)}★`, W / 2, H / 2 + 160);
  ctx.textAlign = 'left';
}

export function drawEnd(ctx, G, W, H, kind) {
  ctx.fillStyle = 'rgba(10,10,14,0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = kind === 'wasted' ? '#e23b3b' : '#3d7dd9';
  ctx.font = 'bold 72px system-ui, sans-serif';
  ctx.fillText(kind === 'wasted' ? 'WASTED' : 'BUSTED', W / 2, H / 2 - 20);
  ctx.fillStyle = '#fff';
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText(
    kind === 'wasted'
      ? 'The crew picked you up at St. Marina. The job is still waiting.'
      : 'Solmar PD let you go with a warning and a lighter wallet.',
    W / 2, H / 2 + 24,
  );
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText('Press ENTER to get back out there', W / 2, H / 2 + 70);
  ctx.textAlign = 'left';
}

export function drawStoryComplete(ctx, G, W, H) {
  ctx.fillStyle = 'rgba(10,12,24,0.6)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.fillText('THE BIG ONE — DONE', W / 2, H / 2 - 60);
  ctx.fillStyle = '#fff';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Five jobs. One clean getaway. Solmar Bay is yours, Danny.', W / 2, H / 2 - 16);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = '#cfe3ff';
  ctx.fillText(`Final take: $${G.player.money.toLocaleString('en-US')} · Packages ${G.collectibles.filter((c) => c.taken).length}/10`, W / 2, H / 2 + 22);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText('Press ENTER to keep playing — free roam', W / 2, H / 2 + 66);
  ctx.textAlign = 'left';
}
