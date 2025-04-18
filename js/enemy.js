import { checkEnemyCollision } from './collision.js';
import { spawnSpark } from './textures.js';
import { playSound, playComboSound } from './audio.js';

/**
 * Enemy Class
 * Manages enemy behavior and state
 */
export class Enemy {
  constructor(scene, position, speed) {
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshLambertMaterial({ color: 0xaa0000 })
    );
    this.mesh.position.copy(position);
    this.mesh.userData.dir = Math.random() * Math.PI * 2;
    this.mesh.userData.speed = speed;
    this.mesh.castShadow = this.mesh.receiveShadow = true;
    scene.add(this.mesh);
  }

  /**
   * Update enemy position and handle collisions
   * @param {number} dt - Delta time
   * @param {Array} colliders - Array of collidable objects
   */
  update(dt, colliders) {
    const step = this.mesh.userData.speed * dt;
    const nx = this.mesh.position.x + Math.cos(this.mesh.userData.dir) * step;
    const nz = this.mesh.position.z + Math.sin(this.mesh.userData.dir) * step;
    
    const newPos = new THREE.Vector3(nx, 0.5, nz);
    if (checkEnemyCollision(newPos, colliders)) {
      this.mesh.userData.dir += Math.PI;  // Reverse direction on collision
    } else {
      this.mesh.position.copy(newPos);
    }
  }

  /**
   * Handle enemy hit
   * @param {THREE.Scene} scene - The game scene
   * @param {THREE.Vector3} hitPoint - Point of impact
   * @param {number} lastKillTime - Time of last kill
   * @param {number} currentTime - Current time
   * @returns {Object} Updated kill statistics
   */
  handleHit(scene, hitPoint, lastKillTime, currentTime) {
    spawnSpark(scene, hitPoint);
    scene.remove(this.mesh);
    playSound('hit');

    // Handle kill combo system
    let comboCount = 1;
    if (currentTime - lastKillTime < 2000) {
      comboCount++;
      playComboSound(comboCount);
    }

    return {
      comboCount,
      lastKillTime: currentTime
    };
  }
}

/**
 * Enemy Manager
 * Manages all enemies in the game
 */
export class EnemyManager {
  constructor(scene) {
    this.scene = scene;
    this.enemies = [];
    this.lastKillTime = 0;
    this.comboCount = 0;
  }

  /**
   * Spawn a new enemy
   * @param {THREE.Vector3} position - Spawn position
   * @param {number} speed - Enemy speed
   */
  spawnEnemy(position, speed) {
    const enemy = new Enemy(this.scene, position, speed);
    this.enemies.push(enemy);
  }

  /**
   * Update all enemies
   * @param {number} dt - Delta time
   * @param {Array} colliders - Array of collidable objects
   */
  update(dt, colliders) {
    this.enemies.forEach(enemy => enemy.update(dt, colliders));
  }

  /**
   * Handle enemy hit
   * @param {THREE.Object3D} enemyMesh - The hit enemy mesh
   * @param {THREE.Vector3} hitPoint - Point of impact
   * @returns {boolean} True if enemy was killed
   */
  handleEnemyHit(enemyMesh, hitPoint) {
    const enemy = this.enemies.find(e => e.mesh === enemyMesh);
    if (!enemy) return false;

    const currentTime = performance.now();
    const { comboCount, lastKillTime } = enemy.handleHit(
      this.scene,
      hitPoint,
      this.lastKillTime,
      currentTime
    );

    this.enemies = this.enemies.filter(e => e !== enemy);
    this.comboCount = comboCount;
    this.lastKillTime = lastKillTime;

    return true;
  }

  /**
   * Get number of remaining enemies
   * @returns {number} Number of enemies
   */
  getEnemyCount() {
    return this.enemies.length;
  }

  /**
   * Clear all enemies
   */
  clear() {
    this.enemies.forEach(enemy => this.scene.remove(enemy.mesh));
    this.enemies = [];
  }
} 