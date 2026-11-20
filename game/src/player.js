// Solmar Bay — the player: Danny, on foot and behind the wheel.
// Walking, entering and leaving cars, and aiming and shooting.

import { TUNE } from './config.js';
import { clamp, dist } from './random.js';
import { resolveCircle } from './world.js';
import { nearestCar } from './vehicles.js';

export function makePlayer(x, y) {
  return {
    x,
    y,
    angle: -Math.PI / 2,
    health: 100,
    money: 0,
    speed: 0,
  };
}

// Move on foot: WASD / arrows, pushed out of buildings.
export function updatePlayer(G, dt) {
  const input = G.input;
  const player = G.player;

  if (G.playerCar) return; // driving is handled by vehicles.js

  const mv = input.moveVector();
  const moving = mv.x !== 0 || mv.y !== 0;
  if (moving) {
    player.angle = Math.atan2(mv.y, mv.x);
    player.speed = TUNE.walkSpeed;
  } else {
    player.speed = 0;
  }
  player.x += mv.x * player.speed * dt;
  player.y += mv.y * player.speed * dt;
  const fixed = resolveCircle(G.world, player.x, player.y, 12);
  player.x = fixed.x;
  player.y = fixed.y;

  // Aim with the mouse: the player faces the cursor while aiming.
  if (G.aiming) {
    const wx = G.camera.x + (input.mouseX - G.viewW / 2) / G.camera.zoom;
    const wy = G.camera.y + (input.mouseY - G.viewH / 2) / G.camera.zoom;
    player.angle = Math.atan2(wy - player.y, wx - player.x);
  }

  // E near a car: get in. Stealing a parked or traffic car is a crime.
  if (input.wasPressed('KeyE')) {
    const car = nearestCar(G, 52);
    if (car) {
      G.playerCar = car;
      car.state = 'player';
      car.speed = 0;
      if (car.kind !== 'police') {
        G.stoleCar = true;
        G.lastCrime = 0;
        G.lastCrimeReason = 'stole a car';
        G.wanted = Math.min(100, G.wanted + 15);
      }
      G.audio.blip();
    }
  }
}

// Step out of the car onto the road beside it.
export function exitCar(G) {
  const car = G.playerCar;
  if (!car) return;
  car.state = 'parked';
  car.speed = 0;
  const side = car.angle + Math.PI / 2;
  const px = car.x + Math.cos(side) * 34;
  const py = car.y + Math.sin(side) * 34;
  const fixed = resolveCircle(G.world, px, py, 12);
  G.player.x = fixed.x;
  G.player.y = fixed.y;
  G.player.angle = car.angle;
  G.playerCar = null;
  G.audio.engine(false, 0);
  G.audio.blip();
}

// The mouse aim direction in world space, for shooting.
export function aimAngle(G) {
  const input = G.input;
  const wx = G.camera.x + (input.mouseX - G.viewW / 2) / G.camera.zoom;
  const wy = G.camera.y + (input.mouseY - G.viewH / 2) / G.camera.zoom;
  return Math.atan2(wy - G.player.y, wx - G.player.x);
}
