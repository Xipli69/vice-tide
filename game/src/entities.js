// Everyone who is not the player: parked cars waiting to be stolen, traffic
// driving the road grid, pedestrians on the sidewalks, police who answer the
// wanted level, and the rival thugs of the warehouse mission. Each kind has
// one update function here so main.js stays about the player and the story.
import { WORLD, CAR } from './config.js';
import { makeRandom, clamp, distance, angleLerp } from './random.js';
import { isRoad, isWater, pushOutOfBuildings } from './world.js';

const CAR_COLORS = ['#c94f42', '#4277c9', '#e0b13e', '#58a05c', '#d7d7d7', '#7042c9', '#e07b39', '#3fb3a9'];

let nextId = 1;

export function makeCar(x, y, angle, color, kind = 'civilian') {
  return {
    id: nextId++, kind, x, y, angle, speed: 0, color,
    health: 100, driver: kind !== 'parked', sirenPhase: Math.random() * 6,
    stuckTime: 0, laneOffset: 26,
  };
}

export function spawnParkedCars(city, seed) {
  const rand = makeRandom(seed * 31 + 7);
  const cars = [];
  const spots = [
    [300, 2060], [760, 620], [1180, 1100], [1620, 240], [2050, 1480],
    [2480, 700], [2900, 1960], [520, 1480], [1960, 2060], [2820, 300],
  ];
  for (const [x, y] of spots) {
    cars.push(makeCar(x + rand.range(-20, 20), y + rand.range(-14, 14), rand.chance(0.5) ? 0 : Math.PI, rand.pick(CAR_COLORS), 'parked'));
  }
  // The one car the story cares about: the collector's gold coupe, always
  // parked by the marina in the south-east, always the same colour.
  cars.push(makeCar(2640, 1980, 0, '#e0b13e', 'parked'));
  return cars;
}

export function spawnTraffic(seed, count = 15) {
  const rand = makeRandom(seed * 57 + 3);
  const cars = [];
  for (let i = 0; i < count; i++) {
    // Start on a random road: snap one axis into a road band.
    const horizontal = rand.chance(0.5);
    const laneBand = rand.int(0, 5);
    const along = rand.range(80, horizontal ? WORLD.width - 200 : WORLD.height - 80);
    const x = horizontal ? along : laneBand * WORLD.block + 30 + rand.pick([0, 58]);
    const y = horizontal ? laneBand * WORLD.block + 30 + rand.pick([0, 58]) : along;
    const angle = horizontal ? (x % 118 < 59 ? 0 : Math.PI) : (y % 118 < 59 ? Math.PI / 2 : -Math.PI / 2);
    const car = makeCar(x, y, angle, rand.pick(CAR_COLORS), 'traffic');
    car.speed = rand.range(70, 120);
    cars.push(car);
  }
  return cars;
}

export function spawnPedestrians(seed, count = 42) {
  const rand = makeRandom(seed * 91 + 21);
  const peds = [];
  for (let i = 0; i < count; i++) {
    peds.push({
      id: nextId++, x: rand.range(140, WORLD.width - 260), y: rand.range(140, WORLD.height - 140),
      angle: rand.range(0, Math.PI * 2), speed: rand.range(26, 48),
      color: rand.pick(['#e8e3d8', '#c94f6d', '#4f79c9', '#e0b13e', '#58a05c', '#333333']),
      panic: 0, wanderAt: rand.range(0, 4),
    });
  }
  return peds;
}

export function spawnThugs(points) {
  return points.map(([x, y], i) => ({
    id: nextId++, x, y, angle: 0, health: 40, color: '#7a1f2b',
    cooldown: 1 + i * 0.4, alive: true,
  }));
}

// Traffic drives straight along its road and turns at some intersections;
// it slows for the car ahead and stops (briefly) for a crash.
export function updateTrafficCar(car, dt, city, others) {
  let want = 105;
  for (const other of others) {
    if (other === car) continue;
    const aheadX = car.x + Math.cos(car.angle) * 52;
    const aheadY = car.y + Math.sin(car.angle) * 52;
    if (distance(aheadX, aheadY, other.x, other.y) < 30) want = 0;
  }
  car.speed += clamp(want - car.speed, -220 * dt, 90 * dt);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;

  const nearIntersection =
    Math.abs(car.x % WORLD.block) < 60 && Math.abs(car.y % WORLD.block) < 60;
  if (nearIntersection && Math.random() < dt * 0.55) {
    car.angle += (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2);
    car.angle = Math.round(car.angle / (Math.PI / 2)) * (Math.PI / 2);
  }
  if (car.x < 40 || car.y < 40 || car.x > WORLD.width - 170 || car.y > WORLD.height - 40 || !isRoad(car.x, car.y)) {
    car.angle += Math.PI;
    car.x = clamp(car.x, 45, WORLD.width - 175);
    car.y = clamp(car.y, 45, WORLD.height - 45);
  }
  const fixed = pushOutOfBuildings(city, car.x, car.y, 16);
  car.x = fixed.x; car.y = fixed.y;
}

export function updatePedestrian(ped, dt, city, danger) {
  ped.wanderAt -= dt;
  if (ped.wanderAt <= 0) {
    ped.wanderAt = 2 + Math.random() * 3;
    ped.angle = Math.random() * Math.PI * 2;
  }
  let speed = ped.speed;
  if (danger && distance(ped.x, ped.y, danger.x, danger.y) < 130) {
    ped.angle = Math.atan2(ped.y - danger.y, ped.x - danger.x);
    speed = 120;
    ped.panic = 1;
  } else ped.panic = Math.max(0, ped.panic - dt);
  let nx = ped.x + Math.cos(ped.angle) * speed * dt;
  let ny = ped.y + Math.sin(ped.angle) * speed * dt;
  if (isWater(nx, ny)) { ped.angle += Math.PI; return; }
  const fixed = pushOutOfBuildings(city, nx, ny, 10);
  if (fixed.x === nx && fixed.y === ny) { ped.x = nx; ped.y = ny; }
  else ped.angle += Math.PI / 2;
  ped.x = clamp(ped.x, 20, WORLD.width - 150);
  ped.y = clamp(ped.y, 20, WORLD.height - 20);
}

// Police cars hunt the player's position; at higher wanted levels they are
// faster and ram. A police car that gets close on foot starts a bust timer
// instead — that logic lives in main.js, which owns the player.
export function updatePoliceCar(car, dt, city, target, aggression) {
  const toTarget = Math.atan2(target.y - car.y, target.x - car.x);
  car.angle = angleLerp(car.angle, toTarget, Math.min(1, dt * 2.2));
  const dist = distance(car.x, car.y, target.x, target.y);
  const want = dist > 60 ? CAR.maxSpeed * (0.62 + aggression * 0.09) : 40;
  car.speed += clamp(want - car.speed, -300 * dt, 200 * dt);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  const fixed = pushOutOfBuildings(city, car.x, car.y, 16);
  if (fixed.x !== car.x || fixed.y !== car.y) car.speed *= 0.4;
  car.x = clamp(fixed.x, 24, WORLD.width - 150);
  car.y = clamp(fixed.y, 24, WORLD.height - 24);
  car.sirenPhase += dt * 9;
}

export function policeSpawnPoints(player) {
  // Spawn off-screen but on a road near the player.
  const spots = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.6;
    const x = clamp(player.x + Math.cos(a) * 560, 60, WORLD.width - 200);
    const y = clamp(player.y + Math.sin(a) * 560, 60, WORLD.height - 60);
    spots.push([x - (x % WORLD.block) + 30, y]);
  }
  return spots;
}
