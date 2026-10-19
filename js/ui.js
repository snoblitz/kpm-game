import { setMuted } from './audio.js';
import { formatTime } from './utils.js';

export class GameUI {
  constructor({ onStart, onRetry, onPause, onModeChange, onQualityChange }) {
    this.panel = document.getElementById('panel');
    this.title = document.getElementById('panelTitle');
    this.message = document.getElementById('message');
    this.stats = document.getElementById('results');
    this.start = document.getElementById('start');
    this.retry = document.getElementById('retry');
    this.mute = document.getElementById('mute');
    this.timer = document.getElementById('timer');
    this.remaining = document.getElementById('remaining');
    this.longestKill = document.getElementById('longestKill');
    this.score = document.getElementById('score');
    this.bossHealth = document.getElementById('bossHealth');
    this.crosshair = document.getElementById('crosshair');
    this.pause = document.getElementById('pause');
    this.mode = document.getElementById('controlMode');
    this.quality = document.getElementById('quality');
    this.showPerformance = document.getElementById('showPerformance');
    this.performance = document.getElementById('performance');
    this.feedback = document.getElementById('feedback');
    this.hitmarker = document.getElementById('hitmarker');
    this.feedbackTime = this.statsTime = 0;
    this.onQualityChange = () => onQualityChange(this.quality.value);
    this.onPerformance = () => { this.performance.hidden = !this.showPerformance.checked; };
    this.onPause = onPause;
    this.onModeChange = () => onModeChange(this.mode.value === 'touch');
    this.onStart = onStart;
    this.onRetry = onRetry;
    this.onMute = () => setMuted(this.mute.checked);
    this.start.addEventListener('click', this.onStart);
    this.retry.addEventListener('click', this.onRetry);
    this.mute.addEventListener('change', this.onMute);
    this.pause.addEventListener('click', this.onPause);
    this.mode.addEventListener('change', this.onModeChange);
    this.quality.addEventListener('change', this.onQualityChange);
    this.showPerformance.addEventListener('change', this.onPerformance);
  }
  setTouchMode(enabled) {
    this.touchMode = enabled;
    this.mode.value = enabled ? 'touch' : 'desktop';
    document.body.classList.toggle('touch-mode', enabled);
  }
  setPhase(phase) {
    const visible = ['ready', 'paused', 'results'].includes(phase);
    this.panel.hidden = !visible;
    this.crosshair.hidden = visible;
    this.pause.hidden = visible;
    if (visible) { this.feedback.hidden = this.hitmarker.hidden = true; this.feedbackTime = 0; }
    this.start.hidden = phase === 'results';
    this.retry.hidden = phase !== 'results';
    this.stats.hidden = phase !== 'results';
    this.title.textContent = phase === 'paused' ? 'Run paused' : phase === 'results' ? 'Range cleared' : 'KPM';
    this.start.textContent = phase === 'paused' ? 'Resume' : 'Start';
    this.message.textContent = phase === 'paused'
      ? 'Your run is paused. Resume when you are ready.'
      : 'Clear 13 targets, defeat the boss, and beat your best time.';
    if (visible) (phase === 'results' ? this.retry : this.start).focus();
  }
  update(run, remaining, boss) {
    this.timer.textContent = formatTime(run.elapsed);
    this.remaining.textContent = boss ? 'Boss: ' + Math.ceil(boss.health) + ' HP' : 'Enemies: ' + remaining;
    this.longestKill.textContent = 'Longest kill: ' + run.longestKill.toFixed(2) + 'm';
    const stats = run.summary();
    this.score.textContent = 'KPM: ' + stats.kpm.toFixed(1) + ' · Accuracy: ' + stats.accuracy.toFixed(1) + '% · Combo: ' + run.combo;
    this.bossHealth.hidden = !boss;
    if (boss) {
      this.bossHealth.max = boss.maxHealth;
      this.bossHealth.value = boss.health;
    }
  }
  showMessage(text) { this.message.textContent = text; }
  flashHit(text) {
    this.feedbackTime = 0.6;
    this.feedback.textContent = text;
    this.feedback.hidden = this.hitmarker.hidden = false;
  }
  tick(seconds, quality, active) {
    if (active) this.feedbackTime = Math.max(0, this.feedbackTime - seconds);
    this.hitmarker.hidden = this.feedbackTime < 0.46;
    this.feedback.hidden = this.feedbackTime === 0;
    this.statsTime += seconds;
    if (this.showPerformance.checked && this.statsTime > 0.5) {
      this.performance.textContent = quality.readout(this.touchMode);
      this.performance.title = quality.readout();
      this.statsTime = 0;
    }
  }
  showResults(stats, best) {
    this.setPhase('results');
    this.message.textContent = 'All targets and the boss defeated. Retry for a faster, more accurate run.';
    this.stats.replaceChildren();
    const rows = [
      ['Time', stats.time.toFixed(2) + 's (best ' + best.time.toFixed(2) + 's)'],
      ['Accuracy', stats.accuracy.toFixed(1) + '%'],
      ['Targets', String(stats.kills)],
      ['KPM', stats.kpm.toFixed(1)],
      ['Longest kill', stats.longestKill.toFixed(2) + 'm'],
      ['Boss time', stats.bossTime.toFixed(2) + 's'],
      ['Boss accuracy', stats.bossAccuracy.toFixed(1) + '%']
    ];
    for (const [name, value] of rows) {
      const label = document.createElement('dt');
      const text = document.createElement('dd');
      label.textContent = name;
      text.textContent = value;
      this.stats.append(label, text);
    }
  }
  dispose() {
    this.start.removeEventListener('click', this.onStart);
    this.retry.removeEventListener('click', this.onRetry);
    this.mute.removeEventListener('change', this.onMute);
    this.pause.removeEventListener('click', this.onPause);
    this.mode.removeEventListener('change', this.onModeChange);
    this.quality.removeEventListener('change', this.onQualityChange);
    this.showPerformance.removeEventListener('change', this.onPerformance);
  }
}
