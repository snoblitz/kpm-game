import { PointerLockControls } from './PointerLockControls.js';
import { LevelManager } from './level.js';
import { EnemyManager } from './enemy.js';
import { BossManager } from './boss.js';
import { Player } from './player.js';
import { RunState } from './run-state.js';
import { GameUI } from './ui.js';
import { Effects } from './textures.js';
import { unlockAudio, playSound, playComboSound, disposeAudio } from './audio.js';
import { updateBestStats } from './utils.js';
import { MAX_FRAME_DELTA } from './constants.js';

export class Game {
  constructor({ now = () => performance.now() } = {}) {
    this.now = now;
    this.run = new RunState();
    this.keys = {};
    this.last = now();
    this.frame = null;
    this.disposed = false;
    this.colliders = [];
    this.onKeyDown = event => {
      if (!this.run.active) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
      this.keys[event.code] = true;
    };
    this.onKeyUp = event => { delete this.keys[event.code]; };
    this.onMouseDown = event => { if (event.button === 0) this.shoot(); };
    this.onBlur = () => this.pause();
    this.onVisibility = () => { if (document.hidden) this.pause(); };
    this.onResize = () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    this.onPageHide = event => {
      if (event.persisted) this.pause();
      else this.dispose();
    };
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.scene.add(this.camera);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    document.body.appendChild(this.renderer.domElement);
    this.controls = new PointerLockControls(this.camera, this.renderer.domElement, {
      onChange: locked => this.onLockChange(locked),
      onError: () => this.ui.showMessage('Mouse capture was not granted. Click Start or Resume to try again.')
    });
    this.ui = new GameUI({ onStart: () => this.requestPlay(), onRetry: () => this.retry() });
    this.levelManager = new LevelManager(this.scene);
    this.enemyManager = new EnemyManager(this.scene);
    this.bossManager = new BossManager(this.scene);
    this.player = new Player(this.camera, this.controls);
    this.effects = new Effects(this.scene);
    this.raycaster = new THREE.Raycaster();
    this.center = new THREE.Vector2();
    this.resetRun(false);

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('pagehide', this.onPageHide);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown);
    this.animate();
  }

  requestPlay() {
    if (this.run.phase !== 'ready' && this.run.phase !== 'paused') return;
    unlockAudio();
    this.controls.lock();
    // Start/resume only after the browser confirms pointer lock.
  }
  onLockChange(locked) {
    if (this.disposed) return;
    if (!locked) {
      this.pause(false);
      return;
    }
    if (this.run.phase === 'ready') {
      this.run.start();
      playSound('start');
    } else {
      this.run.resume();
    }
    this.last = this.now();
    this.ui.setPhase(this.run.phase);
  }
  pause(unlock = true) {
    this.keys = {};
    if (!this.run.active) return;
    // Account for the active fraction since the previous frame, then freeze.
    this.run.advance(Math.max(0, (this.now() - this.last) / 1000));
    this.last = this.now();
    this.run.pause();
    this.ui.update(this.run, this.enemyManager.getEnemyCount(), this.bossManager.boss);
    this.ui.setPhase('paused');
    if (unlock) this.controls.unlock();
  }
  resetRun(rebuild = true) {
    this.keys = {};
    this.effects.clear();
    this.enemyManager.clear();
    this.bossManager.clear();
    if (rebuild) this.levelManager.generateLevel();
    this.colliders = this.levelManager.getColliders();
    this.player.reset();
    this.run.reset();
    this.enemyManager.spawnEnemies(this.levelManager.getEnemyCount(), this.colliders);
    this.last = this.now();
    this.ui.setPhase('ready');
    this.ui.update(this.run, this.enemyManager.getEnemyCount(), null);
  }
  retry() {
    if (this.run.phase !== 'results') return;
    this.resetRun();
    this.requestPlay();
  }

  animate() {
    if (this.disposed) return;
    this.update();
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(() => this.animate());
  }
  update() {
    const now = this.now();
    const elapsed = Math.max(0, (now - this.last) / 1000);
    this.last = now;
    if (!this.run.active) return;
    this.run.advance(elapsed);
    const delta = Math.min(elapsed, MAX_FRAME_DELTA);
    this.player.update(delta, this.keys, this.colliders);
    this.enemyManager.update(delta, this.colliders);
    if (this.run.phase === 'boss') this.bossManager.update(delta, this.camera.position, this.colliders);
    this.levelManager.updateSun(delta);
    this.effects.update(delta);
    this.ui.update(this.run, this.enemyManager.getEnemyCount(), this.bossManager.boss);
  }

  shoot() {
    if (!this.controls.isLocked || !this.run.active) return;
    this.run.recordShot();
    this.scene.updateMatrixWorld(true);
    this.raycaster.setFromCamera(this.center, this.camera);
    const targets = [...this.colliders, ...this.enemyManager.getEnemies().map(enemy => enemy.mesh)];
    if (this.bossManager.boss) targets.push(this.bossManager.boss.mesh);
    // One ordered hit query makes walls/doors block targets behind them.
    const hit = this.raycaster.intersectObjects(targets, false)[0];
    const end = hit ? hit.point : this.raycaster.ray.at(50, new THREE.Vector3());
    this.effects.tracer(this.camera.position, end);
    playSound('shoot');

    if (hit?.object.userData.isEnemy && this.enemyManager.handleEnemyHit(hit.object)) {
      this.run.recordKill(hit.distance);
      this.effects.spark(hit.point);
      playSound('hit');
      if (this.run.combo > 1) playComboSound(this.run.combo);
      if (this.enemyManager.getEnemyCount() === 0) {
        this.run.startBoss();
        this.bossManager.startBossFight(this.run.elapsed, this.camera.position);
      }
    } else if (hit?.object.userData.isBoss && this.run.phase === 'boss') {
      this.effects.spark(hit.point);
      const result = this.bossManager.handleHit();
      this.run.recordBossHit(result.damage);
      if (result.defeated) this.finish();
    }
    this.ui.update(this.run, this.enemyManager.getEnemyCount(), this.bossManager.boss);
  }

  finish() {
    this.run.finish();
    this.keys = {};
    this.effects.clear();
    this.levelManager.unlockDoor();
    const stats = this.run.summary();
    this.ui.showResults(stats, updateBestStats(stats));
    this.controls.unlock();
    playSound('endwin');
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pagehide', this.onPageHide);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.renderer?.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.controls?.dispose();
    this.ui?.dispose();
    this.effects?.clear();
    this.bossManager?.clear();
    this.enemyManager?.dispose();
    this.levelManager?.dispose();
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
    disposeAudio();
  }
}
