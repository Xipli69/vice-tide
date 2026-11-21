// VICE TIDE — the game itself. Jax Marlowe owes fixer Delia Cross $8,000 in
// Port Vesper; six jobs across one dusk pay it off. Explore on foot or steal
// any parked car, outrun a five-star wanted system, fight the Sarto guards,
// and reach the harbour ferry in the finale. Canvas 2D, no assets, no
// network: every module under src/ is loaded by index.html as an ES module.
import { WORLD, PLAYER, CAR, WANTED, PALETTE, STORY } from './config.js';
import { clamp, distance } from './random.js';
import { buildCity, isWater, pushOutOfBuildings } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import {
  makeCar, spawnParkedCars, spawnTraffic, spawnPedestrians, spawnThugs,
  updateTrafficCar, updatePedestrian, updatePoliceCar, policeSpawnPoints,
} from './entities.js';
import { drawWorld, drawCar, drawPerson, drawObjectiveMarker } from './render.js';
import { MISSIONS } from './missions.js';
import { applyShotScene } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') ?? 7) || 7;

const city = buildCity(seed);
const input = createInput(canvas);
const audio = createAudio();

const state = {
  screen: 'title',
  money: 0,
  debtPaid: 0,
  missionIndex: -1,
  legIndex: 0,
  missionTime: 0,
  wanted: 0,
  unseenTime: 0,
  bustTime: 0,
  message: '',
  messageTime: 0,
  briefTime: 0,
  shake: 0,
  shotMode: null,
  savedGame: loadSave(),
};

const player = {
  x: PLAYER.startX, y: PLAYER.startY, angle: -Math.PI / 2,
  health: PLAYER.health, car: null, aim: 0, dead: false,
};

let cars = spawnParkedCars(city, seed);
let traffic = spawnTraffic(seed);
let peds = spawnPedestrians(seed);
let police = [];
let thugs = [];
let bullets = [];
let particles = [];
let camera = { x: 0, y: 0 };
let elapsed = 0;
let sirenTimer = 0;

function loadSave() {
  try {
    const raw = localStorage.getItem('vice-tide-save');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function writeSave() {
  try {
    localStorage.setItem('vice-tide-save', JSON.stringify({
      missionIndex: state.missionIndex, money: state.money, debtPaid: state.debtPaid,
    }));
  } catch { /* private mode: saving is best-effort */ }
}
function clearSave() {
  try { localStorage.removeItem('vice-tide-save'); } catch { /* ignore */ }
  state.savedGame = null;
}

function currentMission() {
  return state.missionIndex >= 0 && state.missionIndex < MISSIONS.length
    ? MISSIONS[state.missionIndex] : null;
}
function currentLeg() {
  const m = currentMission();
  return m ? m.legs[state.legIndex] ?? null : null;
}

function setWanted(level) {
  state.wanted = clamp(level, 0, WANTED.maxStars);
  state.unseenTime = 0;
}

function spawnPolice(count) {
  const spots = policeSpawnPoints(player);
  for (let i = 0; i < count; i++) {
    const [x, y] = spots[i % spots.length];
    const cop = makeCar(x, y, 0, '#2b3a4a', 'police');
    police.push(cop);
  }
}

function makeThugs() {
  return spawnThugs([[760, 2280], [880, 2380], [700, 2440]]);
}

function startMission(index, silent = false) {
  state.missionIndex = index;
  state.legIndex = 0;
  const mission = MISSIONS[index];
  state.missionTime = mission.time ?? 0;
  state.briefTime = silent ? 0 : 6;
  if (!silent) audio.click();
  if (mission.legs.some((leg) => leg.kind === 'clear')) thugs = makeThugs();
}

function say(text, seconds = 3.5) {
  state.message = text;
  state.messageTime = seconds;
}

function completeLeg() {
  const mission = currentMission();
  const leg = currentLeg();
  if (leg?.wanted) setWanted(Math.max(state.wanted, leg.wanted));
  audio.pickup();
  state.legIndex += 1;
  if (state.legIndex >= mission.legs.length) completeMission();
  else say('Objective updated', 2.2);
}

function completeMission() {
  const mission = currentMission();
  state.money += mission.pay;
  state.debtPaid += mission.pay;
  audio.missionDone();
  say(`${mission.title} complete — $${mission.pay} toward the debt`, 4.5);
  const next = state.missionIndex + 1;
  if (next >= MISSIONS.length) {
    state.screen = 'won';
    clearSave();
    audio.setEngine(false, 0);
    return;
  }
  writeSave();
  startMission(next);
}

function failMission(reason) {
  say(reason + ' — the job restarts', 4);
  const mission = currentMission();
  state.legIndex = 0;
  state.missionTime = mission?.time ?? 0;
  player.health = PLAYER.health;
  setWanted(Math.min(state.wanted, 1));
}

function enterCar(car, silent = false) {
  player.car = car;
  car.kind = car.kind === 'parked' ? 'stolen' : car.kind;
  car.driver = true;
  player.x = car.x; player.y = car.y;
  if (!silent) {
    audio.click();
    if (car.color === '#e0b13e') say('Coupe taken. Delia is watching the tracker.', 3);
  }
}
function exitCar() {
  const car = player.car;
  if (!car) return;
  car.kind = 'parked';
  car.speed = 0;
  player.car = null;
  player.x = car.x + 30; player.y = car.y + 10;
  audio.setEngine(false, 0);
  audio.click();
}

function nearestParked(maxDist) {
  let best = null, bestDist = maxDist;
  for (const car of [...cars, ...traffic]) {
    if (car.kind !== 'parked' && car.kind !== 'traffic') continue;
    const d = distance(player.x, player.y, car.x, car.y);
    if (d < bestDist) { best = car; bestDist = d; }
  }
  return best;
}

function addParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y, vx: (Math.random() - 0.5) * 190, vy: (Math.random() - 0.5) * 190,
      life: 0.45, color,
    });
  }
}

function shoot(fromX, fromY, angle, friendly) {
  bullets.push({ x: fromX, y: fromY, vx: Math.cos(angle) * 640, vy: Math.sin(angle) * 640, life: 0.55, friendly });
  audio.shot();
}

function updatePlayer(dt) {
  if (player.car) {
    const car = player.car;
    const fwd = input.down('KeyW', 'ArrowUp');
    const back = input.down('KeyS', 'ArrowDown');
    const left = input.down('KeyA', 'ArrowLeft');
    const right = input.down('KeyD', 'ArrowRight');
    if (fwd) car.speed += CAR.accel * dt;
    if (back) car.speed -= (car.speed > 10 ? CAR.brake : CAR.reverse) * dt;
    if (!fwd && !back) car.speed -= car.speed * 0.7 * dt;
    car.speed = clamp(car.speed, -130, CAR.maxSpeed);
    const steer = (left ? -1 : 0) + (right ? 1 : 0);
    if (steer && Math.abs(car.speed) > 8) {
      car.angle += steer * CAR.turnRate * dt * Math.sign(car.speed) * clamp(Math.abs(car.speed) / 130, 0.35, 1);
    }
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const fixed = pushOutOfBuildings(city, nx, ny, 17);
    if ((fixed.x !== nx || fixed.y !== ny) && Math.abs(car.speed) > 130) {
      car.health -= 9; state.shake = 0.25; audio.crash();
      addParticles(car.x, car.y, '#ffb14d', 10);
      if (state.wanted === 0 && state.missionIndex >= 0) setWanted(1);
    }
    car.x = clamp(fixed.x, 24, WORLD.width - 140);
    car.y = clamp(fixed.y, 24, WORLD.height - 24);
    if (isWater(car.x + 60, car.y)) { car.x -= 60; car.speed = 0; }
    player.x = car.x; player.y = car.y;
    player.angle = car.angle;
    audio.setEngine(true, car.speed / CAR.maxSpeed);
    if (input.hit('KeyE', 'KeyF')) exitCar();
    // Running someone down is a crime the city notices.
    for (const ped of peds) {
      if (Math.abs(car.speed) > 90 && distance(car.x, car.y, ped.x, ped.y) < 22) {
        ped.panic = 2; ped.x += Math.cos(car.angle) * 30; ped.y += Math.sin(car.angle) * 30;
        setWanted(Math.max(state.wanted, 2));
        addParticles(ped.x, ped.y, '#c94f6d', 6);
      }
    }
    return;
  }

  audio.setEngine(false, 0);
  let mx = 0, my = 0;
  if (input.down('KeyW', 'ArrowUp')) my -= 1;
  if (input.down('KeyS', 'ArrowDown')) my += 1;
  if (input.down('KeyA', 'ArrowLeft')) mx -= 1;
  if (input.down('KeyD', 'ArrowRight')) mx += 1;
  const len = Math.hypot(mx, my) || 1;
  const speed = input.down('ShiftLeft', 'ShiftRight') ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
  const nx = player.x + (mx / len) * speed * dt * (mx || my ? 1 : 0);
  const ny = player.y + (my / len) * speed * dt * (mx || my ? 1 : 0);
  const fixed = pushOutOfBuildings(city, nx, ny, PLAYER.radius);
  player.x = clamp(fixed.x, 16, WORLD.width - 140);
  player.y = clamp(fixed.y, 16, WORLD.height - 16);
  if (mx || my) player.angle = Math.atan2(my, mx);
  player.aim = Math.atan2(
    (input.mouse.y + camera.y) - player.y,
    (input.mouse.x + camera.x) - player.x,
  );
  if (input.hit('KeyE', 'KeyF')) {
    const car = nearestParked(44);
    if (car) {
      if (car.kind === 'traffic') { setWanted(Math.max(state.wanted, 1)); traffic = traffic.filter((c) => c !== car); cars.push(car); }
      enterCar(car);
    }
  }
  const leg = currentLeg();
  const inClearZone = leg?.kind === 'clear' && distance(player.x, player.y, leg.at.x, leg.at.y) < leg.radius;
  if ((input.mouse.clicked || input.hit('Space')) && (inClearZone || thugs.some((t) => t.alive))) {
    shoot(player.x, player.y, player.aim, true);
  }
}

function updateWanted(dt) {
  // Police pressure scales with stars: more cars, kept topped up.
  const wantCount = state.wanted === 0 ? 0 : state.wanted + 1;
  if (police.length < wantCount && state.wanted >= 1) {
    sirenTimer -= dt;
    if (sirenTimer <= 0) { spawnPolice(1); sirenTimer = 2.5; }
  }
  if (police.length > wantCount + 2) police.length = wantCount + 2;
  let seen = false;
  for (const cop of police) {
    updatePoliceCar(cop, dt, city, player, state.wanted);
    if (distance(cop.x, cop.y, player.x, player.y) < 330) seen = true;
    // Ramming damages both cars.
    if (player.car && distance(cop.x, cop.y, player.car.x, player.car.y) < 34) {
      player.car.health -= 14 * dt * 4;
      cop.speed *= 0.92;
      state.shake = Math.max(state.shake, 0.12);
    }
  }
  if (state.wanted > 0) {
    if (seen) state.unseenTime = 0;
    else {
      state.unseenTime += dt;
      if (state.unseenTime > WANTED.decaySeconds) { setWanted(state.wanted - 1); say('You shook the heat — for now', 2.4); }
    }
  }
  // Bust: a cop beside a player on foot fills the bust meter.
  const copNear = !player.car && police.some((c) => distance(c.x, c.y, player.x, player.y) < 52);
  if (copNear && state.wanted > 0) {
    state.bustTime += dt;
    if (state.bustTime > 2.2) { state.screen = 'busted'; audio.setEngine(false, 0); }
  } else state.bustTime = Math.max(0, state.bustTime - dt * 1.6);
  if (player.car && player.car.health <= 0) {
    addParticles(player.car.x, player.car.y, '#ff7b39', 22);
    exitCar();
    player.health -= 25;
    say('The car is wrecked — run!', 3);
  }
}

function updateWorld(dt) {
  for (const car of traffic) updateTrafficCar(car, dt, city, [...traffic, ...police, ...(player.car ? [player.car] : [])]);
  const danger = player.car && Math.abs(player.car.speed) > 120 ? player.car : null;
  for (const ped of peds) updatePedestrian(ped, dt, city, danger);
  // Bullets.
  for (const b of bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.friendly) {
      for (const thug of thugs) {
        if (thug.alive && distance(b.x, b.y, thug.x, thug.y) < 13) {
          thug.health -= 22; b.life = 0; audio.hit();
          addParticles(thug.x, thug.y, '#c94f6d', 5);
          if (thug.health <= 0) { thug.alive = false; addParticles(thug.x, thug.y, '#7a1f2b', 14); }
        }
      }
    } else if (distance(b.x, b.y, player.x, player.y) < 13 && !player.car) {
      player.health -= 7; b.life = 0; state.shake = 0.15; audio.hit();
    }
  }
  bullets = bullets.filter((b) => b.life > 0);
  // Thugs guard their warehouse and shoot back inside the clear leg.
  const leg = currentLeg();
  for (const thug of thugs) {
    if (!thug.alive) continue;
    thug.angle = Math.atan2(player.y - thug.y, player.x - thug.x);
    thug.cooldown -= dt;
    if (leg?.kind === 'clear' && thug.cooldown <= 0 && distance(thug.x, thug.y, player.x, player.y) < 250) {
      shoot(thug.x, thug.y, thug.angle, false);
      thug.cooldown = 1.1 + Math.random() * 0.7;
    }
  }
  for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
  particles = particles.filter((p) => p.life > 0);
}

function updateMission(dt) {
  const mission = currentMission();
  if (!mission) return;
  if (mission.time) {
    state.missionTime -= dt;
    if (state.missionTime <= 0) { failMission('Out of time'); return; }
  }
  const leg = currentLeg();
  if (!leg) return;
  if (leg.kind === 'goto' || leg.kind === 'steal') {
    const near = distance(player.x, player.y, leg.at.x, leg.at.y) < leg.radius;
    if (leg.kind === 'steal') {
      if (player.car?.color === '#e0b13e' && near) completeLeg();
    } else if (near) completeLeg();
  } else if (leg.kind === 'clear') {
    if (thugs.length && thugs.every((t) => !t.alive)) completeLeg();
  }
}

function update(dt) {
  elapsed += dt;
  state.messageTime = Math.max(0, state.messageTime - dt);
  state.briefTime = Math.max(0, state.briefTime - dt);
  state.shake = Math.max(0, state.shake - dt);
  if (state.screen === 'title') {
    if (input.hit('Enter', 'Space')) {
      audio.unlock(); audio.click();
      state.screen = 'playing';
      if (state.savedGame && state.missionIndex === -1) {
        state.money = state.savedGame.money ?? 0;
        state.debtPaid = state.savedGame.debtPaid ?? 0;
        startMission(clamp(state.savedGame.missionIndex ?? 0, 0, MISSIONS.length - 1));
      } else if (state.missionIndex === -1) startMission(0);
    }
    return;
  }
  if (state.screen !== 'playing') {
    if (input.hit('Enter', 'Space')) location.reload();
    return;
  }
  if (input.hit('KeyP', 'Escape')) { state.screen = 'paused'; return; }
  updatePlayer(dt);
  updateWorld(dt);
  updateWanted(dt);
  updateMission(dt);
  if (player.health <= 0) { state.screen = 'wasted'; audio.setEngine(false, 0); }
  // Camera follows, with a look-ahead in a fast car.
  const look = player.car ? clamp(player.car.speed * 0.35, -90, 130) : 0;
  const tx = clamp(player.x + Math.cos(player.angle) * look - canvas.width / 2, 0, WORLD.width - canvas.width);
  const ty = clamp(player.y + Math.sin(player.angle) * look - canvas.height / 2, 0, WORLD.height - canvas.height);
  camera.x += (tx - camera.x) * Math.min(1, dt * 5);
  camera.y += (ty - camera.y) * Math.min(1, dt * 5);
}

function drawMinimap() {
  const mw = 188, mh = 142, x0 = 16, y0 = canvas.height - mh - 16;
  ctx.fillStyle = 'rgba(10,14,20,0.78)';
  ctx.fillRect(x0, y0, mw, mh);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.strokeRect(x0, y0, mw, mh);
  const sx = mw / WORLD.width, sy = mh / WORLD.height;
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(x0 + (WORLD.width - 130) * sx, y0, 130 * sx, mh);
  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  for (const b of city.buildings) ctx.fillRect(x0 + b.x * sx, y0 + b.y * sy, Math.max(2, b.w * sx), Math.max(2, b.h * sy));
  const leg = currentLeg();
  if (leg) {
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath(); ctx.arc(x0 + leg.at.x * sx, y0 + leg.at.y * sy, 4.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#4060ff';
  for (const cop of police) ctx.fillRect(x0 + cop.x * sx - 2, y0 + cop.y * sy - 2, 4, 4);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(x0 + player.x * sx, y0 + player.y * sy, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('PORT VESPER', x0 + 7, y0 + 14);
}

function drawHUD() {
  const mission = currentMission();
  const leg = currentLeg();
  // Top bar: money and debt.
  ctx.fillStyle = 'rgba(10,14,20,0.66)';
  ctx.fillRect(14, 14, 300, 56);
  ctx.fillStyle = '#7ee787'; ctx.font = 'bold 21px system-ui, sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('$' + state.money.toLocaleString(), 26, 40);
  ctx.fillStyle = '#e8e3d8'; ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`Debt paid $${state.debtPaid.toLocaleString()} / $${STORY.debt.toLocaleString()}`, 26, 60);
  // Wanted stars.
  ctx.font = '24px system-ui, sans-serif'; ctx.textAlign = 'right';
  for (let i = 0; i < WANTED.maxStars; i++) {
    ctx.fillStyle = i < state.wanted ? PALETTE.gold : 'rgba(255,255,255,0.22)';
    ctx.fillText('★', canvas.width - 24 - (WANTED.maxStars - 1 - i) * 27, 42);
  }
  if (state.bustTime > 0.15) {
    ctx.fillStyle = '#ff4040'; ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('BUSTED…', canvas.width - 24, 68);
  }
  // Objective banner.
  if (mission && leg && state.screen === 'playing') {
    ctx.fillStyle = 'rgba(10,14,20,0.66)';
    const label = `${mission.title}: ${leg.label}`;
    ctx.font = '14px system-ui, sans-serif';
    const w = Math.min(canvas.width - 360, ctx.measureText(label).width + 30);
    ctx.fillRect((canvas.width - w) / 2, 14, w, 34);
    ctx.fillStyle = '#ffd678'; ctx.textAlign = 'center';
    ctx.fillText(label, canvas.width / 2, 36);
    if (mission.time) {
      ctx.fillStyle = state.missionTime < 25 ? '#ff6060' : '#e8e3d8';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(Math.ceil(state.missionTime) + 's', canvas.width / 2, 66);
    }
    // Off-screen direction arrow to the objective.
    const dx = leg.at.x - player.x, dy = leg.at.y - player.y;
    if (Math.hypot(dx, dy) > 330) {
      const a = Math.atan2(dy, dx);
      const ax = canvas.width / 2 + Math.cos(a) * 74, ay = 118 + Math.sin(a) * 30;
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(a);
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(-8, -7); ctx.lineTo(-8, 7); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  // Briefing card at a mission's start.
  if (state.briefTime > 0 && mission) {
    ctx.fillStyle = 'rgba(10,14,20,0.82)';
    ctx.fillRect(canvas.width / 2 - 320, canvas.height - 128, 640, 66);
    ctx.fillStyle = PALETTE.neonCyan; ctx.font = 'bold 14px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(mission.title.toUpperCase(), canvas.width / 2, canvas.height - 104);
    ctx.fillStyle = '#e8e3d8'; ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(mission.brief, canvas.width / 2, canvas.height - 82);
  }
  if (state.messageTime > 0) {
    ctx.fillStyle = 'rgba(10,14,20,0.7)';
    ctx.font = 'bold 15px system-ui, sans-serif';
    const w = ctx.measureText(state.message).width + 34;
    ctx.fillRect((canvas.width - w) / 2, 84, w, 32);
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
    ctx.fillText(state.message, canvas.width / 2, 105);
  }
  // Health + vehicle state, bottom right.
  ctx.fillStyle = 'rgba(10,14,20,0.66)';
  ctx.fillRect(canvas.width - 216, canvas.height - 62, 200, 46);
  ctx.fillStyle = '#40222a'; ctx.fillRect(canvas.width - 204, canvas.height - 52, 176, 9);
  ctx.fillStyle = player.health > 30 ? '#58c96b' : '#ff5050';
  ctx.fillRect(canvas.width - 204, canvas.height - 52, 176 * clamp(player.health, 0, 100) / 100, 9);
  ctx.fillStyle = '#e8e3d8'; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'left';
  const status = player.car
    ? `DRIVING — ${Math.abs(Math.round(player.car.speed * 0.36))} km/h · hull ${Math.max(0, Math.round(player.car.health))}%`
    : 'ON FOOT — E steal car · Shift sprint';
  ctx.fillText(status, canvas.width - 204, canvas.height - 26);
  drawMinimap();
}

function drawCentered(lines, accent = PALETTE.neonPink) {
  ctx.fillStyle = 'rgba(8,10,18,0.72)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  lines.forEach((line, i) => {
    ctx.fillStyle = i === 0 ? accent : '#e8e3d8';
    ctx.font = i === 0 ? 'bold 64px system-ui, sans-serif' : '17px system-ui, sans-serif';
    ctx.fillText(line, canvas.width / 2, canvas.height / 2 - 90 + i * 42);
  });
}

function draw() {
  ctx.save();
  if (state.shake > 0) ctx.translate((Math.random() - 0.5) * 8 * state.shake * 4, (Math.random() - 0.5) * 8 * state.shake * 4);
  drawWorld(ctx, city, camera, canvas.width, canvas.height, elapsed);
  const leg = currentLeg();
  if (leg && state.screen === 'playing') drawObjectiveMarker(ctx, leg.at, camera, elapsed);
  for (const car of cars) if (!player.car || car !== player.car) drawCar(ctx, car, camera);
  for (const car of traffic) drawCar(ctx, car, camera);
  for (const cop of police) drawCar(ctx, cop, camera);
  for (const ped of peds) drawPerson(ctx, ped, camera);
  for (const thug of thugs) if (thug.alive) drawPerson(ctx, thug, camera, { marker: true });
  if (player.car) drawCar(ctx, player.car, camera, true);
  else drawPerson(ctx, { x: player.x, y: player.y, color: '#ff4d8d' }, camera, { aim: player.aim });
  ctx.fillStyle = '#ffe9a8';
  for (const b of bullets) ctx.fillRect(b.x - camera.x - 2, b.y - camera.y - 2, 4, 4);
  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - camera.x - 2, p.y - camera.y - 2, 4, 4);
  }
  // Dusk vignette.
  const grad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * 0.42, canvas.width / 2, canvas.height / 2, canvas.height * 0.85);
  grad.addColorStop(0, 'rgba(20,10,40,0)');
  grad.addColorStop(1, 'rgba(20,10,40,0.34)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  if (state.screen === 'title') {
    drawCentered([
      'VICE TIDE',
      `${STORY.hero} owes ${STORY.fixer} $${STORY.debt.toLocaleString()} in ${STORY.city}.`,
      'Six jobs. One dusk. Every cop in town.',
      state.savedGame ? 'Press ENTER — continue the night (save found)' : 'Press ENTER — start the night',
      'WASD drive & walk · E enter/steal car · Shift sprint · mouse aim, click to shoot · P pause',
    ]);
    return;
  }
  drawHUD();
  if (state.screen === 'paused') drawCentered(['PAUSED', 'Press P, Esc or Enter to keep driving the night'], PALETTE.neonCyan);
  if (state.screen === 'busted') drawCentered(['BUSTED', 'The Vesper PD finally caught up with Jax.', 'Press ENTER to try the night again'], '#ff4040');
  if (state.screen === 'wasted') drawCentered(['WASTED', 'Jax wakes up in Vesper General. The debt is still there.', 'Press ENTER to try the night again'], '#ff4040');
  if (state.screen === 'won') {
    drawCentered([
      'DEBT PAID',
      `Jax handed ${STORY.fixer} the last dollar as the harbour ferry sounded its horn.`,
      'Six jobs, one stolen coupe, three very annoyed police departments later — he is free.',
      `Final cash on hand: $${state.money.toLocaleString()} · Press ENTER to play the night again`,
    ], PALETTE.gold);
  }
}

// Game object handed to the screenshot scenes.
const game = {
  player, state, cars,
  get police() { return police; },
  get thugs() { return thugs; },
  set thugs(v) { thugs = v; },
  startMission, setWanted, spawnPolice, enterCar, makeThugs,
  cameraSnap() {
    camera.x = clamp(player.x - canvas.width / 2, 0, WORLD.width - canvas.width);
    camera.y = clamp(player.y - canvas.height / 2, 0, WORLD.height - canvas.height);
  },
};

if (params.get('shot')) {
  applyShotScene(game, params.get('shot'));
  // Frozen scenes still render one polished frame repeatedly.
  const freeze = () => { draw(); requestAnimationFrame(freeze); };
  freeze();
} else {
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state.screen === 'paused') {
      if (input.hit('KeyP', 'Escape', 'Enter')) state.screen = 'playing';
    } else update(dt);
    draw();
    input.endFrame();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
