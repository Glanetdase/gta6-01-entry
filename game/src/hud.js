// Solmar Bay — the HUD and the screens: title, how-to, pause, busted, wasted,
// story complete. The HUD shows wanted stars, money, health, the mission
// objective, the clock, the radio station and the minimap.

import { VIEW_W, VIEW_H, PALETTE, RADIO_STATIONS } from './config.js';
import { fmtClock, fmtMoney, clamp } from './random.js';
import { drawMinimap } from './render.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.hudBg;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function stars(ctx, x, y, wanted) {
  ctx.font = '22px sans-serif';
  ctx.textAlign = 'left';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < wanted ? PALETTE.star : PALETTE.starEmpty;
    ctx.fillText('★', x + i * 26, y);
  }
}

export function drawHud(ctx, G) {
  const p = G.player;
  // Top-left: wanted stars + heat bar, money, health.
  panel(ctx, 12, 12, 300, 96);
  stars(ctx, 24, 40, G.wanted);
  ctx.fillStyle = '#5a5a66';
  ctx.fillRect(24, 50, 150, 6);
  ctx.fillStyle = G.wanted > 0 ? '#ff5a5a' : '#3aa655';
  ctx.fillRect(24, 50, 150 * clamp(G.heat / 100, 0, 1), 6);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(fmtMoney(p.money), 24, 84);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#b8bcc8';
  ctx.fillText('WANTED', 186, 40);
  // Health bar.
  ctx.fillStyle = '#3a3d47';
  ctx.fillRect(186, 50, 112, 10);
  ctx.fillStyle = p.health > 30 ? '#3aa655' : '#ff5a5a';
  ctx.fillRect(186, 50, 112 * clamp(p.health / 100, 0, 1), 10);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '12px sans-serif';
  ctx.fillText('HP ' + Math.ceil(p.health), 186, 76);

  // Minimap (top-right).
  drawMinimap(ctx, G);

  // Objective bar under the minimap.
  const obj = '◆ ' + (G.mission.objective || '');
  ctx.font = 'bold 15px sans-serif';
  const ow = ctx.measureText(obj).width + 28;
  panel(ctx, VIEW_W - ow - 14, 208, ow, 34);
  ctx.fillStyle = PALETTE.hudGold;
  ctx.textAlign = 'left';
  ctx.fillText(obj, VIEW_W - ow, 231);

  // Bottom-left: clock, radio, speed, kills.
  panel(ctx, 12, VIEW_H - 64, 330, 50);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(fmtClock(G.clock), 24, VIEW_H - 34);
  const station = RADIO_STATIONS[G.radio % RADIO_STATIONS.length];
  ctx.fillStyle = station.hue;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('♪ ' + station.name, 110, VIEW_H - 34);
  ctx.fillStyle = '#b8bcc8';
  ctx.font = '13px sans-serif';
  const speed = p.inCar ? Math.round(Math.abs(p.inCar.speed) * 0.09) + ' MPH' : 'ON FOOT';
  ctx.fillText(speed, 240, VIEW_H - 34);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '13px sans-serif';
  ctx.fillText('Kills ' + G.kills + '   Shots ' + G.shotsFired, 24, VIEW_H - 16);

  // Mission counter top-centre.
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  const missionText = G.mission.index >= 5
    ? 'STORY COMPLETE'
    : 'MISSION ' + (G.mission.index + 1) + ' / 5 — ' + (G.missionTitles[G.mission.index] || '');
  ctx.fillText(missionText, VIEW_W / 2, 30);

  // Dialogue box.
  if (G.mission.dialog) {
    const d = G.mission.dialog;
    panel(ctx, VIEW_W / 2 - 330, VIEW_H - 150, 660, 72);
    ctx.fillStyle = PALETTE.hudGold;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(d.who, VIEW_W / 2 - 314, VIEW_H - 122);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '15px sans-serif';
    wrapText(ctx, d.text, VIEW_W / 2 - 314, VIEW_H - 100, 628, 19);
    ctx.fillStyle = '#b8bcc8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('E ▸', VIEW_W / 2 + 314, VIEW_H - 88);
  }

  // Money popups.
  for (const pop of G.moneyPopups) {
    ctx.globalAlpha = clamp(pop.life, 0, 1);
    ctx.fillStyle = PALETTE.hudGold;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pop.text, pop.x - G.cam.x, pop.y - G.cam.y - pop.t * 30);
  }
  ctx.globalAlpha = 1;

  // "Press E" hint near a car.
  if (G.enterHint) {
    ctx.fillStyle = PALETTE.hudBg;
    const hx = VIEW_W / 2 - 90;
    ctx.fillRect(hx, VIEW_H - 210, 180, 30);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Press E — enter car', VIEW_W / 2, VIEW_H - 190);
  }
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lh;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

export function drawTitle(ctx, G, hasSave) {
  ctx.fillStyle = '#0b0e1a';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Sunset gradient sky.
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, '#ff7a3d');
  grad.addColorStop(0.55, '#c94b7a');
  grad.addColorStop(1, '#2b1b4d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H * 0.62);
  // Sun.
  ctx.fillStyle = '#ffd23d';
  ctx.beginPath(); ctx.arc(VIEW_W - 260, 150, 62, 0, Math.PI * 2); ctx.fill();
  // Skyline.
  ctx.fillStyle = '#1d1440';
  const skyline = [90, 150, 110, 190, 130, 170, 100, 210, 140, 120, 180, 90];
  let sx = 0;
  for (const h of skyline) {
    ctx.fillRect(sx, 430 - h, 108, h + 40);
    sx += 108;
  }
  ctx.fillStyle = '#10142a';
  ctx.fillRect(0, 430, VIEW_W, VIEW_H - 430);
  // Title.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23d';
  ctx.font = 'bold 92px Georgia, serif';
  ctx.fillText('SOLMAR BAY', VIEW_W / 2, 210);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('an open-world crime story', VIEW_W / 2, 248);
  // Menu.
  const items = hasSave
    ? ['ENTER — New Game', 'C — Continue', 'H — How to Play']
    : ['ENTER — New Game', 'H — How to Play'];
  ctx.font = 'bold 20px sans-serif';
  items.forEach((it, i) => {
    ctx.fillStyle = i === 0 ? '#ffd23d' : '#e8e8e8';
    ctx.fillText(it, VIEW_W / 2, 500 + i * 36);
  });
  ctx.fillStyle = '#b8bcc8';
  ctx.font = '14px sans-serif';
  ctx.fillText('WASD walk & drive · E enter car · Mouse aim, click to shoot · Esc pause', VIEW_W / 2, 640);
}

export function drawHowTo(ctx) {
  ctx.fillStyle = '#0b0e1a';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23d';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText('HOW TO PLAY', VIEW_W / 2, 110);
  const lines = [
    ['Walk & drive', 'WASD or arrow keys. Space is the handbrake.'],
    ['Steal a car', 'Walk up to any car and press E. Press E again to get out.'],
    ['Shoot', 'Aim with the mouse, click to fire — only on foot.'],
    ['Wanted level', 'Crime raises your stars. Cops chase you; lose them or get busted.'],
    ['Missions', 'Follow the yellow marker. Five missions, one story.'],
    ['Pickups', 'Green cash packages are worth $25 each.'],
    ['Save', 'P quick-saves. The game also saves when a mission ends.'],
    ['Sound', 'M mutes the radio, engine and sirens.'],
  ];
  ctx.textAlign = 'left';
  lines.forEach((l, i) => {
    const y = 170 + i * 52;
    ctx.fillStyle = '#ffd23d';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(l[0], 300, y);
    ctx.fillStyle = '#e8e8e8';
    ctx.font = '16px sans-serif';
    ctx.fillText(l[1], 520, y);
  });
  ctx.fillStyle = '#b8bcc8';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ESC — back to title', VIEW_W / 2, 620);
}

export function drawPause(ctx, G) {
  ctx.fillStyle = 'rgba(8,10,22,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23d';
  ctx.font = 'bold 54px Georgia, serif';
  ctx.fillText('PAUSED', VIEW_W / 2, 240);
  const items = ['ESC — Resume', 'P — Save Game', 'R — Restart Mission', 'Q — Quit to Title'];
  ctx.font = 'bold 20px sans-serif';
  items.forEach((it, i) => {
    ctx.fillStyle = '#e8e8e8';
    ctx.fillText(it, VIEW_W / 2, 320 + i * 40);
  });
  ctx.fillStyle = '#b8bcc8';
  ctx.font = '15px sans-serif';
  ctx.fillText('Money ' + fmtMoney(G.player.money) + '   ·   Mission ' + (G.mission.index + 1) + ' of 5', VIEW_W / 2, 500);
}

export function drawBusted(ctx, G) {
  ctx.fillStyle = 'rgba(20,30,90,0.88)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#5a8cff';
  ctx.font = 'bold 84px Georgia, serif';
  ctx.fillText('BUSTED', VIEW_W / 2, 300);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText('The Solmar PD took you in. Fine: $50. Your car is impounded.', VIEW_W / 2, 360);
  ctx.fillStyle = '#ffd23d';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('ENTER — back on the street', VIEW_W / 2, 430);
}

export function drawWasted(ctx, G) {
  ctx.fillStyle = 'rgba(90,10,20,0.88)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5a5a';
  ctx.font = 'bold 84px Georgia, serif';
  ctx.fillText('WASTED', VIEW_W / 2, 300);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText('You woke up at St. Marina Hospital. Bill: $100.', VIEW_W / 2, 360);
  ctx.fillStyle = '#ffd23d';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('ENTER — back on the street', VIEW_W / 2, 430);
}

export function drawComplete(ctx, G) {
  ctx.fillStyle = 'rgba(8,20,14,0.9)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23d';
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText('STORY COMPLETE', VIEW_W / 2, 260);
  ctx.fillStyle = '#fff';
  ctx.font = '22px sans-serif';
  ctx.fillText('Danny pulled the big score and walked away clean.', VIEW_W / 2, 320);
  ctx.fillStyle = '#b8bcc8';
  ctx.font = '18px sans-serif';
  ctx.fillText('Money earned: ' + fmtMoney(G.player.money) + '   ·   Kills: ' + G.kills, VIEW_W / 2, 370);
  ctx.fillStyle = '#ffd23d';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('ENTER — keep playing the city', VIEW_W / 2, 440);
}
