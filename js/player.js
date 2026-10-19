import { WALK, RUN, GRAV, JUMP, RADIUS } from './constants.js';
import { blocked } from './collision.js';

export class Player {
  constructor(camera, controls) {
    this.camera = camera;
    this.controls = controls;
    this.position = camera.position;
    this.velocity = new THREE.Vector3();
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.movement = new THREE.Vector3();
    this.height = 2;
    this.radius = RADIUS;
    this.reset();
  }

  update(deltaTime, keys, colliders) {
    if (!this.controls.isLocked) return;
    if (keys.Space && this.onGround) {
      this.velocity.y = JUMP;
      this.onGround = false;
    }

    // Quaternion-derived forward remains correct after looking around or pitching.
    this.forward.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    this.forward.y = 0;
    this.forward.normalize();
    this.right.crossVectors(this.forward, this.camera.up).normalize();
    const forward = Number(!!(keys.KeyW || keys.ArrowUp)) - Number(!!(keys.KeyS || keys.ArrowDown));
    const sideways = Number(!!(keys.KeyD || keys.ArrowRight)) - Number(!!(keys.KeyA || keys.ArrowLeft));
    this.movement.copy(this.forward).multiplyScalar(forward).addScaledVector(this.right, sideways);
    if (this.movement.lengthSq() > 0) {
      const speed = keys.ShiftLeft || keys.ShiftRight ? RUN : WALK;
      this.movement.normalize().multiplyScalar(speed * deltaTime);
      const newX = this.position.x + this.movement.x;
      const newZ = this.position.z + this.movement.z;
      if (!blocked(newX, this.position.z, colliders)) this.position.x = newX;
      if (!blocked(this.position.x, newZ, colliders)) this.position.z = newZ;
    }

    this.velocity.y += GRAV * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    if (this.position.y <= this.height) {
      this.position.y = this.height;
      this.velocity.y = 0;
      this.onGround = true;
    }
  }

  getPosition() { return this.position; }
  getHeight() { return this.height; }
  reset() {
    this.position.set(0, this.height, 0);
    this.camera.rotation.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.onGround = true;
  }
}
