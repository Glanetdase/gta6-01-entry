// Solmar Bay — the HUD and every menu screen: wanted stars, money,
// health, the mission objective, the minimap, the clock and radio,
// dialogue, and the title / how-to / pause / busted / wasted /
// story-complete screens. All drawn in canvas, no DOM.

import { WORLD_W, PALETTE, STATIONS } from './config.js';
import { missionObjective } from './missions.js';
import { roadCenter } from './world.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.hudBg;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function text(ctx, s, x, y, size, color, align, bold) {
  ctx.fillStyle = color || PALETTE.hudText;
  ctx.font = `${bold ? 'bold ' : ''}${size}px sans-serif`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(s, x, y);
}

// The in-game HUD: stars, money, health, objective, minimap, clock.
export function drawHUD(ctx, G, viewW, viewH) {
  drawStars(ctx, G);
  drawMoney(ctx, G);
  drawHealth(ctx, G);
  drawObjective(ctx, G, viewW);
  drawMinimap(ctx, G, viewW);
  drawClock(ctx, G, viewW, viewH);
  drawSpeed(ctx, G, viewH);
  drawDialogue(ctx, G, viewW, viewH);
  drawFareTimer(ctx, G, viewW);
}

export function drawStars(ctx, G) {
  panel(ctx, 12, 12, 150, 42);
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < G.stars ? PALETTE.gold : 'rgba(255,255,255,0.25)';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('★', 20 + i * 26, 15);
  }
  // The heat bar: how hot the wanted level is (0–100). It drains as
  // the heat decays, so the player can see the stars about to drop.
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(20, 42, 110, 4);
  ctx.fillStyle = G.wanted > 60 ? '#c23a3a' : G.wanted > 20 ? '#e8a23a' : '#4ac25a';
  ctx.fillRect(20, 42, 110 * Math.max(0, Math.min(1, G.wanted / 100)), 4);
}

export function drawMoney(ctx, G) {
  panel(ctx, 12, 60, 150, 30);
  text(ctx, `$${G.player.money}`, 20, 66, 18, PALETTE.hudText, 'left', true);
  text(ctx, 'CASH', 118, 68, 11, PALETTE.hudDim, 'left', true);
}

export function drawHealth(ctx, G) {
  panel(ctx, 12, 96, 150, 30);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(20, 106, 110, 10);
  const hp = Math.max(0, G.player.health) / 100;
  ctx.fillStyle = hp > 0.5 ? '#4ac25a' : hp > 0.25 ? '#e8a23a' : '#c23a3a';
  ctx.fillRect(20, 106, 110 * hp, 10);
  text(ctx, 'HP', 134, 104, 11, PALETTE.hudDim, 'left', true);
}

export function drawObjective(ctx, G, viewW) {
  const obj = missionObjective(G);
  const name = G.mission ? G.mission.def.name : null;
  if (!obj && !name) return;
  const w = 340;
  panel(ctx, viewW / 2 - w / 2, 12, w, name ? 52 : 30);
  if (name) text(ctx, name.toUpperCase(), viewW / 2, 17, 13, PALETTE.gold, 'center', true);
  if (obj) text(ctx, obj, viewW / 2, name ? 36 : 17, 14, PALETTE.hudText, 'center', false);
}

export function drawMinimap(ctx, G, viewW) {
  const size = 150;
  const x0 = viewW - size - 12;
  const y0 = 12;
  const scale = size / WORLD_W;
  panel(ctx, x0 - 4, y0 - 4, size + 8, size + 8);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, size, size);
  ctx.clip();
  ctx.fillStyle = '#22262b';
  ctx.fillRect(x0, y0, size, size);
  // Roads as pale lines.
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 11; i += 1) {
    const c = roadCenter(i) * scale + x0;
    ctx.beginPath();
    ctx.moveTo(x0, roadCenter(i) * scale + y0);
    ctx.lineTo(x0 + size, roadCenter(i) * scale + y0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(c, y0);
    ctx.lineTo(c, y0 + size);
    ctx.stroke();
  }
  // Water on the south and east edges.
  ctx.fillStyle = '#2f6f8f';
  ctx.fillRect(x0, y0 + size - 4, size, 4);
  ctx.fillRect(x0 + size - 4, y0, 4, size);
  // Collectibles.
  ctx.fillStyle = '#4ac25a';
  for (const c of G.collectibles) {
    if (c.taken) continue;
    ctx.fillRect(x0 + c.x * scale - 1, y0 + c.y * scale - 1, 3, 3);
  }
  // Mission marker.
  if (G.mission && G.mission.target) {
    ctx.fillStyle = '#ffd23a';
    const mx = x0 + G.mission.target.x * scale;
    const my = y0 + G.mission.target.y * scale;
    ctx.beginPath();
    ctx.moveTo(mx, my - 5);
    ctx.lineTo(mx + 4, my);
    ctx.lineTo(mx, my + 5);
    ctx.lineTo(mx - 4, my);
    ctx.closePath();
    ctx.fill();
  }
  // Police cars.
  ctx.fillStyle = '#5a8aff';
  for (const car of G.cars) {
    if (car.state !== 'police') continue;
    ctx.beginPath();
    ctx.arc(x0 + car.x * scale, y0 + car.y * scale, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // The player.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x0 + G.player.x * scale, y0 + G.player.y * scale, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e8b23a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

export function drawClock(ctx, G, viewW, viewH) {
  const mins = Math.floor(G.clockMinutes) % (24 * 60);
  const hh = String(Math.floor(mins / 60)).padStart(2, '0');
  const mm = String(mins % 60).padStart(2, '0');
  const station = STATIONS[G.station];
  panel(ctx, viewW - 174, viewH - 44, 162, 32);
  text(ctx, `${hh}:${mm}`, viewW - 166, viewH - 38, 16, PALETTE.hudText, 'left', true);
  text(ctx, station, viewW - 108, viewH - 35, 12, PALETTE.hudDim, 'left', false);
}

export function drawSpeed(ctx, G, viewH) {
  if (!G.playerCar) return;
  const mph = Math.round(Math.abs(G.playerCar.speed) * 0.12);
  panel(ctx, 12, viewH - 44, 110, 32);
  text(ctx, `${mph}`, 20, viewH - 40, 18, PALETTE.hudText, 'left', true);
  text(ctx, 'MPH', 66, viewH - 35, 11, PALETTE.hudDim, 'left', true);
}

export function drawDialogue(ctx, G, viewW, viewH) {
  if (!G.dialogue) return;
  const w = Math.min(560, viewW - 40);
  const x = viewW / 2 - w / 2;
  const y = viewH - 116;
  panel(ctx, x, y, w, 58);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(G.dialogue.speaker, x + 14, y + 8);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '15px sans-serif';
  wrapText(ctx, G.dialogue.text, x + 14, y + 28, w - 28, 18);
}

function wrapText(ctx, s, x, y, maxW, lineH) {
  const words = s.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

export function drawFareTimer(ctx, G, viewW) {
  if (!G.fare || G.fare.state !== 'toDest') return;
  const t = Math.max(0, Math.ceil(G.fare.timer));
  panel(ctx, viewW / 2 - 60, 72, 120, 30);
  text(ctx, `FARE ${t}s`, viewW / 2, 78, 16, t <= 5 ? '#ff6a5a' : PALETTE.hudText, 'center', true);
}

// A menu list with one highlighted row.
export function menuList(ctx, items, sel, cx, y0, rowH) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  items.forEach((item, i) => {
    const y = y0 + i * rowH;
    if (i === sel) {
      ctx.fillStyle = 'rgba(255,210,58,0.16)';
      ctx.fillRect(cx - 170, y - 6, 340, rowH - 4);
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`› ${item} ‹`, cx, y);
    } else {
      ctx.fillStyle = PALETTE.hudText;
      ctx.font = '19px sans-serif';
      ctx.fillText(item, cx, y);
    }
  });
}

export function drawTitle(ctx, G, viewW, viewH, sel) {
  ctx.fillStyle = 'rgba(8,10,16,0.55)';
  ctx.fillRect(0, 0, viewW, viewH);
  const cx = viewW / 2;
  // Sun-soaked logo.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffd23a';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('SOLMAR BAY', cx, viewH * 0.16);
  ctx.fillStyle = '#ff7a5a';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('A TOP-DOWN OPEN-WORLD CRIME GAME', cx, viewH * 0.16 + 78);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '14px sans-serif';
  ctx.fillText('Five jobs. One city. No brakes.', cx, viewH * 0.16 + 108);
  const items = ['NEW GAME', G.hasSave ? 'CONTINUE' : null, 'HOW TO PLAY'].filter(Boolean);
  menuList(ctx, items, sel, cx, viewH * 0.48, 44);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '13px sans-serif';
  ctx.fillText('WASD move · E enter car · Mouse aim · Click shoot · Esc pause · M mute', cx, viewH - 36);
}

export function drawHowTo(ctx, G, viewW, viewH) {
  ctx.fillStyle = 'rgba(8,10,16,0.72)';
  ctx.fillRect(0, 0, viewW, viewH);
  const cx = viewW / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('HOW TO PLAY', cx, 70);
  const lines = [
    ['Move', 'WASD or arrow keys — on foot, and to steer while driving'],
    ['Enter / exit car', 'E near a car (stealing one raises your wanted level)'],
    ['Shoot', 'Aim with the mouse, click to fire (on foot only)'],
    ['Missions', 'Follow the yellow marker; finish all five to beat the story'],
    ['Wanted', 'Stars rise with crime and fall when you lay low'],
    ['Busted / Wasted', 'Cops hold you or your health hits zero — you lose a fine'],
    ['Save', 'Pause with Esc, or press P for a quick save'],
    ['Mute', 'M toggles sound'],
  ];
  ctx.textAlign = 'left';
  let y = 140;
  for (const [k, v] of lines) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(k, cx - 320, y);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '15px sans-serif';
    ctx.fillText(v, cx - 140, y);
    y += 34;
  }
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Press Esc or Enter to go back', cx, viewH - 48);
}

export function drawPause(ctx, G, viewW, viewH, sel) {
  ctx.fillStyle = 'rgba(8,10,16,0.6)';
  ctx.fillRect(0, 0, viewW, viewH);
  const cx = viewW / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('PAUSED', cx, viewH * 0.22);
  const items = ['RESUME', 'SAVE GAME', 'RESTART MISSION', 'QUIT TO TITLE'];
  menuList(ctx, items, sel, cx, viewH * 0.36, 44);
}

export function drawEnd(ctx, G, viewW, viewH, kind) {
  ctx.fillStyle = kind === 'wasted' ? 'rgba(60,8,8,0.6)' : 'rgba(8,16,48,0.6)';
  ctx.fillRect(0, 0, viewW, viewH);
  const cx = viewW / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = kind === 'wasted' ? '#ff6a5a' : '#5a8aff';
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText(kind === 'wasted' ? 'WASTED' : 'BUSTED', cx, viewH * 0.3);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '17px sans-serif';
  const fine = kind === 'wasted'
    ? 'You got taken out. The medics patched you up — for a fee.'
    : 'The cops caught you. They took a fine and let you go.';
  ctx.fillText(fine, cx, viewH * 0.3 + 78);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '14px sans-serif';
  ctx.fillText('Press Enter to get back on the streets', cx, viewH * 0.3 + 116);
}

export function drawStoryComplete(ctx, G, viewW, viewH) {
  ctx.fillStyle = 'rgba(8,24,12,0.66)';
  ctx.fillRect(0, 0, viewW, viewH);
  const cx = viewW / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('STORY COMPLETE', cx, viewH * 0.24);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '19px sans-serif';
  ctx.fillText('Five jobs done. Solmar Bay is yours, Danny.', cx, viewH * 0.24 + 64);
  const stats = [
    `Cash earned: $${G.player.money}`,
    `Enemies taken down: ${G.enemiesKilled}`,
    `Shots fired: ${G.shotsFired}`,
  ];
  let y = viewH * 0.24 + 120;
  for (const s of stats) {
    ctx.fillText(s, cx, y);
    y += 30;
  }
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '14px sans-serif';
  ctx.fillText('Press Enter to keep playing the city', cx, y + 24);
}
