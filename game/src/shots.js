// Deterministic staged scenes for Solmar Bay's screenshots. Each scene
// builds a fixed moment of play — a chase, a beach drive, a dockside
// shootout, a walk through the park — from a seeded stream, then settles it
// with a few fixed simulation steps. The screenshots are real frames of
// the game.

import { streetPos, blockRect } from './config.js';
import { landmarkPos } from './world.js';
import { makeCar } from './vehicles.js';
import { makePed } from './pedestrians.js';
import { makeEnemy } from './combat.js';
import { startMission } from './missions.js';

function settle(G, steps = 50) {
  for (let i = 0; i < steps; i++) G.stepWorld(1 / 60);
}

function stageTraffic(G, spots) {
  for (const s of spots) {
    const car = makeCar(s.x, s.y, s.angle, s.color, 'traffic');
    car.speed = s.speed ?? 150;
    car.ai = { axis: s.axis, dir: s.dir, turnCooldown: 2, wantTurn: false };
    G.cars.push(car);
  }
}

function stagePeds(G, spots) {
  for (const s of spots) {
    const ped = makePed(G, s.x, s.y);
    ped.axis = s.axis || 'h';
    ped.dir = s.dir || 1;
    ped.speed = s.speed ?? 55;
    G.peds.push(ped);
  }
}

function stageChase(G) {
  // A three-star chase on the central boulevard, mission five on the HUD.
  const y = streetPos(5);
  const car = makeCar(1500, y + 14, 0, '#d7263d', 'player');
  car.speed = 420;
  G.cars.push(car);
  G.playerCar = car;
  G.player.x = car.x;
  G.player.y = car.y;
  G.player.money = 2450;
  G.player.health = 82;
  G.wanted = 520;
  G.stars = 3;
  for (let k = 0; k < 2; k++) {
    const pc = makeCar(1500 - 180 - k * 90, y + 14 + (k % 2 ? 30 : -30), 0, '#1f3a93', 'police');
    pc.speed = 430;
    pc.ai = { mode: 'ram' };
    G.cars.push(pc);
    G.policeCars.push(pc);
  }
  stageTraffic(G, [
    { x: 1850, y: y - 14, angle: Math.PI, color: '#f1c40f', axis: 'h', dir: -1, speed: 150 },
    { x: 1150, y: y + 14, angle: 0, color: '#2980b9', axis: 'h', dir: 1, speed: 140 },
    { x: 1650, y: streetPos(3) - 14, angle: -Math.PI / 2, color: '#e67e22', axis: 'v', dir: -1, speed: 160 },
  ]);
  stagePeds(G, [
    { x: 1380, y: y - 48, axis: 'h', dir: 1 },
    { x: 1720, y: y + 48, axis: 'h', dir: -1 },
  ]);
  startMission(G, 4);
  G.mission.step = 2; // escape step, marker on the safehouse
  settle(G, 40);
}

function stageDrive(G) {
  // Cruising the beach road at sunset in a taxi, fares waiting.
  const y = streetPos(10);
  const car = makeCar(1250, y - 14, 0, '#f7c948', 'player');
  car.speed = 300;
  car.kind = 'taxi';
  G.cars.push(car);
  G.playerCar = car;
  G.player.x = car.x;
  G.player.y = car.y;
  G.player.money = 640;
  G.wanted = 0;
  G.stars = 0;
  stageTraffic(G, [
    { x: 1600, y: y + 14, angle: 0, color: '#c0392b', axis: 'h', dir: 1, speed: 170 },
    { x: 900, y: y - 14, angle: Math.PI, color: '#ecf0f1', axis: 'h', dir: -1, speed: 150 },
    { x: 1450, y: streetPos(8) + 14, angle: Math.PI / 2, color: '#1abc9c', axis: 'v', dir: 1, speed: 140 },
  ]);
  stagePeds(G, [
    { x: 1100, y: 3225, axis: 'h', dir: 1 },
    { x: 1500, y: 3225, axis: 'h', dir: -1 },
    { x: 1750, y: y - 48, axis: 'h', dir: 1 },
  ]);
  startMission(G, 0);
  G.mission.step = 2;
  settle(G, 40);
}

function stageShootout(G) {
  // The dockside shootout: Danny on foot, Vultures ahead, two stars.
  const docks = landmarkPos(G.world, 'docks');
  G.player.x = docks.x - 260;
  G.player.y = docks.y + 40;
  G.player.angle = 0;
  G.player.aimAngle = 0;
  G.player.money = 1180;
  G.player.health = 74;
  G.wanted = 300;
  G.stars = 2;
  for (let k = 0; k < 4; k++) {
    G.enemies.push(makeEnemy(docks.x - 120 + k * 70, docks.y - 60 + (k % 2) * 90));
  }
  const pc = makeCar(docks.x - 420, streetPos(9) + 14, 0, '#1f3a93', 'police');
  pc.speed = 300;
  pc.ai = { mode: 'ram' };
  G.cars.push(pc);
  G.policeCars.push(pc);
  stagePeds(G, [{ x: docks.x + 120, y: docks.y + 120, axis: 'h', dir: -1 }]);
  startMission(G, 3);
  G.mission.step = 1;
  // A shot already in the air, for the muzzle-flash moment.
  G.bullets.push({ x: G.player.x + 60, y: G.player.y, vx: 780, vy: 0, life: 0.4, from: 'player', dmg: 34 });
  settle(G, 25);
}

function stageWalk(G) {
  // A walk through the park plaza, city behind.
  const pk = blockRect(6, 7);
  G.player.x = pk.x + 100;
  G.player.y = pk.y + 100;
  G.player.angle = Math.PI / 4;
  G.player.money = 320;
  G.wanted = 0;
  G.stars = 0;
  stagePeds(G, [
    { x: pk.x + 40, y: pk.y + 60, axis: 'h', dir: 1 },
    { x: pk.x + 150, y: pk.y + 140, axis: 'v', dir: -1 },
    { x: pk.x + 60, y: pk.y + 170, axis: 'h', dir: -1 },
    { x: pk.x + 170, y: pk.y + 40, axis: 'v', dir: 1 },
  ]);
  const taxi = makeCar(pk.x + 60, streetPos(7) + 14, 0, '#f7c948', 'taxi');
  taxi.speed = 0;
  taxi.ai = { axis: 'h', dir: 1, turnCooldown: 2, wantTurn: false };
  G.cars.push(taxi);
  startMission(G, 1);
  settle(G, 40);
}

export function setupShot(G, name) {
  G.state = 'play';
  G.audio.muted = true;
  if (name === 'cover' || name === '1-cover') stageChase(G);
  else if (name === 'drive' || name === '2-drive') stageDrive(G);
  else if (name === 'mission' || name === '3-mission') stageShootout(G);
  else stageWalk(G);
  G.camera.x = G.player.x;
  G.camera.y = G.player.y;
  G.shotReady = true;
}
