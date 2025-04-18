import { ROOM, BASE_BOSS_HEALTH, MIN_BOSS_HEALTH, BOSS_SPEED } from './game.js';
import { checkBossCollision } from './collision.js';
import { spawnSpark } from './textures.js';
import { playSound } from './audio.js';

/**
 * Boss Class
 * Manages boss behavior and state
 */
export class Boss {
  constructor(scene, position) {
    // Create boss mesh - larger and more intimidating than regular enemies
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 2),
      new THREE.MeshLambertMaterial({ color: 0x8B0000 }) // Dark red
    );
    this.mesh.position.copy(position);
    this.mesh.userData.isBoss = true;
    this.mesh.castShadow = this.mesh.receiveShadow = true;

    // Add glow effect
    const glowGeometry = new THREE.BoxGeometry(2.2, 2.2, 2.2);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.3
    });
    this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.mesh.add(this.glow);

    scene.add(this.mesh);
    this.health = BASE_BOSS_HEALTH;
    this.targetPosition = null;
    this.scene = scene;
  }

  /**
   * Update boss position and handle collisions
   * @param {number} dt - Delta time
   * @param {THREE.Vector3} playerPosition - Player's position
   * @param {Array} colliders - Array of collidable objects
   */
  update(dt, playerPosition, colliders) {
    // Update target position periodically
    if (!this.targetPosition || this.mesh.position.distanceTo(this.targetPosition) < 1) {
      this.targetPosition = this.getNewTargetPosition(playerPosition);
    }

    // Move towards target
    const direction = new THREE.Vector3()
      .subVectors(this.targetPosition, this.mesh.position)
      .normalize();
    
    const step = BOSS_SPEED * dt;
    const newPosition = new THREE.Vector3()
      .copy(this.mesh.position)
      .add(direction.multiplyScalar(step));

    // Check for collisions
    if (!checkBossCollision(newPosition, colliders)) {
      this.mesh.position.copy(newPosition);
    } else {
      this.targetPosition = this.getNewTargetPosition(playerPosition);
    }

    // Update glow effect
    const glowIntensity = 0.3 + 0.1 * Math.sin(performance.now() * 0.003);
    this.glow.material.opacity = glowIntensity;
  }

  getNewTargetPosition(playerPosition) {
    // 70% chance to move towards player, 30% chance to move to random position
    if (Math.random() < 0.7) {
      return new THREE.Vector3(
        playerPosition.x + (Math.random() - 0.5) * 5,
        1,
        playerPosition.z + (Math.random() - 0.5) * 5
      );
    } else {
      return new THREE.Vector3(
        (Math.random() - 0.5) * ROOM * 1.5,
        1,
        (Math.random() - 0.5) * ROOM * 1.5
      );
    }
  }

  /**
   * Handle boss hit
   * @param {number} amount - Amount of damage to deal
   * @param {THREE.Vector3} hitPoint - Point of impact
   * @returns {boolean} True if boss was defeated
   */
  takeDamage(amount, hitPoint) {
    this.health -= amount;
    spawnSpark(this.scene, hitPoint);
    playSound('boss-hit');
    
    // Visual feedback
    this.mesh.material.emissive.setHex(0xff0000);
    setTimeout(() => {
      this.mesh.material.emissive.setHex(0x000000);
    }, 100);

    return this.health <= 0;
  }
}

/**
 * Boss Manager
 * Manages boss state and behavior
 */
export class BossManager {
  constructor(scene, game) {
    this.scene = scene;
    this.game = game;
    this.boss = null;
    this.isBossFight = false;
    this.damageDealt = 0;
  }

  /**
   * Start a new boss fight
   */
  startBossFight() {
    // Calculate boss health based on how quickly player cleared the level
    const timeBonus = Math.max(0, 30000 - (performance.now() - this.game.startTime));
    const health = Math.max(MIN_BOSS_HEALTH, BASE_BOSS_HEALTH - timeBonus / 1000);

    // Spawn boss in center of room
    this.boss = new Boss(this.scene, new THREE.Vector3(0, 1, 0));
    this.boss.health = health;
    this.isBossFight = true;
    this.damageDealt = 0;

    playSound('boss-spawn');
  }

  /**
   * Update boss state
   * @param {number} dt - Delta time
   * @param {Array} colliders - Array of collidable objects
   */
  update(dt, colliders) {
    if (this.isBossFight && this.boss) {
      this.boss.update(dt, this.game.camera.position, colliders);
    }
  }

  /**
   * Handle boss hit
   * @param {THREE.Vector3} hitPoint - Point of impact
   * @returns {boolean} True if boss was defeated
   */
  handleHit(hitPoint) {
    if (!this.boss) return false;

    const damage = 10;
    this.damageDealt += damage;
    const isDead = this.boss.takeDamage(damage, hitPoint);

    if (isDead) {
      this.endBossFight();
      return true;
    }
    return false;
  }

  /**
   * End the current boss fight
   */
  endBossFight() {
    if (this.boss) {
      this.scene.remove(this.boss.mesh);
      this.boss = null;
    }
    this.isBossFight = false;
    playSound('boss-death');
  }

  /**
   * Get the current health of the boss
   * @returns {number} Boss health
   */
  getBossHealth() {
    return this.boss ? this.boss.health : 0;
  }

  /**
   * Clear boss state
   */
  clear() {
    if (this.boss) {
      this.scene.remove(this.boss.mesh);
      this.boss = null;
    }
    this.isBossFight = false;
  }
} 