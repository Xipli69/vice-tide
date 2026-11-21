// Port Vesper's layout: a grid of blocks on a harbour peninsula. Roads run
// between blocks, the east edge is beach and water, the south-west holds the
// docks, and a park fills one whole block. Buildings are solid rectangles
// with a sidewalk apron; every gameplay system (collision, traffic lanes,
// minimap) reads this one description of the city.
import { WORLD, PALETTE } from './config.js';
import { makeRandom } from './random.js';

const ROOFS = [PALETTE.roofA, PALETTE.roofB, PALETTE.roofC, PALETTE.roofD];

export function buildCity(seed) {
  const rand = makeRandom(seed * 977 + 13);
  const buildings = [];
  const trees = [];
  const lamps = [];
  const cols = Math.floor(WORLD.width / WORLD.block);
  const rows = Math.floor(WORLD.height / WORLD.block);
  const parkCol = 5;
  const parkRow = 1;

  for (let cx = 0; cx < cols; cx++) {
    for (let cy = 0; cy < rows; cy++) {
      const bx = cx * WORLD.block + WORLD.road;
      const by = cy * WORLD.block + WORLD.road;
      const bw = WORLD.block - WORLD.road;
      const bh = WORLD.block - WORLD.road;
      const isPark = cx === parkCol && cy === parkRow;
      const isDocks = cx <= 1 && cy >= rows - 1;
      if (isPark) {
        for (let i = 0; i < 16; i++) {
          trees.push({ x: bx + rand.range(30, bw - 30), y: by + rand.range(30, bh - 30), r: rand.range(13, 22) });
        }
        continue;
      }
      if (isDocks) {
        // Warehouses: long, low, widely spaced.
        for (let i = 0; i < 2; i++) {
          buildings.push({
            x: bx + 14 + i * (bw / 2), y: by + 60, w: bw / 2 - 28, h: bh - 120,
            color: '#6b6f75', kind: 'warehouse', name: i === 0 ? 'VESPER FREIGHT' : 'COLD STORE 9',
          });
        }
        continue;
      }
      // Ordinary block: 2x2 buildings with an alley cross between them.
      const qw = bw / 2 - 16;
      const qh = bh / 2 - 16;
      for (let i = 0; i < 4; i++) {
        const qx = bx + (i % 2) * (bw / 2 + 8) + 4;
        const qy = by + Math.floor(i / 2) * (bh / 2 + 8) + 4;
        buildings.push({
          x: qx, y: qy, w: qw, h: qh,
          color: rand.pick(ROOFS), kind: 'block', name: '',
          trim: rand.chance(0.4) ? PALETTE.neonPink : PALETTE.neonCyan,
        });
      }
      if (rand.chance(0.5)) trees.push({ x: bx + bw - 18, y: by + 18, r: rand.range(11, 16) });
    }
  }

  // Street lamps along every road intersection.
  for (let cx = 0; cx <= cols; cx++) {
    for (let cy = 0; cy <= rows; cy++) {
      lamps.push({ x: cx * WORLD.block + 14, y: cy * WORLD.block + 14 });
    }
  }

  const named = [
    { x: 3 * WORLD.block + 200, y: 0 * WORLD.block + 330, label: 'CLUB MERIDIAN' },
    { x: 6 * WORLD.block + 200, y: 4 * WORLD.block + 330, label: 'VESPER GARAGE' },
    { x: 1 * WORLD.block + 200, y: 5 * WORLD.block + 330, label: 'THE DOCKS' },
    { x: 7 * WORLD.block + 200, y: 0 * WORLD.block + 330, label: 'AIRFIELD GATE' },
    { x: 4 * WORLD.block + 200, y: 2 * WORLD.block + 330, label: 'SAFEHOUSE' },
  ];
  return { buildings, trees, lamps, named, cols, rows };
}

export function isRoad(x, y) {
  const mx = ((x % WORLD.block) + WORLD.block) % WORLD.block;
  const my = ((y % WORLD.block) + WORLD.block) % WORLD.block;
  return mx < WORLD.road || my < WORLD.road;
}

export function isWater(x, y) {
  return x > WORLD.width - 130;
}

export function hitsBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}

// Slide a circle out of any building it overlaps; returns the corrected spot.
export function pushOutOfBuildings(city, x, y, r) {
  const b = hitsBuilding(city, x, y, r);
  if (!b) return { x, y };
  const left = x + r - b.x;
  const right = b.x + b.w - (x - r);
  const top = y + r - b.y;
  const bottom = b.y + b.h - (y - r);
  const smallest = Math.min(left, right, top, bottom);
  if (smallest === left) x = b.x - r;
  else if (smallest === right) x = b.x + b.w + r;
  else if (smallest === top) y = b.y - r;
  else y = b.y + b.h + r;
  return { x, y };
}
