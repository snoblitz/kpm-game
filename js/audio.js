let context;
let master;
let muted = false;

const tones = {
  shoot: [800, 0.08, 0.08, 'square'],
  hit: [200, 0.15, 0.2, 'triangle'],
  start: [440, 0.1, 0.3, 'sine'],
  endwin: [300, 0.15, 0.4, 'sine', 880],
  'boss-hit': [160, 0.15, 0.15, 'triangle'],
  'boss-spawn': [80, 0.15, 0.5, 'sawtooth'],
  'boss-death': [120, 0.15, 0.5, 'sine', 440]
};

export function unlockAudio() {
  try {
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.4;
      master.connect(context.destination);
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
  } catch {
    // Audio support is optional; it must never interrupt a shot or a transition.
  }
}

function tone([frequency, volume, duration, type, endFrequency]) {
  if (!context || context.state !== 'running') return;
  try {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, context.currentTime);
    if (endFrequency) osc.frequency.exponentialRampToValueAtTime(endFrequency, context.currentTime + duration);
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    osc.start();
    osc.stop(context.currentTime + duration);
  } catch {
    // A browser/device audio failure must not change gameplay.
  }
}
export function playSound(type) { if (tones[type]) tone(tones[type]); }
export function playComboSound(count) {
  tone([120 * (1 + Math.min(count, 10) * 0.1), 0.15, 0.25, 'sawtooth']);
}
export function setMuted(value) {
  muted = value;
  if (master) master.gain.value = muted ? 0 : 0.4;
}
export function disposeAudio() {
  if (context && context.state !== 'closed') context.close().catch(() => {});
  context = undefined;
  master = undefined;
}
