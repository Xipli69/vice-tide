// Keyboard and mouse state, kept as one small object the game polls each
// frame. Also owns the "pressed this frame" edge detection used for entering
// cars, firing and pausing, so gameplay code never listens to events itself.
export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };

  addEventListener('keydown', (event) => {
    if (!keys.has(event.code)) pressed.add(event.code);
    keys.add(event.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  });
  addEventListener('keyup', (event) => keys.delete(event.code));
  addEventListener('blur', () => { keys.clear(); mouse.down = false; });

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (event.clientX - rect.left) * (canvas.width / rect.width);
    mouse.y = (event.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener('mousedown', () => { mouse.down = true; mouse.clicked = true; });
  addEventListener('mouseup', () => { mouse.down = false; });

  return {
    keys,
    mouse,
    down: (...codes) => codes.some((code) => keys.has(code)),
    hit: (...codes) => codes.some((code) => pressed.has(code)),
    endFrame() {
      pressed.clear();
      mouse.clicked = false;
    },
  };
}
