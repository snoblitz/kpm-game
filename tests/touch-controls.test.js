import test from 'node:test';
import assert from 'node:assert/strict';
import { TouchControls } from '../js/touch-controls.js';

class Pad extends EventTarget {
  constructor() {
    super(); this.hidden = false; this.style = {}; this.captured = new Set();
    this.classes = new Set();
    this.classList = { add: name => this.classes.add(name), remove: name => this.classes.delete(name) };
  }
  getBoundingClientRect() { return { left: 0, top: 0, width: 136, height: 136 }; }
  setPointerCapture(id) { this.captured.add(id); }
  hasPointerCapture(id) { return this.captured.has(id); }
  releasePointerCapture(id) { this.captured.delete(id); }
  send(type, id, x = 68, y = 68, pointerType = 'touch') {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { pointerId: id, pointerType, clientX: x, clientY: y });
    this.dispatchEvent(event);
    return event;
  }
}
function fixture() {
  const elements = Object.fromEntries(['root', 'move', 'stick', 'look', 'fire', 'jump'].map(name => [name, new Pad()]));
  const looks = []; let shots = 0;
  const controls = new TouchControls({ ...elements, onLook: (...args) => looks.push(args), onFire: () => shots++, viewport: () => [390,844] });
  controls.setActive(true);
  return { ...elements, controls, looks, shots: () => shots };
}

test('four concurrent pointers independently move, look, fire and jump', () => {
  const f = fixture();
  assert.equal(f.move.send('pointerdown',1,68,24).defaultPrevented,true);
  assert.equal(f.controls.input.y,1);
  assert.equal(f.controls.input.run,true);
  f.look.send('pointerdown',2,200,100);
  f.look.send('pointermove',2,220,110);
  assert.deepEqual(f.looks[0],[20,10,Math.PI/390]);
  f.fire.send('pointerdown',3);
  f.jump.send('pointerdown',4);
  assert.equal(f.shots(),1);
  assert.equal(f.controls.input.jump,true);
  f.fire.send('pointerup',3);
  assert.equal(f.controls.input.y,1);
  assert.equal(f.controls.input.jump,true);
  f.jump.send('pointercancel',4);
  f.move.send('lostpointercapture',1);
  assert.deepEqual(f.controls.input,{x:0,y:0,jump:false,run:false});
  f.look.send('pointerup',2);
  assert.equal(f.controls.pointers.size,0);
});

test('look gestures cannot fire, duplicate pointers cannot steal a control, and mouse events are ignored', () => {
  const f = fixture();
  f.look.send('pointerdown',10,200,100);
  f.look.send('pointermove',10,380,800); // Across the fire button's visual area.
  f.fire.send('pointerdown',10); // Same pointer cannot change roles.
  f.look.send('pointerdown',11,300,100);
  f.look.send('pointermove',11,310,100);
  assert.equal(f.looks.length,1);
  assert.equal(f.shots(),0);
  f.fire.send('pointerdown',12,0,0,'mouse');
  assert.equal(f.shots(),0);
  f.fire.send('pointerdown',12);
  f.fire.send('pointerdown',13);
  f.fire.send('pointermove',12,0,0);
  assert.equal(f.shots(),1); // One shot per tap, never fire on movement or release.
  f.fire.send('pointerup',12);
  f.fire.send('pointerdown',13);
  assert.equal(f.shots(),2);
});

test('joystick dead zone, analog strength, clamping and cancellation prevent drift', () => {
  const f=fixture();
  f.move.send('pointerdown',1,70,68);
  assert.equal(f.controls.input.x,0);
  f.move.send('pointermove',1,90,68);
  assert.ok(f.controls.input.x>0 && f.controls.input.x<0.5);
  assert.equal(f.controls.input.run,false);
  f.move.send('pointermove',1,500,-500);
  assert.ok(Math.abs(Math.hypot(f.controls.input.x,f.controls.input.y)-1)<1e-9);
  f.move.send('pointercancel',1);
  f.move.send('pointermove',1,500,500);
  assert.deepEqual(f.controls.input,{x:0,y:0,jump:false,run:false});
});

test('pause/reset releases capture and old gestures cannot reactivate on resume; disposal removes listeners', () => {
  const f=fixture();
  f.move.send('pointerdown',1,68,24);
  f.jump.send('pointerdown',2);
  f.look.send('pointerdown',3,200,100);
  f.controls.setActive(false);
  assert.equal(f.root.hidden,true);
  assert.equal(f.move.captured.size,0);
  assert.equal(f.jump.captured.size,0);
  assert.equal(f.look.captured.size,0);
  f.fire.send('pointerdown',4);
  assert.equal(f.shots(),0);
  f.controls.setActive(true);
  f.move.send('pointermove',1,68,0);
  f.look.send('pointermove',3,250,100);
  assert.deepEqual(f.controls.input,{x:0,y:0,jump:false,run:false});
  assert.equal(f.looks.length,0);
  f.controls.dispose();
  f.fire.send('pointerdown',5);
  assert.equal(f.shots(),0);
});

test('capture failure drops the gesture without firing or retaining movement', () => {
  const f=fixture();
  f.fire.setPointerCapture=()=>{throw new Error('cancelled');};
  f.fire.send('pointerdown',1);
  assert.equal(f.shots(),0);
  assert.equal(f.controls.pointers.size,0);
});
