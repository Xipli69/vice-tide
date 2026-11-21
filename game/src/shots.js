// Deterministic screenshot scenes. The maker opens the game with
// ?shot=<name>&seed=<n> and the game builds one frozen, fully composed
// moment — title, a police chase, a mission on foot, the ending — with the
// HUD on, so the screenshots in screenshots/ are real renders of this code.
export function applyShotScene(game, name) {
  const { player, state } = game;
  state.shotMode = name;
  if (name === 'start') {
    state.screen = 'title';
    player.x = 1500; player.y = 1250;
    game.cameraSnap();
    return;
  }
  state.screen = 'playing';
  game.startMission(0, true);
  if (name === 'chase') {
    // Mid-chase: Jax in a stolen coupe, three stars, police on his tail,
    // traffic ahead, the delivery objective marked across town.
    const car = game.cars.find((c) => c.kind === 'parked');
    game.enterCar(car, true);
    car.x = 1500; car.y = 890; car.angle = 0; car.speed = 300;
    player.x = car.x; player.y = car.y;
    game.setWanted(3);
    game.spawnPolice(3);
    game.police.forEach((cop, i) => {
      cop.x = car.x - 150 - i * 110;
      cop.y = car.y - 24 + (i % 2) * 48;
      cop.angle = 0; cop.speed = 280;
    });
    game.cameraSnap();
  } else if (name === 'mission') {
    // On foot at the docks for the warehouse job, thugs in view, Rico's
    // marker logic replaced by the mission objective pillar.
    game.startMission(4, true);
    player.x = 700; player.y = 2320;
    player.angle = -0.6;
    game.thugs = game.makeThugs();
    game.setWanted(2);
    game.cameraSnap();
  } else if (name === 'end') {
    state.screen = 'won';
    state.money = 8000;
    state.debtPaid = 8000;
    player.x = 2940; player.y = 2310;
    game.cameraSnap();
  }
}
