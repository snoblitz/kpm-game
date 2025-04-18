import { ROOM } from './constants.js';
import { checkEnemyCollision } from './collision.js';
import { spawnSpark } from './textures.js';
import { playSound, playComboSound } from './audio.js';

/**
 * Enemy Class
 * Manages enemy behavior and state
 */
export class Enemy {
  constructor(scene, position) {
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xff0000 })
    );
    this.mesh.position.copy(position);
    this.mesh.userData.dir = Math.random() * Math.PI * 2;
    this.mesh.userData.isEnemy = true;
    this.mesh.castShadow = this.mesh.receiveShadow = true;
    scene.add(this.mesh);
  }

  /**
   * Update enemy position and handle collisions
   * @param {number} dt - Delta time
   * @param {Array} colliders - Array of collidable objects
   */
  update(dt, colliders) {
    const step = 4 * dt; // Base enemy speed
    
    // Calculate new position
    const nx = this.mesh.position.x + Math.cos(this.mesh.userData.dir) * step;
    const nz = this.mesh.position.z + Math.sin(this.mesh.userData.dir) * step;
    
    // Check for collisions
    const newPos = new THREE.Vector3(nx, this.mesh.position.y, nz);
    if (checkEnemyCollision(newPos, colliders)) {
      // If collision, change direction
      this.mesh.userData.dir += Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 2;
    } else {
      // If no collision, move to new position
      this.mesh.position.copy(newPos);
    }
    
    // Keep enemy within bounds
    if (Math.abs(this.mesh.position.x) > ROOM - 1) {
      this.mesh.position.x = Math.sign(this.mesh.position.x) * (ROOM - 1);
      this.mesh.userData.dir = Math.PI - this.mesh.userData.dir;
    }
    if (Math.abs(this.mesh.position.z) > ROOM - 1) {
      this.mesh.position.z = Math.sign(this.mesh.position.z) * (ROOM - 1);
      this.mesh.userData.dir = -this.mesh.userData.dir;
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
    this.spawnEnemies(5); // Start with 5 enemies
  }

  spawnEnemies(count) {
    for (let i = 0; i < count; i++) {
      let position;
      do {
        position = new THREE.Vector3(
          (Math.random() - 0.5) * ROOM * 1.5,
          0.25,
          (Math.random() - 0.5) * ROOM * 1.5
        );
      } while (this.isPositionOccupied(position));

      const enemy = new Enemy(this.scene, position);
      this.enemies.push(enemy);
    }
  }

  isPositionOccupied(position) {
    return this.enemies.some(enemy => 
      enemy.mesh.position.distanceTo(position) < 1
    );
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

  removeEnemy(enemy) {
    const index = this.enemies.indexOf(enemy);
    if (index > -1) {
      this.scene.remove(enemy.mesh);
      this.enemies.splice(index, 1);
    }
  }

  getEnemies() {
    return this.enemies;
  }
} 