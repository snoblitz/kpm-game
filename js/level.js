import { ROOM, WALL_H, ENEMY_COUNT } from './constants.js';
import { disposeObjects } from './textures.js';

export class LevelManager {
  constructor(scene) {
    this.scene = scene;
    this.walls = [];
    this.colliders = [];
    this.time = 0;
    this.sunLight = new THREE.DirectionalLight(0xffffaa, 1.5);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sunLight.shadow.camera, { near: 0.5, far: 100, left: -30, right: 30, top: 30, bottom: -30 });
    this.sunLight.shadow.bias = -0.0001;
    this.skyLight = new THREE.HemisphereLight(0x87ceeb, 0x404040, 0.5);
    this.sun = new THREE.Mesh(
      new THREE.SphereGeometry(2, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.8 })
    );
    this.scene.add(this.sunLight, this.skyLight, this.sun);
    this.generateLevel();
    this.updateSun(0);
  }

  generateLevel() {
    this.clearArena();
    this.time = 0;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM * 2, ROOM * 2),
      new THREE.MeshLambertMaterial({ color: 0x404040 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.userData.isFloor = true;
    this.scene.add(floor);
    this.walls.push(floor);

    const geometry = new THREE.BoxGeometry(ROOM * 2, WALL_H, 1);
    const material = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    [[0, -ROOM, 0], [0, ROOM, 0], [-ROOM, 0, Math.PI / 2], [ROOM, 0, Math.PI / 2]]
      .forEach(([x, z, rotation]) => {
        const wall = new THREE.Mesh(geometry, material);
        wall.position.set(x, WALL_H / 2, z);
        wall.rotation.y = rotation;
        wall.castShadow = wall.receiveShadow = true;
        this.scene.add(wall);
        this.walls.push(wall);
      });
    // A visible exit marks the completion objective; it unlocks after the boss.
    this.door = new THREE.Mesh(
      new THREE.BoxGeometry(2, 3, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x555555 })
    );
    this.door.position.set(0, 1.5, -ROOM + 0.5);
    this.door.userData.isDoor = true;
    this.scene.add(this.door);
    this.walls.push(this.door);
    this.colliders = [...this.walls];
    this.scene.updateMatrixWorld(true);
    this.colliders.forEach(mesh => {
      if (!mesh.userData.isFloor) mesh.userData.bounds = new THREE.Box3().setFromObject(mesh);
    });
  }
  getColliders() { return this.colliders; }
  getEnemyCount() { return ENEMY_COUNT; }
  unlockDoor() { this.door.material.color.setHex(0x00ff00); }
  updateSun(delta) {
    this.time += delta * 0.1;
    this.sun.position.set(Math.cos(this.time) * 40, Math.abs(Math.sin(this.time)) * 20 + 10, Math.sin(this.time) * 40);
    this.sunLight.position.copy(this.sun.position);
  }
  clearArena() {
    this.walls.forEach(mesh => this.scene.remove(mesh));
    disposeObjects(this.walls);
    this.walls = [];
    this.colliders = [];
    this.door = null;
  }
  dispose() {
    this.clearArena();
    this.scene.remove(this.sun, this.sunLight, this.skyLight);
    disposeObjects([this.sun]);
    this.sunLight.shadow.map?.dispose();
  }
}
