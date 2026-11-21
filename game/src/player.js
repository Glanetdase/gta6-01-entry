// Solmar Bay — the player: walking, entering/exiting cars, shooting, pickups.
// The player is either on foot (a circle with an aim angle) or driving a car
// (the car object is the body; the player rides inside it).

import { PLAYER_WALK, PLAYER_RUN, WORLD } from './config.js';
import { clamp, dist } from './random.js';
import { collideCircle, insideBuilding } from './world.js';

export function makePlayer(x, y) {
  return {
    x, y,
    angle: -Math.PI / 2,
    aim: -Math.PI / 2,
    speed: 0,
    inCar: null, // the car object when driving, else null
    health: 100,
    money: 0,
    shotCooldown: 0,
    walking: false,
    run: false,
  };
}

// Move on foot with input axes; returns true while actually walking.
export function stepPlayerOnFoot(player, world, ax, ay, dt) {
  const run = false;
  const speed = PLAYER_WALK;
  let mx = ax;
  let my = ay;
  const len = Math.hypot(mx, my);
  if (len > 0.01) {
    mx /= len; my /= len;
    player.x += mx * speed * dt;
    player.y += my * speed * dt;
    player.angle = Math.atan2(my, mx);
    player.walking = true;
    player.speed = speed;
  } else {
    player.walking = false;
    player.speed = 0;
  }
  player.run = run;
  const fixed = collideCircle(world, player.x, player.y, 13);
  player.x = fixed.x;
  player.y = fixed.y;
  player.x = clamp(player.x, 16, WORLD - 16);
  player.y = clamp(player.y, 16, WORLD - 16);
  if (player.shotCooldown > 0) player.shotCooldown -= dt;
}

// Aim at the mouse (screen coords -> world coords via the camera).
export function aimAt(player, cam, mouseX, mouseY) {
  const wx = cam.x + mouseX;
  const wy = cam.y + mouseY;
  player.aim = Math.atan2(wy - player.y, wx - player.x);
}

// Nearest car the player can enter (within 72 px of the player's feet).
export function nearestEnterableCar(player, cars) {
  let best = null;
  let bestD = 72;
  for (const car of cars) {
    if (car.isCop) continue;
    const d = dist(player.x, player.y, car.x, car.y);
    if (d < bestD) { best = car; bestD = d; }
  }
  return best;
}

export function enterCar(player, car) {
  player.inCar = car;
  car.isPlayer = true;
  car.speed = 0;
  player.x = car.x;
  player.y = car.y;
}

export function exitCar(player, world) {
  const car = player.inCar;
  if (!car) return;
  car.isPlayer = false;
  car.speed = 0;
  // Step out to the side of the car.
  const sx = car.x + Math.cos(car.angle + Math.PI / 2) * 30;
  const sy = car.y + Math.sin(car.angle + Math.PI / 2) * 30;
  if (!insideBuilding(world, sx, sy)) {
    player.x = sx; player.y = sy;
  } else {
    player.x = car.x - Math.cos(car.angle + Math.PI / 2) * 30;
    player.y = car.y - Math.sin(car.angle + Math.PI / 2) * 30;
  }
  player.inCar = null;
  player.angle = car.angle;
}

// Collect a pickup (money package) on touch; returns the value collected.
export function collectPickups(player, pickups) {
  let gained = 0;
  const px = player.inCar ? player.inCar.x : player.x;
  const py = player.inCar ? player.inCar.y : player.y;
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    if (dist(px, py, p.x, p.y) < 34) {
      gained += p.value;
      pickups.splice(i, 1);
    }
  }
  return gained;
}
