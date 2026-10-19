import test from 'node:test';
import assert from 'node:assert/strict';
import './helpers.js';
const { PointerLockControls } = await import('../js/PointerLockControls.js');
const audio = await import('../js/audio.js');

test('pointer lock requires confirmation, reports errors and removes listeners on disposal', async () => {
  const doc = new EventTarget();
  globalThis.document = doc;
  const canvas = new EventTarget();
  let requests = 0;
  canvas.requestPointerLock = () => { requests++; };
  doc.exitPointerLock = () => {
    doc.pointerLockElement = null;
    doc.dispatchEvent(new Event('pointerlockchange'));
  };
  const changes = [];
  let errors = 0;
  const controls = new PointerLockControls(new THREE.PerspectiveCamera(), canvas, {
    onChange: locked => changes.push(locked), onError: () => errors++
  });
  controls.lock();
  assert.equal(requests, 1);
  assert.equal(controls.isLocked, false);
  doc.pointerLockElement = canvas;
  doc.dispatchEvent(new Event('pointerlockchange'));
  assert.equal(controls.isLocked, true);
  assert.deepEqual(changes, [true]);
  controls.unlock();
  assert.equal(controls.isLocked, false);
  canvas.requestPointerLock = () => Promise.reject(new Error('capture denied'));
  controls.lock();
  await Promise.resolve();
  assert.equal(errors, 1);
  controls.dispose();
  doc.pointerLockElement = canvas;
  doc.dispatchEvent(new Event('pointerlockchange'));
  doc.dispatchEvent(new Event('pointerlockerror'));
  assert.deepEqual(changes, [true, false]);
  assert.equal(errors, 1);
});

test('audio reuses one context, disconnects finished nodes and closes on teardown', () => {
  let contexts = 0, closes = 0, disconnects = 0;
  const oscillators = [];
  const param = () => ({ value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  class AudioContext {
    constructor() { contexts++; this.state = 'running'; this.currentTime = 0; }
    createGain() { return { gain: param(), connect() {}, disconnect() { disconnects++; } }; }
    createOscillator() {
      const osc = { frequency: param(), connect() {}, disconnect() { disconnects++; }, start() {}, stop() {} };
      oscillators.push(osc);
      return osc;
    }
    close() { closes++; this.state = 'closed'; return Promise.resolve(); }
  }
  globalThis.window = { AudioContext };
  audio.unlockAudio();
  audio.unlockAudio();
  audio.playSound('shoot');
  audio.playSound('boss-hit');
  audio.playComboSound(4);
  assert.equal(contexts, 1);
  assert.equal(oscillators.length, 3);
  oscillators.forEach(osc => osc.onended());
  assert.equal(disconnects, 6);
  audio.disposeAudio();
  assert.equal(closes, 1);
});
