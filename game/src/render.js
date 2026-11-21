// All canvas drawing except the HUD: the city ground, buildings with neon
// trim, trees and lamps, then every actor. The camera is a plain world-to-
// screen offset, and a soft dusk vignette plus lamp glow sells the hour —
// Port Vesper is always twenty minutes after sunset.
import { WORLD, PALETTE } from './config.js';

export function drawWorld(ctx, city, cam, w, h, time) {
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 0, w, h);

  const left = cam.x, top = cam.y, right = cam.x + w, bottom = cam.y + h;

  // Ground tiles per block: grass, sand near the water, dock concrete.
  for (let cx = 0; cx < city.cols; cx++) {
    for (let cy = 0; cy < city.rows; cy++) {
      const bx = cx * WORLD.block, by = cy * WORLD.block;
      if (bx > right || by > bottom || bx + WORLD.block < left || by + WORLD.block < top) continue;
      const isPark = cx === 5 && cy === 1;
      ctx.fillStyle = isPark ? PALETTE.grassDark : PALETTE.grass;
      ctx.fillRect(bx - left, by - top, WORLD.block, WORLD.block);
    }
  }

  // Beach and water on the east edge.
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(WORLD.width - 210 - left, -top, 80, WORLD.height);
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(WORLD.width - 130 - left, -top, 400, WORLD.height);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let y = 40; y < WORLD.height; y += 90) {
    const wave = Math.sin(time * 1.4 + y * 0.05) * 8;
    ctx.fillRect(WORLD.width - 110 - left + wave, y - top, 46, 4);
  }

  // Roads: asphalt bands with dashed centre lines.
  ctx.fillStyle = PALETTE.road;
  for (let cx = 0; cx <= city.cols; cx++) ctx.fillRect(cx * WORLD.block - left, -top, WORLD.road, WORLD.height);
  for (let cy = 0; cy <= city.rows; cy++) ctx.fillRect(-left, cy * WORLD.block - top, WORLD.width, WORLD.road);
  ctx.fillStyle = PALETTE.roadLine;
  for (let cx = 0; cx <= city.cols; cx++) {
    for (let y = 16; y < WORLD.height; y += 44) ctx.fillRect(cx * WORLD.block + WORLD.road / 2 - 2 - left, y - top, 4, 24);
  }
  for (let cy = 0; cy <= city.rows; cy++) {
    for (let x = 16; x < WORLD.width; x += 44) ctx.fillRect(x - left, cy * WORLD.block + WORLD.road / 2 - 2 - top, 24, 4);
  }

  // Sidewalk aprons under the buildings.
  ctx.fillStyle = PALETTE.sidewalk;
  for (const b of city.buildings) {
    if (b.x > right || b.y > bottom || b.x + b.w < left || b.y + b.h < top) continue;
    ctx.fillRect(b.x - 7 - left, b.y - 7 - top, b.w + 14, b.h + 14);
  }
  for (const b of city.buildings) {
    if (b.x > right || b.y > bottom || b.x + b.w < left || b.y + b.h < top) continue;
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x - left, b.y - top, b.w, b.h);
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(b.x - left, b.y - top, b.w, 10);
    ctx.fillRect(b.x - left, b.y - top, 10, b.h);
    if (b.trim) {
      ctx.fillStyle = b.trim;
      ctx.fillRect(b.x - left, b.y + b.h - 5 - top, b.w, 3);
    }
    if (b.name) {
      ctx.fillStyle = '#e8e3d8';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.name, b.x + b.w / 2 - left, b.y + b.h / 2 - top);
    }
  }

  // Trees and lamps.
  for (const t of city.trees) {
    ctx.fillStyle = '#2c5a33';
    ctx.beginPath(); ctx.arc(t.x - left, t.y - top, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath(); ctx.arc(t.x - 5 - left, t.y - 5 - top, t.r * 0.5, 0, Math.PI * 2); ctx.fill();
  }
  for (const l of city.lamps) {
    if (l.x < left - 30 || l.y < top - 30 || l.x > right + 30 || l.y > bottom + 30) continue;
    const glow = ctx.createRadialGradient(l.x - left, l.y - top, 2, l.x - left, l.y - top, 34);
    glow.addColorStop(0, 'rgba(255,210,120,0.35)');
    glow.addColorStop(1, 'rgba(255,210,120,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(l.x - 34 - left, l.y - 34 - top, 68, 68);
    ctx.fillStyle = '#ffd678';
    ctx.fillRect(l.x - 2 - left, l.y - 2 - top, 4, 4);
  }
}

export function drawCar(ctx, car, cam, isPlayerCar = false) {
  const x = car.x - cam.x, y = car.y - cam.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.fillRect(-21, -8, 48, 22);
  ctx.fillStyle = car.color;
  ctx.fillRect(-23, -11, 46, 22);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(-4, -9, 12, 18); // windshield band
  ctx.fillStyle = '#1b1e22';
  ctx.fillRect(-20, -13, 10, 5); ctx.fillRect(10, -13, 10, 5);
  ctx.fillRect(-20, 8, 10, 5); ctx.fillRect(10, 8, 10, 5);
  if (car.kind === 'police') {
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(-14, -11, 28, 22);
    ctx.fillStyle = car.color;
    ctx.fillRect(-23, -11, 9, 22); ctx.fillRect(14, -11, 9, 22);
    const flash = Math.sin(car.sirenPhase) > 0;
    ctx.fillStyle = flash ? '#ff4040' : '#4060ff';
    ctx.fillRect(-3, -4, 6, 8);
    ctx.fillStyle = flash ? 'rgba(255,64,64,0.25)' : 'rgba(64,96,255,0.25)';
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
  }
  if (car.health < 45) {
    ctx.fillStyle = 'rgba(60,60,60,0.5)';
    ctx.beginPath(); ctx.arc(14, 0, 8 + (45 - car.health) * 0.12, 0, Math.PI * 2); ctx.fill();
  }
  if (isPlayerCar) {
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.moveTo(0, -24); ctx.lineTo(6, -16); ctx.lineTo(-6, -16); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

export function drawPerson(ctx, person, cam, opts = {}) {
  const x = person.x - cam.x, y = person.y - cam.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.arc(1, 3, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = person.color;
  ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill(); // torso
  ctx.fillStyle = opts.skin ?? '#d9a066';
  ctx.beginPath(); ctx.arc(0, 0, 4.6, 0, Math.PI * 2); ctx.fill(); // head
  if (opts.aim !== undefined) {
    ctx.rotate(0); // gun arm toward aim
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(opts.aim) * 15, Math.sin(opts.aim) * 15);
    ctx.stroke();
  }
  if (opts.marker) {
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.moveTo(0, -26); ctx.lineTo(6, -17); ctx.lineTo(-6, -17); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

export function drawObjectiveMarker(ctx, target, cam, time) {
  const x = target.x - cam.x, y = target.y - cam.y;
  const bob = Math.sin(time * 3) * 5;
  ctx.save();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, 26 + bob * 0.4, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = PALETTE.gold;
  ctx.beginPath();
  ctx.moveTo(x, y - 44 + bob); ctx.lineTo(x + 9, y - 30 + bob); ctx.lineTo(x - 9, y - 30 + bob);
  ctx.closePath(); ctx.fill();
  // Light pillar so the goal reads from far away.
  const grad = ctx.createLinearGradient(0, y - 190, 0, y);
  grad.addColorStop(0, 'rgba(255,201,77,0)');
  grad.addColorStop(1, 'rgba(255,201,77,0.30)');
  ctx.fillStyle = grad;
  ctx.fillRect(x - 5, y - 190, 10, 190);
  ctx.restore();
}
