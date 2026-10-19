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
  send(type, id, x = 250, y = 200, time = 0, extra = {}) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, ...extra });
    Object.defineProperty(event, 'timeStamp', { value: time });
    this.dispatchEvent(event); return event;
  }
}
function fixture(onFire) {
  const elements = Object.fromEntries(['root', 'move', 'stick', 'look'].map(name => [name, new Pad()]));
  const looks = []; let shots = 0;
  const controls = new TouchControls({ ...elements, onLook: (...args) => looks.push(args),
    onFire: () => { shots++; onFire?.(controls); }, viewport: () => [390,844] });
  controls.setActive(true);
  return { ...elements, controls, looks, shots: () => shots };
}
function flick(f, id=2, time=0) {
  f.look.send('pointerdown',id,250,200,time);
  f.look.send('pointermove',id,252,175,time+20);
  f.look.send('pointermove',id,254,125,time+70);
  f.look.send('pointerup',id,254,115,time+90);
}

test('100 fast consecutive taps each fire on release, including repeated IDs and several taps before a frame', () => {
  const f=fixture();
  f.move.send('pointerdown',1,68,24);
  for(let i=0;i<100;i++) {
    f.look.send('pointerdown',2,250,200,i*45);
    assert.equal(f.shots(),i);
    f.look.send('pointermove',2,253,198,i*45+10);
    assert.equal(f.look.send('pointerup',2,252,201,i*45+30).defaultPrevented,true);
    f.look.send('lostpointercapture',2); // Must never duplicate a shot.
    assert.equal(f.shots(),i+1);
  }
  assert.equal(f.controls.input.y,1); assert.equal(f.controls.input.run,true);
  assert.equal(f.looks.length,0); assert.equal(f.controls.input.jump,false);
});

test('slow upward and downward aiming is continuous and never shoots or jumps', () => {
  for(const direction of [-1,1]) {
    const f=fixture();
    f.look.send('pointerdown',1);
    for(let i=1;i<=8;i++)f.look.send('pointermove',1,250,200+direction*i*12,i*50);
    f.look.send('pointerup',1,250,200+direction*96,420);
    assert.equal(f.controls.input.jump,false); assert.equal(f.shots(),0);
    assert.equal(f.looks.reduce((sum,delta)=>sum+delta[1],0),direction*96);
  }
});

test('fast diagonal and horizontal drags aim, even when their final movement is straight up', () => {
  for(const [dx,dy] of [[20,-20],[20,0],[-20,20]]) {
    const f=fixture(); f.look.send('pointerdown',1);
    f.look.send('pointermove',1,250+dx,200+dy,15);
    f.look.send('pointerup',1,250+dx,90,80);
    assert.equal(f.controls.input.jump,false); assert.equal(f.shots(),0);
    assert.ok(f.looks.length>0);
  }
});

test('deliberate fresh upward flick jumps without firing or tilting the camera; left stick remains held', () => {
  const f=fixture(); f.move.send('pointerdown',1,68,24); flick(f);
  assert.equal(f.controls.input.jump,true); assert.equal(f.controls.input.y,1);
  assert.equal(f.controls.pointers.size,1); assert.equal(f.looks.length,0); assert.equal(f.shots(),0);
  f.controls.reset(); assert.deepEqual(f.controls.input,{x:0,y:0,jump:false,run:false});
});

test('short/slow flicks, long holds and out-and-back motion cannot fire or jump', () => {
  const traces=[[[252,180,20],[252,160,50]],[[250,185,50],[250,130,170]],
    [[250,200,190],[250,100,220]],[[280,200,20],[250,200,60]],
    [[250,170,20],[250,180,30],[250,100,80]]];
  for(const trace of traces) {
    const f=fixture(); f.look.send('pointerdown',1);
    for(const [x,y,t] of trace)f.look.send('pointermove',1,x,y,t);
    const [x,y,t]=trace.at(-1); f.look.send('pointerup',1,x,y,t+5);
    assert.equal(f.controls.input.jump,false); assert.equal(f.shots(),0);
    assert.ok(f.looks.length>0);
  }
});

test('established slow aim cannot turn into jump after sudden upward acceleration', () => {
  const f=fixture(); f.look.send('pointerdown',1);
  f.look.send('pointermove',1,250,188,40);
  f.look.send('pointermove',1,250,100,65);
  f.look.send('pointerup',1,250,80,85);
  assert.equal(f.controls.input.jump,false); assert.equal(f.shots(),0);
  assert.equal(f.looks.reduce((sum,delta)=>sum+delta[1],0),-120);
});

test('held flick candidate flushes into aiming after the deadline and can never jump later', () => {
  const f=fixture(); f.look.send('pointerdown',1);
  f.look.send('pointermove',1,250,120,70); assert.equal(f.looks.length,0);
  f.controls.update(181); assert.equal(f.looks[0][1],-80);
  f.look.send('pointerup',1,250,60,200);
  assert.equal(f.controls.input.jump,false); assert.equal(f.shots(),0);
});

test('coalesced samples preserve an earlier drag decision before the fast final move', () => {
  const f=fixture(); f.look.send('pointerdown',1);
  f.look.send('pointermove',1,250,110,70,{getCoalescedEvents:()=>[
    {clientX:250,clientY:188,timeStamp:40}, {clientX:250,clientY:110,timeStamp:70}
  ]});
  f.look.send('pointerup',1,250,100,80);
  assert.equal(f.controls.input.jump,false); assert.equal(f.shots(),0);
  assert.equal(f.looks.reduce((sum,delta)=>sum+delta[1],0),-100);
});

test('final pointerup coordinates classify a flick even when move events were sparse', () => {
  const f=fixture(); f.look.send('pointerdown',1);
  f.look.send('pointerup',1,252,130,65);
  assert.equal(f.controls.input.jump,true); assert.equal(f.shots(),0); assert.equal(f.looks.length,0);
});

test('cancel and lost capture discard pending taps and flicks without firing, jumping or camera changes', () => {
  for(const type of ['pointercancel','lostpointercapture'])for(const movement of [false,true]) {
    const f=fixture(); f.look.send('pointerdown',1);
    if(movement)f.look.send('pointermove',1,250,120,60);
    f.look.send(type,1,250,120,70); f.look.send('pointerup',1,250,120,80);
    assert.equal(f.controls.input.jump,false); assert.equal(f.shots(),0); assert.equal(f.looks.length,0);
    assert.equal(f.controls.pointers.size,0);
  }
});

test('pointer identity, one right-thumb owner, mouse exclusion and capture failure cannot produce stray actions', () => {
  const f=fixture(); f.look.send('pointerdown',1);
  f.look.send('pointerdown',2); f.look.send('pointermove',2,250,80,60); f.look.send('pointerup',2,250,80,70);
  f.move.send('pointerdown',1,68,0);
  assert.equal(f.controls.input.y,0); assert.equal(f.controls.input.jump,false); assert.equal(f.shots(),0);
  f.look.send('pointerup',1,250,200,80); assert.equal(f.shots(),1);
  f.look.send('pointerdown',3,250,200,100,{pointerType:'mouse'});
  f.look.send('pointerup',3,250,200,120,{pointerType:'mouse'}); assert.equal(f.shots(),1);
  f.look.setPointerCapture=()=>{throw new Error('cancelled');};
  f.look.send('pointerdown',4); f.look.send('pointerup',4);
  assert.equal(f.shots(),1); assert.equal(f.controls.pointers.size,0);
});

test('joystick dead zone, analog strength and cancellation prevent drift', () => {
  const f=fixture(); f.move.send('pointerdown',1,70,68); assert.equal(f.controls.input.x,0);
  f.move.send('pointermove',1,90,68); assert.ok(f.controls.input.x>0 && f.controls.input.x<0.5);
  assert.equal(f.controls.input.run,false); f.move.send('pointermove',1,500,-500);
  assert.ok(Math.abs(Math.hypot(f.controls.input.x,f.controls.input.y)-1)<1e-9);
  f.move.send('pointercancel',1); f.move.send('pointermove',1,500,500);
  assert.deepEqual(f.controls.input,{x:0,y:0,jump:false,run:false});
});

test('pause/rotation reset old gestures, menus ignore input, and disposal removes listeners', () => {
  for(const action of ['pause','resize']) {
    const f=fixture(); f.move.send('pointerdown',1,68,24); f.look.send('pointerdown',2);
    if(action==='pause')f.controls.setActive(false); else f.controls.reset();
    assert.equal(f.move.captured.size,0); assert.equal(f.look.captured.size,0);
    f.look.send('pointerup',2,250,200,50); assert.equal(f.shots(),0);
    f.controls.setActive(false); f.look.send('pointerdown',3); f.look.send('pointerup',3);
    f.controls.setActive(true); f.look.send('pointerup',3); f.move.send('pointermove',1,68,0);
    assert.deepEqual(f.controls.input,{x:0,y:0,jump:false,run:false}); assert.equal(f.shots(),0);
    f.controls.dispose(); f.look.send('pointerdown',4); f.look.send('pointerup',4); assert.equal(f.shots(),0);
  }
});

test('a shot that synchronously opens results releases capture first and never repeats on old events', () => {
  const f=fixture(controls=>controls.setActive(false));
  f.look.send('pointerdown',1); f.look.send('pointerup',1,250,200,40);
  assert.equal(f.shots(),1); assert.equal(f.look.captured.size,0); assert.equal(f.root.hidden,true);
  f.look.send('pointerup',1,250,200,50); assert.equal(f.shots(),1);
});
