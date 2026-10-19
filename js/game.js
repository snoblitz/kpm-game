import { PointerLockControls } from './PointerLockControls.js';
import { TouchControls } from './touch-controls.js';
import { Weapon } from './weapon.js';
import { RenderQuality } from './render-quality.js';
import { GameViewport } from './game-viewport.js';
import { GameGestures } from './game-gestures.js';
import { ImmersiveMode } from './immersive-mode.js';
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
    this.touchMode = false;
    this.colliders = [];
    this.onKeyDown = event => {
      if (!this.run.active) return;
      if (event.code === 'Escape') { event.preventDefault(); this.pause(); return; }
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
      this.keys[event.code] = true;
    };
    this.onKeyUp = event => { delete this.keys[event.code]; };
    this.onMouseDown = event => { if (event.pointerType === 'mouse' && event.button === 0) this.shoot(); };
    this.onBlur = () => this.pause();
    this.onVisibility = () => { if (document.hidden) this.pause(); };
    this.onResize = ({width,height}) => {
      this.touch?.reset();
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width,height);
    };
    this.onPageHide = event => {
      if (event.persisted) this.pause();
      else this.dispose();
    };
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x081321);
    this.scene.fog = new THREE.Fog(0x081321, 28, 85);
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.scene.add(this.camera);
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = false;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.quality = new RenderQuality(this.renderer);
    this.surface = document.getElementById('playSurface');
    this.surface.appendChild(this.renderer.domElement);
    this.viewport = new GameViewport(document.getElementById('gameViewport'),this.onResize);
    this.gestures = new GameGestures(this.surface);
    this.immersive = new ImmersiveMode({
      root:document.getElementById('gameViewport'),button:document.getElementById('immersive'),
      status:document.getElementById('immersiveHelp'),onExit:()=>this.pause()
    });
    this.controls = new PointerLockControls(this.camera, this.renderer.domElement, {
      onChange: locked => this.onLockChange(locked),
      onError: () => this.ui.showMessage('Mouse capture was not granted. Click Start or Resume to try again.')
    });
    this.ui = new GameUI({ onStart: () => this.requestPlay(), onRetry: () => this.retry(),
      onPause: () => this.pause(), onModeChange: enabled => this.setTouchMode(enabled),
      onQualityChange: mode => this.quality.setMode(mode) });
    this.touch = new TouchControls({
      root: document.getElementById('touchControls'), move: document.getElementById('movePad'),
      stick: document.getElementById('moveStick'), look: document.getElementById('lookPad'),
      fire: document.getElementById('fireButton'), jump: document.getElementById('jumpButton'),
      onLook: (x, y, sensitivity) => this.controls.look(x, y, sensitivity), onFire: () => this.shoot(),
      viewport: () => [this.viewport.size.width,this.viewport.size.height]
    });
    this.setTouchMode(window.matchMedia('(pointer: coarse)').matches);
    this.levelManager = new LevelManager(this.scene);
    this.enemyManager = new EnemyManager(this.scene);
    this.bossManager = new BossManager(this.scene);
    this.player = new Player(this.camera, this.controls);
    this.effects = new Effects(this.scene);
    this.weapon = new Weapon(this.camera);
    this.raycaster = new THREE.Raycaster();
    this.center = new THREE.Vector2();
    this.resetRun(false);

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('pagehide', this.onPageHide);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.renderer.domElement.addEventListener('pointerdown', this.onMouseDown);
    this.animate();
  }

  requestPlay() {
    if (this.run.phase !== 'ready' && this.run.phase !== 'paused') return;
    unlockAudio();
    if (this.touchMode) this.beginPlay();
    else this.controls.lock(); // Desktop waits for confirmed mouse capture.
  }
  setTouchMode(enabled) {
    if (this.run.active) this.pause();
    this.touchMode = enabled;
    this.quality?.setTouch(enabled);
    this.touch?.setActive(false);
    this.ui?.setTouchMode?.(enabled);
  }
  onLockChange(locked) {
    if (this.disposed || this.touchMode) return;
    if (!locked) {
      this.pause(false);
      return;
    }
    this.beginPlay();
  }
  beginPlay() {
    if (this.run.phase === 'ready') {
      this.run.start();
      playSound('start');
    } else {
      this.run.resume();
    }
    this.last = this.now();
    this.ui.setPhase(this.run.phase);
    this.touch?.setActive(this.touchMode);
    this.gestures?.setActive(true);
  }
  pause(unlock = true) {
    this.keys = {};
    this.touch?.setActive(false);
    this.gestures?.setActive(false);
    this.weapon?.reset();
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
    this.touch?.setActive(false);
    this.gestures?.setActive(false);
    this.effects.clear();
    this.weapon?.reset();
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
    this.quality.record(this.frameSeconds, this.run.active);
    this.ui.tick(this.frameSeconds, this.quality, this.run.active);
    this.frame = requestAnimationFrame(() => this.animate());
  }
  update() {
    const now = this.now();
    const elapsed = Math.max(0, (now - this.last) / 1000);
    this.frameSeconds = elapsed;
    this.last = now;
    if (!this.run.active) return;
    this.run.advance(elapsed);
    const delta = Math.min(elapsed, MAX_FRAME_DELTA);
    this.player.update(delta, this.keys, this.colliders, this.touchMode ? this.touch.input : null);
    this.enemyManager.update(delta, this.colliders);
    if (this.run.phase === 'boss') this.bossManager.update(delta, this.camera.position, this.colliders);
    this.levelManager.updateSun(delta);
    this.effects.update(delta);
    this.weapon?.update(delta, this.player.movement.lengthSq() > 0);
    this.ui.update(this.run, this.enemyManager.getEnemyCount(), this.bossManager.boss);
  }

  shoot() {
    if ((!this.controls.isLocked && !this.touchMode) || !this.run.active) return;
    this.run.recordShot();
    this.weapon?.shoot();
    this.scene.updateMatrixWorld(true);
    this.raycaster.setFromCamera(this.center, this.camera);
    const targets = [...this.colliders, ...this.enemyManager.getEnemies().map(enemy => enemy.mesh)];
    if (this.bossManager.boss) targets.push(this.bossManager.boss.mesh);
    // One ordered hit query makes walls/doors block targets behind them.
    const hit = this.raycaster.intersectObjects(targets, false)[0];
    const end = hit ? hit.point : this.raycaster.ray.at(50, new THREE.Vector3());
    this.effects.tracer(this.weapon?.getMuzzle() || this.camera.position, end);
    playSound('shoot');

    if (hit?.object.userData.isEnemy && this.enemyManager.handleEnemyHit(hit.object)) {
      this.run.recordKill(hit.distance);
      this.ui.flashHit?.('TARGET DOWN' + (this.run.combo > 1 ? ' · ×' + this.run.combo : ''));
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
      this.ui.flashHit?.(result.defeated ? 'CORE CLEARED' : 'CORE HIT');
      this.run.recordBossHit(result.damage);
      if (result.defeated) this.finish();
    }
    this.ui.update(this.run, this.enemyManager.getEnemyCount(), this.bossManager.boss);
  }

  finish() {
    this.run.finish();
    this.keys = {};
    this.touch?.setActive(false);
    this.gestures?.setActive(false);
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
    window.removeEventListener('pagehide', this.onPageHide);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.renderer?.domElement.removeEventListener('pointerdown', this.onMouseDown);
    this.touch?.dispose();
    this.gestures?.dispose();
    this.viewport?.dispose();
    this.immersive?.dispose();
    this.controls?.dispose();
    this.ui?.dispose();
    this.effects?.dispose();
    this.weapon?.dispose();
    this.bossManager?.clear();
    this.enemyManager?.dispose();
    this.levelManager?.dispose();
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
    disposeAudio();
  }
}
