// Solmar Bay — tuning constants, palette and city geometry.
// One place for every number the rest of the game shares, so a tweak lands everywhere.

export const WORLD_SEED = 20261120;
export const VIEW_W = 1280;
export const VIEW_H = 720;

// City grid: 11 blocks of 240 px, 12 roads of 80 px. 11*240 + 12*80 = 3600.
export const BLOCK = 240;
export const ROAD = 80;
export const PITCH = BLOCK + ROAD;
export const GRID = 11;
export const WORLD = GRID * BLOCK + (GRID + 1) * ROAD; // 3600

// Road i (0..11) spans [i*PITCH, i*PITCH + ROAD); its centre line:
export function roadCenter(i) { return i * PITCH + ROAD / 2; }
// Block i (0..10) spans [i*PITCH + ROAD, (i+1)*PITCH).
export function blockStart(i) { return i * PITCH + ROAD; }
export function blockCenter(i) { return i * PITCH + ROAD + BLOCK / 2; }

export const PLAYER_WALK = 175;
export const PLAYER_RUN = 265;
export const CAR_ACCEL = 460;
export const CAR_BRAKE = 900;
export const CAR_MAX_SPEED = 640;
export const CAR_REVERSE_MAX = 220;
export const CAR_TURN = 2.5;
export const CAR_DRAG = 0.55;
export const CAR_RADIUS = 17;

export const BULLET_SPEED = 900;
export const BULLET_LIFE = 0.9;
export const PLAYER_SHOT_COOLDOWN = 0.22;
export const ENEMY_SHOT_COOLDOWN = 0.85;
export const ENEMY_RANGE = 430;

export const WANTED_DECAY_DELAY = 14; // seconds of no crime before stars fall
export const WANTED_DECAY_RATE = 1 / 9; // stars per second once decaying
export const MAX_WANTED = 5;

export const SAVE_KEY = 'solmar-bay-save-v1';

export const RADIO_STATIONS = [
  { name: 'SOLMAR FM', hue: '#ff5da2' },
  { name: 'BAY 98.5', hue: '#35d0ff' },
  { name: 'VICE WAVE', hue: '#ffb347' },
];
export const RADIO_SWITCH_SECONDS = 75;

export const MISSION_REWARDS = [80, 120, 200, 250, 500];
export const PICKUP_VALUE = 25;
export const BUST_FINE = 50;
export const WASTED_FINE = 100;

// Landmark blocks (block coordinates, 0..10).
export const LANDMARKS = {
  hospital: { bx: 2, by: 2, name: 'St. Marina Hospital' },
  police: { bx: 8, by: 2, name: 'Solmar PD' },
  safehouse: { bx: 1, by: 8, name: "Danny's Safehouse" },
  bank: { bx: 5, by: 4, name: 'Bay Trust Bank' },
  park: { bx: 5, by: 5, name: 'Palma Plaza' },
  docks: { bx: 10, by: 6, name: 'The Docks' },
  beach: { bx: 5, by: 10, name: 'Solmar Beach' },
};

export const PALETTE = {
  grass: '#4d8f4a',
  grassDark: '#417d3e',
  sand: '#e0c98f',
  sandDark: '#d3ba7d',
  road: '#33363f',
  roadLine: '#d8d8c8',
  sidewalk: '#9aa0a8',
  plaza: '#b8a88a',
  water: '#2e6f9e',
  waterDark: '#265c85',
  building: ['#c96f4a', '#7d8aa6', '#b5a06a', '#8a6f9e', '#5f9e8a', '#a65a5a'],
  roof: ['#8a4a33', '#5a6a86', '#8a7a4a', '#6a4a7d', '#477a6a', '#7d3a3a'],
  tree: '#2f6b2a',
  treeDark: '#245420',
  car: ['#d94f3d', '#3d7dd9', '#e8c832', '#e8e8e8', '#3aa655', '#8a5fd9', '#e07b2e', '#2e2e33'],
  taxi: '#f2c230',
  copCar: '#e8e8e8',
  copBlue: '#2b4fd9',
  player: '#ffd23d',
  playerDark: '#c79a12',
  ped: ['#e07b2e', '#7db3e8', '#e88bb0', '#9e7de8', '#7de89e', '#e8e8e8'],
  gang: '#c22e4a',
  cop: '#2b4fd9',
  bullet: '#ffe9a8',
  spark: '#ffd23d',
  blood: '#a01828',
  hudBg: 'rgba(8,10,22,0.72)',
  hudText: '#f2f2ea',
  hudGold: '#ffd23d',
  hudRed: '#ff5a5a',
  star: '#ffd23d',
  starEmpty: '#5a5a66',
  night: 'rgba(10,14,48,0.30)',
  sunset: 'rgba(255,120,60,0.12)',
};

export const CAR_KINDS = [
  { name: 'Sedan', w: 44, h: 22, accel: 1.0, top: 1.0 },
  { name: 'Hatch', w: 38, h: 20, accel: 1.1, top: 0.92 },
  { name: 'Truck', w: 56, h: 24, accel: 0.8, top: 0.85 },
  { name: 'Taxi', w: 44, h: 22, accel: 1.05, top: 0.95 },
  { name: 'Coupe', w: 42, h: 20, accel: 1.2, top: 1.12 },
];
