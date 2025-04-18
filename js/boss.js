import { BOSS_SPEED, BASE_BOSS_HEALTH, MIN_BOSS_HEALTH } from './utils.js';
import { checkBossCollision } from './collision.js';
import { createBossHealthBar, updateBossHealthBar } from './ui.js';
import { spawnSpark } from './textures.js';
import { playSound } from './audio.js';

/**
 * Boss Class
 * Manages boss behavior and state
 */
export class Boss {
  constructor(scene, position) {
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xff0000 })
    );
    this.mesh.position.copy(position);
    this.mesh.userData.dir = Math.random() * Math.PI * 2;
    this.mesh.userData.isBoss = true;
    this.mesh.castShadow = this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    this.healthBar = createBossHealthBar();
    scene.add(this.healthBar.sprite);
  }

  /**
   * Update boss position and handle collisions
   * @param {number} dt - Delta time
   * @param {Array} colliders - Array of collidable objects
   */
  update(dt, colliders) {
    const step = BOSS_SPEED * dt;
    const nx = this.mesh.position.x + Math.cos(this.mesh.userData.dir) * step;
    const nz = this.mesh.position.z + Math.sin(this.mesh.userData.dir) * step;
    
    const newPos = new THREE.Vector3(nx, 0.25, nz);
    if (checkBossCollision(newPos, colliders)) {
      this.mesh.userData.dir += Math.PI;  // Reverse direction on collision
    } else {
      this.mesh.position.copy(newPos);
    }

    // Update health bar position
    this.healthBar.sprite.position.set(
      this.mesh.position.x,
      this.mesh.position.y + 1,
      this.mesh.position.z
    );
  }

  /**
   * Handle boss hit
   * @param {number} damage - Amount of damage to deal
   * @returns {boolean} True if boss was defeated
   */
  handleHit(damage) {
    this.health -= damage;
    updateBossHealthBar(this.healthBar, this.health, this.maxHealth);
    
    if (this.health <= 0) {
      this.scene.remove(this.mesh);
      this.scene.remove(this.healthBar.sprite);
      playSound('endwin');
      return true;
    }
    
    return false;
  }
}

/**
 * Boss Manager
 * Manages boss state and behavior
 */
export class BossManager {
  constructor(scene) {
    this.scene = scene;
    this.boss = null;
    this.isBossFight = false;
    this.startTime = null;
    this.endTime = null;
    this.hits = 0;
    this.damageDealt = 0;
  }

  /**
   * Spawn a new boss
   * @param {number} clearTime - Time taken to clear the level
   */
  spawnBoss(clearTime) {
    this.isBossFight = true;
    this.startTime = performance.now();
    this.hits = 0;
    this.damageDealt = 0;
    
    // Calculate boss health based on clear speed
    const timeBonus = Math.max(0, 30 - clearTime);  // Bonus for clearing under 30 seconds
    const maxHealth = Math.max(MIN_BOSS_HEALTH, BASE_BOSS_HEALTH - timeBonus);
    
    // Create boss at random position
    let position;
    do {
      position = new THREE.Vector3(
        (Math.random() - 0.5) * ROOM * 1.5,
        0.25,
        (Math.random() - 0.5) * ROOM * 1.5
      );
    } while (blocked(position.x, position.z, colliders));
    
    this.boss = new Boss(this.scene, position);
    this.boss.health = maxHealth;
    this.boss.maxHealth = maxHealth;
  }

  /**
   * Update boss state
   * @param {number} dt - Delta time
   * @param {Array} colliders - Array of collidable objects
   */
  update(dt, colliders) {
    if (this.boss) {
      this.boss.update(dt, colliders);
    }
  }

  /**
   * Handle boss hit
   * @param {THREE.Vector3} hitPoint - Point of impact
   * @returns {Object|null} Boss fight statistics if boss was defeated
   */
  handleBossHit(hitPoint) {
    if (!this.boss) return null;

    const damage = 10;
    this.hits++;
    this.damageDealt += damage;
    
    spawnSpark(this.scene, hitPoint);
    
    if (this.boss.handleHit(damage)) {
      this.endTime = performance.now();
      this.isBossFight = false;
      
      return {
        time: (this.endTime - this.startTime) / 1000,
        accuracy: (this.hits / (shotsFired - (shotsHit - this.hits))) * 100,
        dps: this.damageDealt / ((this.endTime - this.startTime) / 1000),
        hits: this.hits,
        damage: this.damageDealt
      };
    }
    
    return null;
  }

  /**
   * Clear boss state
   */
  clear() {
    if (this.boss) {
      this.scene.remove(this.boss.mesh);
      this.scene.remove(this.boss.healthBar.sprite);
      this.boss = null;
    }
    this.isBossFight = false;
  }
} 