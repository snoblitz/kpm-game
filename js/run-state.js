// Run rules are independent of rendering so timing and scoring can be tested directly.
export class RunState {
  constructor() { this.reset(); }

  reset() {
    this.phase = 'ready';
    this.resumePhase = null;
    this.elapsed = 0;
    this.bossElapsed = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.kills = 0;
    this.combo = 0;
    this.lastKillAt = -Infinity;
    this.longestKill = 0;
    this.bossShots = 0;
    this.bossHits = 0;
    this.bossDamage = 0;
  }

  get active() { return this.phase === 'playing' || this.phase === 'boss'; }
  start() { if (this.phase === 'ready') this.phase = 'playing'; }
  pause() {
    if (!this.active) return;
    this.resumePhase = this.phase;
    this.phase = 'paused';
  }
  resume() {
    if (this.phase !== 'paused') return;
    this.phase = this.resumePhase;
    this.resumePhase = null;
  }
  advance(seconds) {
    if (!this.active || !Number.isFinite(seconds) || seconds < 0) return;
    this.elapsed += seconds;
    if (this.phase === 'boss') this.bossElapsed += seconds;
    if (this.elapsed - this.lastKillAt >= 2) this.combo = 0;
  }
  recordShot() {
    if (!this.active) return;
    this.shotsFired++;
    if (this.phase === 'boss') this.bossShots++;
  }
  recordKill(distance) {
    this.shotsHit++;
    this.kills++;
    this.combo = this.elapsed - this.lastKillAt < 2 ? this.combo + 1 : 1;
    this.lastKillAt = this.elapsed;
    this.longestKill = Math.max(this.longestKill, distance);
  }
  startBoss() {
    if (this.phase !== 'playing') return;
    this.phase = 'boss';
    this.combo = 0;
  }
  recordBossHit(damage) {
    this.shotsHit++;
    this.bossHits++;
    this.bossDamage += damage;
  }
  finish() {
    this.phase = 'results';
    this.resumePhase = null;
  }
  summary() {
    return {
      time: this.elapsed,
      accuracy: this.shotsFired ? 100 * this.shotsHit / this.shotsFired : 0,
      kills: this.kills,
      kpm: this.elapsed ? 60 * this.kills / this.elapsed : 0,
      longestKill: this.longestKill,
      bossTime: this.bossElapsed,
      bossAccuracy: this.bossShots ? 100 * this.bossHits / this.bossShots : 0,
      bossDamage: this.bossDamage
    };
  }
}
