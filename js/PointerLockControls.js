export class PointerLockControls {
  constructor(camera, domElement, { onChange = () => {}, onError = () => {} } = {}) {
    this.camera = camera;
    this.domElement = domElement;
    this.isLocked = false;
    this.onChange = onChange;
    this.onError = onError;
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onPointerLockChange = () => {
      this.isLocked = document.pointerLockElement === this.domElement;
      this.onChange(this.isLocked);
    };
    this.onPointerLockError = () => this.onError();
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('pointerlockerror', this.onPointerLockError);
  }

  onMouseMove(event) {
    if (!this.isLocked) return;
    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y -= (event.movementX || 0) * 0.002;
    this.euler.x -= (event.movementY || 0) * 0.002;
    // Avoid a zero horizontal forward vector at the exact poles.
    const limit = Math.PI / 2 - 0.001;
    this.euler.x = Math.max(-limit, Math.min(limit, this.euler.x));
    this.camera.quaternion.setFromEuler(this.euler);
  }
  lock() {
    try {
      const request = this.domElement.requestPointerLock();
      if (request && request.catch) request.catch(this.onError);
    } catch {
      this.onError();
    }
  }
  unlock() {
    if (document.pointerLockElement === this.domElement) document.exitPointerLock();
  }
  getObject() { return this.camera; }
  dispose() {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('pointerlockerror', this.onPointerLockError);
    this.unlock();
  }
}
