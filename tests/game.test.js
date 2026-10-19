import test from 'node:test';
import assert from 'node:assert/strict';
import { THREE, near, memoryStorage } from './helpers.js';
const { Game } = await import('../js/game.js');
const { Player } = await import('../js/player.js');
const { LevelManager } = await import('../js/level.js');
const { EnemyManager } = await import('../js/enemy.js');
const { BossManager } = await import('../js/boss.js');
const { Effects } = await import('../js/textures.js');
const { ENEMY_COUNT, ENEMY_SPEED } = await import('../js/constants.js');
const { TouchControls } = await import('../js/touch-controls.js');

function fixture() {
  let time = 0;
  const game = new Game({ now: () => time });
  game.scene = new THREE.Scene();
  game.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  game.scene.add(game.camera);
  game.controls = {
    isLocked: false,
    lock() { this.isLocked = true; game.onLockChange(true); },
    unlock() { this.isLocked = false; game.onLockChange(false); }
  };
  game.ui = {
    phase: null, last: null, result: null,
    setPhase(phase) { this.phase = phase; },
    update(run, count, boss) { this.last = { phase: run.phase, count, boss: boss?.health ?? null }; },
    showResults(stats, best) { this.phase = 'results'; this.result = { stats, best }; }
  };
  game.levelManager = new LevelManager(game.scene);
  game.enemyManager = new EnemyManager(game.scene);
  game.bossManager = new BossManager(game.scene);
  game.player = new Player(game.camera, game.controls);
  game.effects = new Effects(game.scene);
  game.raycaster = new THREE.Raycaster();
  game.center = new THREE.Vector2();
  globalThis.localStorage = memoryStorage();
  globalThis.window = {}; // Audio is optional in this headless test.
  game.resetRun(false);
  return { game, advance(seconds) { time += seconds * 1000; game.update(); }, setTime(value) { time = value; } };
}
function targetShot(game, mesh) {
  // Exercise real camera/raycast hit detection. Place one target in clear view.
  mesh.position.set(0, mesh.userData.isBoss ? 1 : 0.25, -5);
  game.camera.position.set(0, 2, 5);
  game.camera.lookAt(mesh.position);
  game.shoot();
}

test('W follows camera forward, strafing works, diagonals normalize, and collisions receive an array', () => {
  const { game } = fixture();
  game.controls.lock();
  const player = game.player;
  player.update(0.05, { KeyW: true }, game.colliders);
  near(player.position.z, -0.5);
  player.reset();
  game.camera.rotation.y = Math.PI / 2;
  player.update(0.05, { KeyW: true }, game.colliders);
  near(player.position.x, -0.5);
  near(player.position.z, 0);
  player.reset();
  game.camera.rotation.set(0.7, -0.8, 0, 'YXZ');
  const forward = game.camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
  player.update(0.05, { KeyW: true }, game.colliders);
  near(player.position.x, forward.x * 0.5);
  near(player.position.z, forward.z * 0.5);
  player.reset();
  player.update(0.05, { KeyW: true, KeyD: true }, game.colliders);
  near(Math.hypot(player.position.x, player.position.z), 0.5);
  player.reset();
  player.position.set(18.4, 2, 0);
  player.update(0.05, { KeyD: true }, game.colliders);
  near(player.position.x, 18.4);
  game.controls.unlock();
  player.update(0.05, { KeyW: true }, game.colliders);
  near(player.position.z, 0);
});

test('one frame advances each enemy once at the configured speed', () => {
  const { game, advance } = fixture();
  game.controls.lock();
  game.enemyManager.clear();
  game.enemyManager.spawnEnemies(1, game.colliders);
  const enemy = game.enemyManager.getEnemies()[0];
  enemy.mesh.position.set(0, 0.25, -5);
  enemy.mesh.userData.dir = 0;
  let calls = 0;
  const update = enemy.update.bind(enemy);
  enemy.update = (...args) => { calls++; update(...args); };
  advance(0.025);
  assert.equal(calls, 1);
  near(enemy.mesh.position.x, ENEMY_SPEED * 0.025);
});

test('real raycasting blocks enemies behind cover and counts misses', () => {
  const { game } = fixture();
  game.controls.lock();
  const enemy = game.enemyManager.getEnemies()[0];
  const wall = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 1), new THREE.MeshBasicMaterial());
  wall.position.set(0, 3, 0);
  game.scene.add(wall);
  game.colliders.push(wall);
  targetShot(game, enemy.mesh);
  assert.equal(game.run.shotsFired, 1);
  assert.equal(game.run.shotsHit, 0);
  assert.equal(game.enemyManager.getEnemyCount(), ENEMY_COUNT);
});

test('complete arena → boss → results → retry uses real managers and real raycasts', () => {
  const { game, advance } = fixture();
  assert.equal(game.ui.last.count, 13);
  assert.equal(game.run.phase, 'ready');
  advance(10);
  assert.equal(game.run.elapsed, 0);
  game.controls.lock();
  advance(0.5);
  while (game.enemyManager.getEnemyCount()) {
    // Keep other targets outside this shot's line of sight.
    game.enemyManager.getEnemies().forEach((enemy, i) => enemy.mesh.position.set(10, 0.25, i));
    targetShot(game, game.enemyManager.getEnemies()[0].mesh);
  }
  assert.equal(game.run.phase, 'boss');
  assert.equal(game.run.kills, 13);
  assert.equal(game.run.combo, 0);
  assert.equal(game.ui.last.count, 0);
  assert.ok(game.bossManager.boss.health > 0);
  const health = game.bossManager.boss.health;
  advance(0.5);
  let shots = 0;
  while (game.bossManager.boss) {
    assert.ok(shots++ < 20, 'Boss must be defeatable');
    targetShot(game, game.bossManager.boss.mesh);
  }
  assert.equal(game.run.phase, 'results');
  assert.equal(game.controls.isLocked, false);
  assert.equal(game.ui.result.stats.accuracy, 100);
  near(game.ui.result.stats.bossDamage, health);
  assert.equal(game.effects.items.length, 0);
  assert.equal(game.levelManager.door.material.color.getHex(), 0x00ff00);
  const finalTime = game.run.elapsed;
  advance(100);
  assert.equal(game.run.elapsed, finalTime);
  const previousColliders = game.colliders;
  const lightCount = game.scene.children.filter(child => child.isLight).length;
  game.retry();
  assert.equal(game.run.phase, 'playing');
  assert.equal(game.run.shotsFired, 0);
  assert.equal(game.run.elapsed, 0);
  assert.equal(game.ui.last.count, 13);
  assert.notEqual(game.colliders, previousColliders);
  previousColliders.forEach(collider => assert.equal(collider.parent, null));
  assert.equal(game.scene.children.filter(child => child.isLight).length, lightCount);
});

test('pause clears held keys and preserves boss phase; resume excludes idle time and clamps physics stalls', () => {
  const { game, advance, setTime } = fixture();
  game.controls.lock();
  game.run.startBoss();
  game.bossManager.startBossFight(1, game.camera.position);
  game.keys.KeyW = true;
  setTime(100);
  game.pause();
  near(game.run.elapsed, 0.1);
  assert.deepEqual(game.keys, {});
  assert.equal(game.run.phase, 'paused');
  advance(100);
  near(game.run.elapsed, 0.1);
  game.controls.lock();
  assert.equal(game.run.phase, 'boss');
  near(game.run.elapsed, 0.1);
  game.keys.KeyW = true;
  const position = game.camera.position.clone();
  advance(5);
  near(game.run.elapsed, 5.1);
  assert.ok(position.distanceTo(game.camera.position) <= 0.501);
});

test('effects return to their pool, dispose once at teardown, and rebuilding never accumulates lights', () => {
  const { game } = fixture();
  game.effects.spark(new THREE.Vector3());
  const mesh = game.effects.items[0].mesh;
  let geometries = 0, materials = 0;
  mesh.geometry.addEventListener('dispose', () => geometries++);
  mesh.material.addEventListener('dispose', () => materials++);
  game.effects.update(0.3);
  assert.equal(game.effects.items.length, 0);
  assert.equal(mesh.parent, null);
  assert.equal(geometries, 0);
  assert.equal(materials, 0);
  game.effects.spark(new THREE.Vector3());
  assert.equal(game.effects.items[0].mesh, mesh);
  game.effects.clear();
  const children = game.scene.children.length;
  for (let i = 0; i < 10; i++) game.resetRun();
  assert.equal(game.scene.children.length, children);
  assert.equal(game.scene.children.filter(child => child.isLight).length, 2);
  game.effects.dispose();
  game.effects.dispose();
  assert.equal(geometries, 1);
  assert.equal(materials, 1);
});

test('touch starts, moves, shoots, pauses, resumes and retries without requesting pointer lock', () => {
  const {game,advance}=fixture();
  let lockRequests=0;
  game.controls.lock=()=>{lockRequests++;};
  game.touch={ input:{x:0,y:0,jump:false,run:false}, active:false,
    setActive(active){ this.active=active; if(!active) Object.assign(this.input,{x:0,y:0,jump:false,run:false}); }
  };
  game.setTouchMode(true);
  game.requestPlay();
  assert.equal(game.run.phase,'playing');
  assert.equal(game.controls.isLocked,false);
  assert.equal(game.touch.active,true);
  game.touch.input.y=0.5;
  advance(0.05);
  near(game.camera.position.z,-0.25);
  game.touch.input.jump=true;
  advance(0.05);
  assert.ok(game.camera.position.y>2);
  assert.equal(game.touch.input.jump,false); // A flick is a one-frame request, never a held auto-jump.
  game.shoot();
  assert.equal(game.run.shotsFired,1);
  game.onBlur();
  assert.equal(game.run.phase,'paused');
  assert.deepEqual(game.touch.input,{x:0,y:0,jump:false,run:false});
  game.shoot();
  assert.equal(game.run.shotsFired,1);
  const elapsed=game.run.elapsed;
  advance(10);
  near(game.run.elapsed,elapsed);
  game.requestPlay();
  game.run.startBoss();
  game.finish();
  assert.equal(game.touch.active,false);
  game.retry();
  assert.equal(game.run.phase,'playing');
  assert.equal(game.run.shotsFired,0);
  assert.equal(game.touch.active,true);
  assert.equal(lockRequests,0);
});

test('analog diagonals preserve strength and full movement is bounded with mixed keyboard input', () => {
  const {game}=fixture();
  game.player.update(0.05,{},game.colliders,{x:0.3,y:0.4});
  near(Math.hypot(game.camera.position.x,game.camera.position.z),0.25);
  game.player.reset();
  game.player.update(0.05,{KeyW:true},game.colliders,{x:1,y:1});
  near(Math.hypot(game.camera.position.x,game.camera.position.z),0.5);
});

test('right-pad taps reach real shot/raycast counters individually between frames, and rotation discards a pending tap', () => {
  const {game}=fixture();
  class Pad extends EventTarget {
    constructor(){super();this.style={};this.classList={add(){},remove(){}};}
    setPointerCapture(){} hasPointerCapture(){return false;}
    send(type,time){const e=new Event(type,{cancelable:true});Object.assign(e,{pointerId:1,pointerType:'touch',clientX:300,clientY:180});Object.defineProperty(e,'timeStamp',{value:time});this.dispatchEvent(e);}
  }
  const look=new Pad();
  game.touch=new TouchControls({root:new Pad(),move:new Pad(),stick:new Pad(),look,onLook(){},onFire:()=>game.shoot()});
  game.setTouchMode(true);game.requestPlay();game.enemyManager.clear();
  for(let i=0;i<100;i++){look.send('pointerdown',i*40);look.send('pointerup',i*40+20);}
  assert.equal(game.run.shotsFired,100);assert.equal(game.run.elapsed,0);
  assert.equal(game.effects.items.length,8); // Presentation pool does not throttle hit registration.
  look.send('pointerdown',4100);
  game.renderer={setSize(){}};game.onResize({width:844,height:390});
  look.send('pointerup',4120);assert.equal(game.run.shotsFired,100);
  game.pause();look.send('pointerdown',4200);look.send('pointerup',4220);
  assert.equal(game.run.shotsFired,100);game.touch.dispose();
});
