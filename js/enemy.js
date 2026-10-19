import { ROOM, ENEMY_SPEED } from './constants.js';
import { checkEnemyCollision } from './collision.js';

export class Enemy {
  constructor(scene, position, geometry, material) {
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    this.mesh.userData.dir = Math.random() * Math.PI * 2;
    this.mesh.userData.isEnemy = true;
    this.mesh.scale.y = 1.5;
    this.nextPosition = new THREE.Vector3();
    scene.add(this.mesh);
  }
  update(delta, colliders) {
    this.mesh.rotation.y += delta * 1.6;
    const direction = this.mesh.userData.dir;
    this.nextPosition.set(
      this.mesh.position.x + Math.cos(direction) * ENEMY_SPEED * delta,
      this.mesh.position.y,
      this.mesh.position.z + Math.sin(direction) * ENEMY_SPEED * delta
    );
    if (checkEnemyCollision(this.nextPosition, colliders)) {
      this.mesh.userData.dir += Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 2;
    } else {
      this.mesh.position.copy(this.nextPosition);
    }
  }
}

export class EnemyManager {
  constructor(scene) {
    this.scene = scene;
    this.enemies = [];
    this.geometry = new THREE.OctahedronGeometry(0.38, 0);
    this.material = new THREE.MeshLambertMaterial({ color: 0xffc66d, emissive: 0x683000 });
  }
  spawnEnemies(count, colliders) {
    this.clear();
    for (let i = 0; i < count; i++) {
      let position;
      for (let attempt = 0; attempt < 1000; attempt++) {
        position = new THREE.Vector3((Math.random() - 0.5) * ROOM * 1.5, 0.7, (Math.random() - 0.5) * ROOM * 1.5);
        if (Math.hypot(position.x, position.z) > 3 &&
            !checkEnemyCollision(position, colliders) &&
            !this.enemies.some(enemy => enemy.mesh.position.distanceTo(position) < 1)) break;
        position = null;
      }
      if (!position) throw new Error('Could not find a clear enemy spawn position.');
      this.enemies.push(new Enemy(this.scene, position, this.geometry, this.material));
    }
  }
  update(delta, colliders) { this.enemies.forEach(enemy => enemy.update(delta, colliders)); }
  handleEnemyHit(mesh) {
    const index = this.enemies.findIndex(enemy => enemy.mesh === mesh);
    if (index < 0) return false;
    this.scene.remove(mesh);
    this.enemies.splice(index, 1);
    return true;
  }
  getEnemies() { return this.enemies; }
  getEnemyCount() { return this.enemies.length; }
  clear() {
    this.enemies.forEach(enemy => this.scene.remove(enemy.mesh));
    this.enemies = [];
  }
  dispose() {
    this.clear();
    this.geometry.dispose();
    this.material.dispose();
  }
}
