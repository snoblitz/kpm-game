import { PointerLockControls } from './PointerLockControls.js';
import { LevelManager } from './level.js';
import { EnemyManager } from './enemy.js';
import { BossManager } from './boss.js';
import { Player } from './player.js';
import { ROOM, WALL_H, RADIUS, WALK, RUN, GRAV, JUMP, BASE_BOSS_HEALTH, MIN_BOSS_HEALTH, BOSS_SPEED, MAX_LEVELS, ENEMIES_PER_LEVEL } from './constants.js';

export class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.flashlight = null;
        this.restartTarget = null;
        
        // Game state
        this.currentLevel = 1;
        this.startTime = null;
        this.endTime = null;
        this.bossStartTime = null;
        this.bossEndTime = null;
        
        // Statistics
        this.shotsFired = 0;
        this.shotsHit = 0;
        this.enemiesKilled = 0;
        this.bossHits = 0;
        this.bossDamageDealt = 0;
        
        // Collections
        this.keys = {};
        this.colliders = [];
        this.enemies = [];
        
        // Physics
        this.yVel = 0;
        this.last = performance.now();
        
        // Combat
        this.lastKillTime = 0;
        this.comboCount = 0;
        this.currentGameLongestKill = 0;
        this.allTimeLongestKill = 0;
        
        // Managers
        this.levelManager = null;
        this.enemyManager = null;
        this.bossManager = null;
        this.player = null;
    }

    init() {
        // Clear any existing longest kill data
        localStorage.removeItem('longestKill');
        document.getElementById('longestKill').textContent = 'Longest Kill: 0.00m';
        
        // Initialize Three.js scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 2, 0); // Set initial camera position
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1).normalize();
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        // Initialize controls
        this.controls = new PointerLockControls(this.camera, document.body);
        this.scene.add(this.controls.getObject());
        
        // Set up keyboard event listeners
        document.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        document.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
        
        // Set up pointer lock controls
        document.addEventListener('click', () => {
            if (!this.controls.isLocked) {
                this.controls.lock();
            }
        });
        
        // Set up mouse click for shooting
        document.addEventListener('mousedown', (e) => {
            if (e.button === 0 && this.controls.isLocked) { // Left click
                this.shoot();
            }
        });
        
        // Initialize managers
        this.levelManager = new LevelManager(this.scene);
        this.colliders = this.levelManager.getColliders();
        this.enemyManager = new EnemyManager(this.scene);
        this.bossManager = new BossManager(this.scene, this);
        this.player = new Player(this.camera, this.controls);
        
        // Initialize raycaster for shooting
        this.raycaster = new THREE.Raycaster();
        
        // Start timer
        this.startTime = performance.now();
        this.updateTimer();
        
        // Start game loop
        this.animate();
        
        // Force initial render
        this.render();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.render();
    }

    update() {
        // Update game state
        const now = performance.now();
        const delta = (now - this.last) / 1000;
        this.last = now;
        
        // Update managers
        if (this.player) this.player.update(delta, this.keys, this.colliders);
        if (this.enemyManager) this.enemyManager.update(delta, this.colliders);
        if (this.bossManager && this.bossManager.isBossFight) this.bossManager.update(delta, this.colliders);
        
        // Update enemy positions and check collisions
        this.enemyManager.getEnemies().forEach(enemy => {
            enemy.update(delta, this.colliders);
        });
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    updateTimer() {
        const now = performance.now();
        const elapsed = (now - this.startTime) / 1000;
        const minutes = Math.floor(elapsed / 60);
        const seconds = Math.floor(elapsed % 60);
        const milliseconds = Math.floor((elapsed % 1) * 100);
        document.getElementById('timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
        requestAnimationFrame(() => this.updateTimer());
    }

    shoot() {
        this.shotsFired++;
        
        // Update raycaster with current camera position and direction
        this.raycaster.setFromCamera(new THREE.Vector2(), this.camera);
        
        // Check for hits with enemies
        const enemyHits = this.raycaster.intersectObjects(this.enemyManager.getEnemies().map(e => e.mesh));
        if (enemyHits.length > 0) {
            const hitEnemy = enemyHits[0].object;
            if (this.enemyManager.handleEnemyHit(hitEnemy, enemyHits[0].point)) {
                this.shotsHit++;
                this.enemiesKilled++;
                document.getElementById('remaining').textContent = `Enemies: ${this.enemyManager.getEnemyCount()}`;
            }
        }
        
        // Check for hits with the door
        const doorHits = this.raycaster.intersectObject(this.levelManager.door);
        if (doorHits.length > 0) {
            this.levelManager.nextLevel();
            this.enemyManager.spawnEnemies(this.levelManager.getEnemyCount());
            document.getElementById('remaining').textContent = `Enemies: ${this.enemyManager.getEnemyCount()}`;
        }
    }
}