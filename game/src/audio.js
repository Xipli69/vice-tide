// Procedural sound with the Web Audio API: engine hum, sirens, gunshots,
// pickup chimes and UI clicks are all synthesised, so the game ships with no
// audio files at all. Everything is fire-and-forget and safe before the first
// user gesture (the context simply stays suspended until then).
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function blip(freq, seconds, type = 'square', volume = 0.12, slide = 0) {
    const ac = ensure();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), ac.currentTime + seconds);
    gain.gain.setValueAtTime(volume, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + seconds);
    osc.connect(gain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + seconds);
  }

  return {
    unlock() { ensure(); },
    click() { blip(660, 0.06, 'square', 0.06); },
    pickup() { blip(880, 0.09, 'sine', 0.14); setTimeout(() => blip(1320, 0.12, 'sine', 0.12), 70); },
    cash() { blip(1180, 0.07, 'triangle', 0.14); setTimeout(() => blip(1560, 0.1, 'triangle', 0.12), 60); },
    shot() { blip(190, 0.09, 'sawtooth', 0.16, -120); },
    hit() { blip(120, 0.12, 'square', 0.14, -60); },
    crash() { blip(80, 0.22, 'sawtooth', 0.2, -40); },
    sirenStep(step) { blip(step % 2 ? 920 : 700, 0.16, 'triangle', 0.045); },
    missionDone() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.14, 'triangle', 0.12), i * 90)); },
    setEngine(on, speedRatio) {
      const ac = ensure();
      if (!ac) return;
      if (on && !engineOsc) {
        engineOsc = ac.createOscillator();
        engineGain = ac.createGain();
        engineOsc.type = 'sawtooth';
        engineGain.gain.value = 0.035;
        engineOsc.connect(engineGain).connect(ac.destination);
        engineOsc.start();
      }
      if (!on && engineOsc) {
        engineOsc.stop();
        engineOsc = null;
        engineGain = null;
      }
      if (engineOsc) engineOsc.frequency.value = 55 + Math.abs(speedRatio) * 130;
    },
  };
}
