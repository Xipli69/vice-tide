// Central tuning for VICE TIDE. Everything the other modules need to agree on
// — world size, road layout, physics constants, colours — lives here so the
// city feels the same on foot, in a car and on the minimap.
export const WORLD = {
  width: 3360,
  height: 2520,
  block: 420, // one city block, roads included
  road: 118, // road width inside each block pitch
  tile: 42,
};

export const PLAYER = {
  radius: 13,
  walkSpeed: 148,
  sprintSpeed: 228,
  health: 100,
  startX: 640,
  startY: 2050,
};

export const CAR = {
  length: 46,
  width: 22,
  accel: 265,
  brake: 420,
  reverse: 120,
  maxSpeed: 395,
  grip: 7.5,
  turnRate: 2.6,
};

export const WANTED = {
  decaySeconds: 26, // unseen time that drops one star
  maxStars: 5,
};

export const PALETTE = {
  water: '#123a5e',
  sand: '#d9b878',
  grass: '#3e7d46',
  grassDark: '#356b3c',
  sidewalk: '#9aa0a3',
  road: '#33373c',
  roadLine: '#e8c95a',
  roofA: '#8d5a4a',
  roofB: '#5f7184',
  roofC: '#77628f',
  roofD: '#4a7d74',
  neonPink: '#ff4d8d',
  neonCyan: '#37e0d8',
  gold: '#ffc94d',
};

export const STORY = {
  hero: 'Jax Marlowe',
  fixer: 'Delia Cross',
  city: 'Port Vesper',
  debt: 8000,
};
