/**
 * Sound Effect System
 * Generates dynamic sound effects using Web Audio API
 * @param {string} type - Type of sound to play (shoot, hit, kill, etc.)
 */
export function playSound(type) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  // Sound effect presets
  const tone = {
    shoot: [800, 0.2, 0.08, 'square'],     // High-pitched shot sound
    hit: [200, 0.3, 0.2, 'triangle'],      // Impact sound
    kill: [120, 0.4, 0.3, 'sawtooth'],     // Enemy defeat sound
    combo: [440, 0.5, 0.2, 'sine'],        // Combo bonus sound
    restart: [700, 0.3, 0.25, 'sine'],     // Game restart sound
    start: [440, 0.15, 0.3, 'sine'],       // Game start sound
    endfail: [600, 0.2, 0.4, 'triangle', 220],  // Game over sound
    endwin: [300, 0.25, 0.4, 'sine', 880]      // Victory sound
  }[type];
  
  if (!tone) return;
  
  // Configure oscillator
  osc.type = tone[3];
  osc.frequency.setValueAtTime(tone[0], ctx.currentTime);
  gain.gain.setValueAtTime(tone[1], ctx.currentTime);
  
  // Special effects for end sounds
  if (type === 'endfail' || type === 'endwin') {
    osc.frequency.exponentialRampToValueAtTime(tone[4], ctx.currentTime + tone[2]);
  }
  
  // Fade out
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + tone[2] + 0.1);
  osc.start();
  osc.stop(ctx.currentTime + tone[2] + 0.1);
}

/**
 * Kill Combo Sound Effect
 * Creates a dynamic sound effect based on combo count
 * @param {number} comboCount - Current combo count
 */
export function playComboSound(comboCount) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(120, ctx.currentTime);
  gain.gain.setValueAtTime(0.4 + (comboCount * 0.1), ctx.currentTime);
  
  osc.frequency.exponentialRampToValueAtTime(
    120 * (1 + comboCount * 0.1),
    ctx.currentTime + 0.2
  );
  
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
} 