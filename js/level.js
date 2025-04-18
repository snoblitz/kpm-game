import { ROOM, WALL_H, ENEMIES_PER_LEVEL } from './constants.js';
import { makeBrickTexture } from './textures.js';
import { playSound } from './audio.js';

/**
 * Level Manager
 * Manages level generation and state
 */
export class LevelManager {
  constructor(scene) {
    this.scene = scene;
    this.currentLevel = 1;
    this.walls = [];
    this.door = null;
    this.sunLight = null;
    this.sun = null;
    this.time = 0;
    this.generateLevel();
  }

  generateLevel() {
    // Clear existing level
    this.walls.forEach(wall => this.scene.remove(wall));
    this.walls = [];
    if (this.door) this.scene.remove(this.door);

    // Create sun and main light
    if (!this.sunLight) {
      this.sunLight = new THREE.DirectionalLight(0xffffaa, 1.5);
      this.sunLight.position.set(20, 20, 20);
      this.sunLight.castShadow = true;
      
      // Improve shadow quality
      this.sunLight.shadow.mapSize.width = 2048;
      this.sunLight.shadow.mapSize.height = 2048;
      this.sunLight.shadow.camera.near = 0.5;
      this.sunLight.shadow.camera.far = 100;
      this.sunLight.shadow.camera.left = -30;
      this.sunLight.shadow.camera.right = 30;
      this.sunLight.shadow.camera.top = 30;
      this.sunLight.shadow.camera.bottom = -30;
      this.sunLight.shadow.bias = -0.0001;
      
      this.scene.add(this.sunLight);

      // Create sun sphere
      const sunGeometry = new THREE.SphereGeometry(2, 32, 32);
      const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.8 });
      this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
      this.scene.add(this.sun);
    }

    // Create floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM * 2, ROOM * 2),
      new THREE.MeshLambertMaterial({ color: 0x404040 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.walls.push(floor);

    // Create sky hemisphere light
    const skyLight = new THREE.HemisphereLight(0x87ceeb, 0x404040, 0.5);
    this.scene.add(skyLight);

    // Create walls
    const wallGeometry = new THREE.BoxGeometry(ROOM * 2, WALL_H, 1);
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });  // Saddle brown for walls

    // North wall
    const northWall = new THREE.Mesh(wallGeometry, wallMaterial);
    northWall.position.set(0, WALL_H / 2, -ROOM);
    northWall.castShadow = northWall.receiveShadow = true;
    northWall.geometry.computeBoundingBox();
    this.scene.add(northWall);
    this.walls.push(northWall);

    // South wall
    const southWall = new THREE.Mesh(wallGeometry, wallMaterial);
    southWall.position.set(0, WALL_H / 2, ROOM);
    southWall.castShadow = southWall.receiveShadow = true;
    southWall.geometry.computeBoundingBox();
    this.scene.add(southWall);
    this.walls.push(southWall);

    // East wall
    const eastWall = new THREE.Mesh(wallGeometry, wallMaterial);
    eastWall.rotation.y = Math.PI / 2;
    eastWall.position.set(ROOM, WALL_H / 2, 0);
    eastWall.castShadow = eastWall.receiveShadow = true;
    eastWall.geometry.computeBoundingBox();
    this.scene.add(eastWall);
    this.walls.push(eastWall);

    // West wall
    const westWall = new THREE.Mesh(wallGeometry, wallMaterial);
    westWall.rotation.y = Math.PI / 2;
    westWall.position.set(-ROOM, WALL_H / 2, 0);
    westWall.castShadow = westWall.receiveShadow = true;
    westWall.geometry.computeBoundingBox();
    this.scene.add(westWall);
    this.walls.push(westWall);

    // Add door
    this.addDoor();
  }

  addDoor() {
    // Create door
    const doorGeometry = new THREE.BoxGeometry(2, 3, 0.5);
    const doorMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
    this.door = new THREE.Mesh(doorGeometry, doorMaterial);
    
    // Position door on a random wall
    const wallChoice = Math.floor(Math.random() * 4);
    switch(wallChoice) {
      case 0: // North wall
        this.door.position.set(Math.random() * ROOM - ROOM/2, 1.5, -ROOM + 0.5);
        break;
      case 1: // South wall
        this.door.position.set(Math.random() * ROOM - ROOM/2, 1.5, ROOM - 0.5);
        this.door.rotation.y = Math.PI;
        break;
      case 2: // East wall
        this.door.position.set(ROOM - 0.5, 1.5, Math.random() * ROOM - ROOM/2);
        this.door.rotation.y = -Math.PI / 2;
        break;
      case 3: // West wall
        this.door.position.set(-ROOM + 0.5, 1.5, Math.random() * ROOM - ROOM/2);
        this.door.rotation.y = Math.PI / 2;
        break;
    }
    
    this.door.userData.isDoor = true;
    this.door.castShadow = this.door.receiveShadow = true;
    this.door.geometry.computeBoundingBox();
    this.scene.add(this.door);
  }

  nextLevel() {
    this.currentLevel++;
    this.generateLevel();
  }

  getColliders() {
    return [...this.walls, this.door];
  }

  /**
   * Create a wall segment
   * @param {number} x - X position
   * @param {number} z - Z position
   * @param {number} w - Width
   * @param {number} h - Height
   * @param {number} d - Depth
   * @param {number} rot - Rotation in radians
   * @returns {THREE.Mesh} The created wall mesh
   */
  createWall(x, z, w, h, d, rot = 0) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.materials.wall);
    wall.position.set(x, h / 2, z);
    wall.rotation.y = rot;
    wall.castShadow = wall.receiveShadow = true;
    wall.geometry.computeBoundingBox();
    this.colliders.push(wall);
    this.scene.add(wall);
    return wall;
  }

  /**
   * Create the floor
   */
  createFloor() {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), this.materials.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.userData.isFloor = true;
    this.scene.add(floor);
    this.colliders.push(floor);
  }

  /**
   * Create level door
   * @returns {THREE.Mesh} The created door mesh
   */
  createLevelDoor() {
    const doorGeometry = new THREE.BoxGeometry(2, 4, 0.2);
    const doorMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x4CAF50,
      transparent: true,
      opacity: 0.9
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    
    // Position door on a random wall, but slightly in front of it
    const walls = [
      { pos: new THREE.Vector3(0, 2, -ROOM + 0.5), rot: 0, gap: true, dir: 'north' },
      { pos: new THREE.Vector3(0, 2, ROOM - 0.5), rot: Math.PI, gap: true, dir: 'south' },
      { pos: new THREE.Vector3(-ROOM + 0.5, 2, 0), rot: Math.PI/2, gap: true, dir: 'west' },
      { pos: new THREE.Vector3(ROOM - 0.5, 2, 0), rot: -Math.PI/2, gap: true, dir: 'east' }
    ];
    const wall = walls[Math.floor(Math.random() * walls.length)];
    door.position.copy(wall.pos);
    door.rotation.y = wall.rot;
    
    // Create gap in the wall
    const gapSize = 3;
    const wallPositions = [
      { x: 0, z: -ROOM, w: ROOM * 2, h: WALL_H, d: 1, rot: 0, dir: 'north' },
      { x: 0, z: ROOM, w: ROOM * 2, h: WALL_H, d: 1, rot: 0, dir: 'south' },
      { x: -ROOM, z: 0, w: 1, h: WALL_H, d: ROOM * 2, rot: Math.PI/2, dir: 'west' },
      { x: ROOM, z: 0, w: 1, h: WALL_H, d: ROOM * 2, rot: -Math.PI/2, dir: 'east' }
    ];
    
    const doorWall = wallPositions.find(w => w.dir === wall.dir);
    if (doorWall) {
      const halfWidth = (doorWall.w - gapSize) / 2;
      const halfDepth = (doorWall.d - gapSize) / 2;
      
      if (wall.dir === 'north' || wall.dir === 'south') {
        this.createWall(-(halfWidth + gapSize/2), doorWall.z, halfWidth, WALL_H, 1, doorWall.rot);
        this.createWall(halfWidth + gapSize/2, doorWall.z, halfWidth, WALL_H, 1, doorWall.rot);
      } else {
        this.createWall(doorWall.x, -(halfDepth + gapSize/2), 1, WALL_H, halfDepth, doorWall.rot);
        this.createWall(doorWall.x, halfDepth + gapSize/2, 1, WALL_H, halfDepth, doorWall.rot);
      }
    }
    
    // Add glow effect
    const glowGeometry = new THREE.BoxGeometry(3, 5, 0.1);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x4CAF50,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(wall.pos);
    glow.rotation.y = wall.rot;
    this.scene.add(glow);
    
    // Add level text
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#4CAF50';
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${this.currentLevel + 1}`, canvas.width / 2, 40);

    const textTexture = new THREE.CanvasTexture(canvas);
    const textMaterial = new THREE.SpriteMaterial({ 
      map: textTexture, 
      transparent: true,
      opacity: 0.9
    });
    const textSprite = new THREE.Sprite(textMaterial);
    textSprite.scale.set(3, 0.75, 1);
    
    const textPos = wall.pos.clone();
    textPos.y += 3;
    textSprite.position.copy(textPos);
    textSprite.onBeforeRender = (r, s, c) => textSprite.quaternion.copy(c.quaternion);
    this.scene.add(textSprite);
    
    door.userData.isLevelDoor = true;
    door.userData.wallPos = wall.pos;
    this.scene.add(door);
    return door;
  }

  /**
   * Generate a new level
   */
  generateNewLevel() {
    this.currentLevel++;
    
    // Remove all colliders except the floor
    this.colliders.forEach(collider => {
      if (!collider.userData.isFloor) {
        this.scene.remove(collider);
      }
    });
    this.colliders = this.colliders.filter(c => c.userData.isFloor);
    
    // Create new outer boundary walls
    const wallPositions = [
      { x: 0, z: -ROOM, w: ROOM * 2, h: WALL_H, d: 1, rot: 0 },
      { x: 0, z: ROOM, w: ROOM * 2, h: WALL_H, d: 1, rot: 0 },
      { x: -ROOM, z: 0, w: 1, h: WALL_H, d: ROOM * 2, rot: Math.PI/2 },
      { x: ROOM, z: 0, w: 1, h: WALL_H, d: ROOM * 2, rot: -Math.PI/2 }
    ];
    
    wallPositions.forEach(pos => {
      this.createWall(pos.x, pos.z, pos.w, pos.h, pos.d, pos.rot);
    });
    
    // Generate random maze walls
    const numWalls = 6 + Math.floor(this.currentLevel / 2);
    for (let i = 0; i < numWalls; i++) {
      const x = (Math.random() - 0.5) * ROOM * 1.5;
      const z = (Math.random() - 0.5) * ROOM * 1.5;
      if (Math.abs(x) > 2 || Math.abs(z) > 2) {
        this.createWall(x, z, 4, WALL_H, 1, Math.random() * Math.PI);
      }
    }
    
    playSound('start');
  }

  /**
   * Get number of enemies for current level
   * @returns {number} Number of enemies
   */
  getEnemyCount() {
    return 13 + (this.currentLevel - 1) * ENEMIES_PER_LEVEL;
  }

  /**
   * Get enemy speed for current level
   * @returns {number} Enemy speed
   */
  getEnemySpeed() {
    return 4 + (this.currentLevel - 1) * 0.5;
  }

  /**
   * Get current level number
   * @returns {number} Current level
   */
  getCurrentLevel() {
    return this.currentLevel;
  }

  // Add this new method to update sun position
  updateSun(deltaTime) {
    if (!this.sun || !this.sunLight) return;
    
    this.time += deltaTime * 0.1; // Control sun movement speed
    
    // Calculate sun position in a circular path
    const radius = 40;
    const height = 20;
    const x = Math.cos(this.time) * radius;
    const z = Math.sin(this.time) * radius;
    const y = Math.abs(Math.sin(this.time)) * height + 10; // Keep sun above horizon
    
    this.sun.position.set(x, y, z);
    this.sunLight.position.copy(this.sun.position);
    
    // Update light color based on height
    const intensity = Math.abs(Math.sin(this.time));
    const sunColor = new THREE.Color(1, 1, 0.8 + 0.2 * intensity);
    this.sunLight.color.copy(sunColor);
    this.sunLight.intensity = 1 + intensity * 0.5;
  }
} 