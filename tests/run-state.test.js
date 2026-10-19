import test from 'node:test';
import assert from 'node:assert/strict';
import { RunState } from '../js/run-state.js';
import { formatTime, updateBestStats } from '../js/utils.js';

test('timer formatting never rounds up to an invalid 60-second field', () => {
  assert.equal(formatTime(59.999), '00:59.99');
  assert.equal(formatTime(60.001), '01:00.00');
  assert.equal(formatTime(0), '00:00.00');
});

test('ready, pause, results and retry have independent clocks and counters', () => {
  const run = new RunState();
  run.advance(20);
  assert.equal(run.elapsed, 0);
  run.start();
  run.advance(3);
  run.recordShot();
  run.recordKill(12);
  run.pause();
  run.advance(100);
  assert.equal(run.elapsed, 3);
  run.resume();
  run.startBoss();
  run.advance(2);
  run.pause();
  run.advance(100);
  run.resume();
  assert.equal(run.phase, 'boss');
  run.recordShot();
  run.recordBossHit(10);
  run.finish();
  run.advance(100);
  assert.deepEqual(run.summary(), {
    time: 5, accuracy: 100, kills: 1, kpm: 12, longestKill: 12,
    bossTime: 2, bossAccuracy: 100, bossDamage: 10
  });
  run.reset();
  assert.equal(run.phase, 'ready');
  assert.equal(run.elapsed, 0);
  assert.equal(run.shotsFired, 0);
  assert.equal(run.bossElapsed, 0);
});

test('combos grow past two, survive a pause and expire after two active seconds', () => {
  const run = new RunState();
  run.start();
  for (let i = 0; i < 4; i++) {
    run.recordShot();
    run.recordKill(10 + i);
    run.advance(0.3);
  }
  assert.equal(run.combo, 4);
  run.pause();
  run.advance(100);
  run.resume();
  run.recordShot();
  run.recordKill(5);
  assert.equal(run.combo, 5);
  assert.equal(run.longestKill, 13);
  run.advance(2);
  assert.equal(run.combo, 0);
  run.recordShot();
  run.recordKill(6);
  assert.equal(run.combo, 1);
});

test('accuracy includes boss hits and boss misses use their own denominator', () => {
  const run = new RunState();
  run.start();
  run.recordShot(); // Arena miss.
  run.recordShot();
  run.recordKill(8);
  run.startBoss();
  run.recordShot(); // Boss miss.
  run.recordShot();
  run.recordBossHit(7);
  assert.equal(run.summary().accuracy, 50);
  assert.equal(run.summary().bossAccuracy, 50);
  assert.equal(run.summary().bossDamage, 7);
  assert.equal(new RunState().summary().kpm, 0);
});

test('invalid or unavailable storage cannot break results, valid bests survive', () => {
  const stats = { time: 10, accuracy: 50, kills: 13, kpm: 78, longestKill: 12 };
  globalThis.localStorage = { getItem: () => '{broken', setItem: () => { throw new Error('full'); } };
  assert.deepEqual(updateBestStats(stats), stats);
  globalThis.localStorage = {
    getItem: () => JSON.stringify({ time: 8, accuracy: 75, kills: 'bad', kpm: -1, longestKill: 20 }),
    setItem: () => {}
  };
  assert.deepEqual(updateBestStats(stats), { time: 8, accuracy: 75, kills: 13, kpm: 78, longestKill: 20 });
  globalThis.localStorage = { getItem: () => { throw new Error('denied'); }, setItem: () => {} };
  assert.deepEqual(updateBestStats(stats), stats);
});
