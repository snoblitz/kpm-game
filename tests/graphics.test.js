import test from 'node:test';
import assert from 'node:assert/strict';
import {THREE,sceneInventory,near} from './helpers.js';
import {LevelManager} from '../js/level.js';
import {EnemyManager} from '../js/enemy.js';
import {BossManager} from '../js/boss.js';
import {Effects} from '../js/textures.js';
import {Weapon} from '../js/weapon.js';
import {RenderQuality} from '../js/render-quality.js';

test('upgraded arena and boss stay below the old triangle inventory with no shadow lights',()=>{
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(); scene.add(camera);
  const level=new LevelManager(scene),enemies=new EnemyManager(scene),weapon=new Weapon(camera);
  enemies.spawnEnemies(13,level.getColliders());
  const arena=sceneInventory(scene);
  assert.ok(arena.triangles<2202);
  assert.ok(arena.renderObjects<=28);
  assert.equal(arena.shadowLights,0);
  const batches=level.decor.filter(object=>object.isInstancedMesh);
  let disposedBatches=0;
  batches.forEach(batch=>batch.addEventListener('dispose',()=>disposedBatches++));
  for(let i=0;i<10;i++)level.generateLevel();
  assert.deepEqual(sceneInventory(scene),arena);
  assert.equal(disposedBatches,2);
  enemies.clear();
  const boss=new BossManager(scene);boss.startBossFight(10);
  const bossInventory=sceneInventory(scene);
  assert.ok(bossInventory.triangles<2070);
  assert.equal(bossInventory.shadowLights,0);
  boss.clear();weapon.dispose();enemies.dispose();level.dispose();
  assert.equal(sceneInventory(scene).renderObjects,0);
});

test('500 rapid shots never exceed sixteen pooled effects or allocate new geometry/materials',()=>{
  const scene=new THREE.Scene(),effects=new Effects(scene);
  const geometry=new Set(effects.pool.map(item=>item.mesh.geometry));
  const materials=new Set(effects.pool.map(item=>item.mesh.material));
  for(let i=0;i<500;i++) {
    effects.tracer(new THREE.Vector3(),new THREE.Vector3(0,0,-i-1));
    effects.spark(new THREE.Vector3(i,0,0));
  }
  assert.equal(effects.items.length,16);
  assert.equal(scene.children.length,16);
  assert.deepEqual(new Set(effects.pool.map(item=>item.mesh.geometry)),geometry);
  assert.deepEqual(new Set(effects.pool.map(item=>item.mesh.material)),materials);
  let geometryDisposals=0,materialDisposals=0;
  geometry.forEach(item=>item.addEventListener('dispose',()=>geometryDisposals++));
  materials.forEach(item=>item.addEventListener('dispose',()=>materialDisposals++));
  effects.update(1);
  assert.equal(scene.children.length,0);
  assert.equal(geometryDisposals,0);
  effects.dispose();effects.dispose();
  assert.equal(geometryDisposals,geometry.size);
  assert.equal(materialDisposals,materials.size);
});

test('adaptive resolution uses bounded frame samples and ignores pauses and long interruptions',()=>{
  const ratios=[];
  const renderer={setPixelRatio:value=>ratios.push(value),info:{render:{calls:25,triangles:726},memory:{geometries:13,textures:0}}};
  const quality=new RenderQuality(renderer,{deviceRatio:()=>3,touch:true});
  assert.equal(quality.ratio,1.25);
  const samples=quality.samples;
  for(let i=0;i<100;i++){quality.record(1,false);quality.record(2,true);}
  assert.equal(quality.sampleCount,0);
  for(let i=0;i<180;i++)quality.record(0.03,true);
  assert.equal(quality.ratio,1);
  for(let i=0;i<1000;i++)quality.record(0.04,true);
  assert.equal(quality.ratio,0.75);
  assert.equal(quality.samples,samples);
  assert.ok(quality.sampleCount<=90);
  quality.setMode('high');
  for(let i=0;i<200;i++)quality.record(0.05,true);
  assert.equal(quality.ratio,2);
  quality.setMode('low');assert.equal(quality.ratio,1);
  quality.setMode('auto');quality.setTouch(false);assert.equal(quality.ratio,1.5);
  assert.match(quality.readout(),/25 draws/);
  assert.match(quality.readout(true),/FPS \| .* ms \| .*x/);
  assert.ok(quality.readout(true).length<=30);
});

test('weapon feedback moves only the weapon, resets, and adds no light or per-shot resources',()=>{
  const camera=new THREE.PerspectiveCamera(75,0.5);const weapon=new Weapon(camera);
  const before=camera.quaternion.clone();const geometry=weapon.body.geometry;
  weapon.shoot();weapon.update(0.01);
  assert.equal(weapon.flash.visible,true);
  assert.equal(weapon.group.position.x,0.09);
  near(camera.quaternion.angleTo(before),0);
  assert.ok(weapon.getMuzzle().z<0);
  weapon.update(0.2);assert.equal(weapon.flash.visible,false);
  assert.equal(weapon.body.geometry,geometry);
  weapon.reset();assert.equal(weapon.recoil,0);
  weapon.dispose();assert.equal(camera.children.length,0);
});
