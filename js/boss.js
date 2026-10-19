import { ROOM, BASE_BOSS_HEALTH, MIN_BOSS_HEALTH, BOSS_SPEED } from './constants.js';
import { checkBossCollision } from './collision.js';
import { playSound } from './audio.js';
import { disposeObjects } from './textures.js';

export class Boss {
  constructor(scene, health) {
    this.scene = scene;
    this.mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.4, 0),
      new THREE.MeshLambertMaterial({ color: 0xe875ba, emissive: 0x40102d })
    );
    this.mesh.position.set(0, 1.5, 0);
    this.mesh.userData.isBoss = true;
    this.glow = new THREE.Mesh(
      new THREE.TorusGeometry(1.8, 0.055, 4, 24),
      new THREE.MeshBasicMaterial({ color: 0x70e8ed })
    );
    this.mesh.add(this.glow);
    this.health = this.maxHealth = health;
    this.targetPosition = null;
    this.nextPosition = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.time = 0;
    this.hitFlash = 0;
    scene.add(this.mesh);
  }
  update(delta, playerPosition, colliders) {
    this.time += delta;
    this.hitFlash = Math.max(0, this.hitFlash - delta);
    this.mesh.material.emissive.setHex(this.hitFlash ? 0xffc275 : 0x40102d);
    if (!this.targetPosition || this.mesh.position.distanceTo(this.targetPosition) < 1) {
      this.targetPosition = this.getNewTargetPosition(playerPosition);
    }
    this.direction.subVectors(this.targetPosition, this.mesh.position);
    const distance = this.direction.length();
    this.nextPosition.copy(this.mesh.position).addScaledVector(this.direction.normalize(), Math.min(distance, BOSS_SPEED * delta));
    if (checkBossCollision(this.nextPosition, colliders)) this.targetPosition = null;
    else this.mesh.position.copy(this.nextPosition);
    this.glow.rotation.set(this.time * 0.7, this.time * 0.5, 0.2);
  }
  getNewTargetPosition(playerPosition) {
    const target = Math.random() < 0.7
      ? new THREE.Vector3(playerPosition.x + (Math.random() - 0.5) * 5, 1.5, playerPosition.z + (Math.random() - 0.5) * 5)
      : new THREE.Vector3((Math.random() - 0.5) * ROOM * 1.5, 1.5, (Math.random() - 0.5) * ROOM * 1.5);
    target.x = Math.max(-ROOM + 3, Math.min(ROOM - 3, target.x));
    target.z = Math.max(-ROOM + 3, Math.min(ROOM - 3, target.z));
    return target;
  }
  takeDamage(amount) {
    const damage = Math.min(this.health, amount);
    this.health -= damage;
    this.hitFlash = 0.1;
    playSound('boss-hit');
    return damage;
  }
  dispose() {
    this.scene.remove(this.mesh);
    disposeObjects([this.mesh]);
  }
}

export class BossManager {
  constructor(scene) {
    this.scene = scene;
    this.boss = null;
  }
  startBossFight(clearSeconds, playerPosition = new THREE.Vector3()) {
    this.clear();
    const timeBonus = Math.max(0, 30 - clearSeconds);
    this.boss = new Boss(this.scene, Math.max(MIN_BOSS_HEALTH, BASE_BOSS_HEALTH - timeBonus));
    this.boss.mesh.position.set(playerPosition.x > 0 ? -8 : 8, 1.5, playerPosition.z > 0 ? -8 : 8);
    playSound('boss-spawn');
  }
  update(delta, playerPosition, colliders) { this.boss?.update(delta, playerPosition, colliders); }
  handleHit() {
    if (!this.boss) return { damage: 0, defeated: false };
    const damage = this.boss.takeDamage(10);
    const defeated = this.boss.health <= 0;
    if (defeated) {
      this.clear();
      playSound('boss-death');
    }
    return { damage, defeated };
  }
  clear() {
    this.boss?.dispose();
    this.boss = null;
  }
}
