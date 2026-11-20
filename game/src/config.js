// Solmar Bay — tuning constants, palette and geometry.
// One place for every number the rest of the game shares, so a tweak
// here retunes the whole city instead of hunting through modules.

export const WORLD_SEED = 20261120;
export const SAVE_KEY = 'solmarbay-save-v1';

export const BLOCK = 320; // side of one city block, in world pixels
export const ROAD = 96; // width of a road, in world pixels
export const GRID = 11; // blocks per side of the city
export const WORLD_W = GRID * BLOCK + (GRID + 1) * ROAD; // 4672
export const WORLD_H = WORLD_W;

export const STATIONS = ['SOLMAR FM', 'BAY 98.5', 'VICE WAVE'];

export const TUNE = {
  walkSpeed: 195,
  walkAccel: 1400,
  carAccel: 300,
  carBrake: 520,
  carReverseMax: 170,
  carMaxSpeed: 430,
  sportsMaxSpeed: 500,
  carTurn: 2.5,
  trafficSpeed: 135,
  trafficMax: 175,
  pedSpeed: 62,
  pedFleeSpeed: 150,
  copSpeed: 165,
  bulletSpeed: 760,
  bulletLife: 0.9,
  enemyRange: 430,
  enemyShootGap: 1.15,
  playerDamage: 8,
  enemyHealth: 3,
  bustFine: 120,
  wantedDecay: 2.6,
  wantedGrace: 6,
  fareTime: 24,
  radioEvery: 75,
  cameraLerp: 5,
  shakeDecay: 22,
  collectibleValue: 50,
  maxStars: 5,
};

export const PALETTE = {
  asphalt: '#33373d',
  asphaltLine: '#c8b15a',
  sidewalk: '#8d8f92',
  lot: '#6f6a5e',
  grass: '#5d8a4a',
  sand: '#d9c184',
  sea: '#2f6f8f',
  dockConcrete: '#7a7d80',
  roofA: '#b0583a',
  roofB: '#4a6b8a',
  roofC: '#7a5a8a',
  roofD: '#a8874f',
  roofE: '#5a7a5a',
  tree: '#3f7038',
  treeDark: '#2f5a2c',
  containerA: '#c25a3a',
  containerB: '#3a7ac2',
  containerC: '#c2a23a',
  containerD: '#4a9a5a',
  player: '#e8b23a',
  playerDark: '#8a6a1a',
  cop: '#2f6fd0',
  copDark: '#1a3f7a',
  enemy: '#c23a3a',
  enemyDark: '#7a1a1a',
  pedA: '#d08a4a',
  pedB: '#4a8a8a',
  pedC: '#8a4a8a',
  pedD: '#7a7a4a',
  carColors: ['#c23a3a', '#3a6ac2', '#c2a23a', '#4a9a5a', '#8a4a8a', '#d0d0d0', '#3a3a3a', '#d08a4a'],
  taxi: '#e8c23a',
  police: '#e8e8e8',
  sports: '#c23a6a',
  marker: '#ffd23a',
  cash: '#4ac25a',
  hudBg: 'rgba(12, 14, 18, 0.72)',
  hudText: '#f2f2ea',
  hudDim: '#b8b8a8',
  gold: '#ffd23a',
};

// How many of each thing the city seeds.
export const COUNTS = {
  traffic: 26,
  parked: 30,
  peds: 42,
  collectibles: 12,
};

// Mission rewards, in dollars, in story order.
export const REWARDS = [150, 250, 400, 350, 600];
