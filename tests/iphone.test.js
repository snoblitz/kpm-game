import test from 'node:test';
import assert from 'node:assert/strict';
import {GameGestures} from '../js/game-gestures.js';
import {GameViewport,measureViewport} from '../js/game-viewport.js';
import {ImmersiveMode,HOME_SCREEN_HELP} from '../js/immersive-mode.js';

class Element extends EventTarget {
  constructor(){super();this.values=new Map();this.style={setProperty:(key,value)=>this.values.set(key,value)};this.classList={toggle:()=>{}};}
}
function touchEvent(target,type,ids=[],native=false,cancelable=true){
  const event=new Event(type,{cancelable});
  Object.defineProperty(event,'target',{value:{closest:()=>native?{}:null}});
  event.changedTouches=ids.map(identifier=>({identifier}));
  target.dispatchEvent(event);return event;
}

test('rapid gameplay tap endings are cancelled without replacing Pointer Events or native Pause clicks',()=>{
  const surface=new Element(),guard=new GameGestures(surface);
  guard.setActive(true);let pointerDowns=0;
  surface.addEventListener('pointerdown',()=>pointerDowns++);
  for(let id=0;id<100;id++){
    assert.equal(touchEvent(surface,'touchstart',[id]).defaultPrevented,false);
    surface.dispatchEvent(new Event('pointerdown'));
    assert.equal(touchEvent(surface,'touchend',[id]).defaultPrevented,true);
  }
  assert.equal(pointerDowns,100);
  assert.equal(guard.touches.size,0);
  touchEvent(surface,'touchstart',[101],true);
  assert.equal(touchEvent(surface,'touchend',[101],true).defaultPrevented,false);
});

test('gesture guard preserves simultaneous touch ownership and cancels the final shot after results opens',()=>{
  const surface=new Element(),guard=new GameGestures(surface);guard.setActive(true);
  touchEvent(surface,'touchstart',[1,2,3,4]);
  assert.equal(guard.touches.size,4);
  assert.equal(touchEvent(surface,'touchend',[3]).defaultPrevented,true);
  assert.deepEqual([...guard.touches],[1,2,4]);
  guard.setActive(false);
  assert.equal(touchEvent(surface,'touchend',[1,2,4]).defaultPrevented,true);
  assert.equal(guard.touches.size,0);
  assert.equal(touchEvent(surface,'touchstart',[5]).defaultPrevented,false);
  assert.equal(touchEvent(surface,'touchend',[5]).defaultPrevented,false);
});

test('zoom guard stays on the play surface; menu pinch/scroll and disposed events remain untouched',()=>{
  const surface=new Element(),menu=new Element(),guard=new GameGestures(surface);guard.setActive(true);
  for(const type of ['gesturestart','gesturechange','gestureend','dblclick','touchmove']){
    assert.equal(touchEvent(surface,type).defaultPrevented,true);
    assert.equal(touchEvent(menu,type).defaultPrevented,false);
  }
  assert.equal(touchEvent(surface,'touchmove',[],false,false).defaultPrevented,false);
  guard.dispose();
  assert.equal(touchEvent(surface,'gesturestart').defaultPrevented,false);
});

function viewportFixture(){
  const win=new EventTarget(),doc=new EventTarget(),root=new Element(),frames=new Map();let nextId=0;
  Object.assign(win,{innerWidth:390,innerHeight:844,requestAnimationFrame:fn=>{frames.set(++nextId,fn);return nextId;},cancelAnimationFrame:id=>frames.delete(id)});
  win.visualViewport=Object.assign(new EventTarget(),{width:390,height:660,scale:1,offsetLeft:0,offsetTop:30});
  const sizes=[],viewport=new GameViewport(root,size=>sizes.push(size),{win,doc});
  const flush=()=>{for(const [id,fn] of [...frames]){frames.delete(id);fn();}};
  return{win,doc,root,frames,sizes,viewport,flush};
}
test('visual viewport changes fit the canvas and UI; bursts coalesce and offset-only changes do not reallocate the renderer',()=>{
  const f=viewportFixture();assert.equal(f.sizes[0].height,660);
  assert.equal(f.root.values.get('--view-top'),'30px');
  f.win.visualViewport.height=720;
  for(let i=0;i<6;i++)f.win.visualViewport.dispatchEvent(new Event('resize'));
  assert.equal(f.frames.size,1);f.flush();assert.equal(f.sizes.length,2);assert.equal(f.sizes[1].height,720);
  f.win.visualViewport.offsetTop=10;f.win.visualViewport.dispatchEvent(new Event('scroll'));f.flush();
  assert.equal(f.sizes.length,2);assert.equal(f.root.values.get('--view-top'),'10px');
  f.win.visualViewport.width=844;f.win.visualViewport.height=390;
  f.win.dispatchEvent(new Event('orientationchange'));f.doc.dispatchEvent(new Event('fullscreenchange'));f.flush();
  assert.equal(f.sizes.at(-1).width,844);assert.equal(f.sizes.at(-1).height,390);
});
test('menu pinch zoom is not counter-scaled and viewport listeners/queued work are removed',()=>{
  const f=viewportFixture();Object.assign(f.win.visualViewport,{scale:2,width:195,height:330,offsetLeft:40});
  assert.deepEqual(measureViewport(f.win),{width:390,height:844,left:0,top:0});
  f.win.dispatchEvent(new Event('resize'));assert.equal(f.frames.size,1);f.viewport.dispose();assert.equal(f.frames.size,0);
  f.win.visualViewport.dispatchEvent(new Event('resize'));assert.equal(f.frames.size,0);
  delete f.win.visualViewport;assert.equal(measureViewport(f.win).height,844);
});

function immersiveFixture(setup=()=>{}){
  const doc=new EventTarget(),root=new Element(),button=new Element(),status={},query=Object.assign(new EventTarget(),{matches:false});
  const win={navigator:{},matchMedia:()=>query};let exits=0;
  setup({doc,root,win,query});
  const mode=new ImmersiveMode({root,button,status,win,doc,onExit:()=>exits++});
  return{doc,root,button,status,win,query,mode,exits:()=>exits};
}
test('unsupported and policy-disabled fullscreen offer Home Screen guidance without invoking an API',async()=>{
  const unsupported=immersiveFixture();assert.equal(unsupported.button.hidden,true);assert.equal(unsupported.status.textContent,HOME_SCREEN_HELP);
  await unsupported.mode.toggle();
  let calls=0;
  const denied=immersiveFixture(({doc,root})=>{doc.fullscreenEnabled=false;root.requestFullscreen=()=>calls++;});
  assert.equal(denied.button.hidden,true);await denied.mode.toggle();assert.equal(calls,0);
});
test('fullscreen requests are gesture-bound, hide-navigation is only a hint, and exit is confirmed before pausing',async()=>{
  let options;
  const f=immersiveFixture(({doc,root})=>{
    doc.fullscreenEnabled=true;
    root.requestFullscreen=async value=>{options=value;doc.fullscreenElement=root;doc.dispatchEvent(new Event('fullscreenchange'));};
    doc.exitFullscreen=async()=>{doc.fullscreenElement=null;doc.dispatchEvent(new Event('fullscreenchange'));};
  });
  assert.equal(f.mode.fullscreen,false);assert.equal(f.button.hidden,false);
  await f.mode.toggle();assert.deepEqual(options,{navigationUI:'hide'});assert.equal(f.button.textContent,'Exit fullscreen');
  assert.match(f.status.textContent,/Fullscreen is active/);
  await f.mode.toggle();assert.equal(f.exits(),1);assert.equal(f.button.textContent,'Enter fullscreen');
});
test('rejected or unconfirmed fullscreen never claims success; duplicate taps do not issue duplicate requests',async()=>{
  const rejected=immersiveFixture(({root})=>{root.requestFullscreen=()=>Promise.reject(new Error('not allowed'));});
  await rejected.mode.toggle();assert.match(rejected.status.textContent,/could not change/);assert.equal(rejected.button.disabled,false);
  let resolve,calls=0;
  const f=immersiveFixture(({root})=>{root.requestFullscreen=()=>{calls++;return new Promise(done=>resolve=done);};});
  const first=f.mode.toggle();await f.mode.toggle();assert.equal(calls,1);resolve();await first;
  assert.match(f.status.textContent,/has not opened/);assert.equal(f.mode.fullscreen,false);
  let finish;
  const disposed=immersiveFixture(({root})=>{root.requestFullscreen=()=>new Promise(done=>finish=done);});
  const pending=disposed.mode.toggle();disposed.mode.dispose();const previous=disposed.status.textContent;
  finish();await pending;assert.equal(disposed.status.textContent,previous);
});
test('Home Screen standalone mode and legacy WebKit fullscreen are detected independently',async()=>{
  const standalone=immersiveFixture(({win})=>{win.navigator.standalone=true;});
  assert.equal(standalone.button.hidden,true);assert.match(standalone.status.textContent,/app mode is active/);
  const legacy=immersiveFixture(({root,doc})=>{
    root.webkitRequestFullscreen=()=>{doc.webkitFullscreenElement=root;doc.dispatchEvent(new Event('webkitfullscreenchange'));};
    doc.webkitExitFullscreen=()=>{doc.webkitFullscreenElement=null;doc.dispatchEvent(new Event('webkitfullscreenchange'));};
  });
  await legacy.mode.toggle();assert.equal(legacy.mode.fullscreen,true);await legacy.mode.toggle();assert.equal(legacy.exits(),1);
  legacy.mode.dispose();legacy.doc.webkitFullscreenElement=legacy.root;legacy.doc.dispatchEvent(new Event('webkitfullscreenchange'));
  assert.equal(legacy.button.textContent,'Enter fullscreen');
});
