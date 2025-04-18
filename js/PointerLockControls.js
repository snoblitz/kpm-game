class PointerLockControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.isLocked = false;

        // Initial camera rotation
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');

        // Bind methods
        this.onMouseMove = this.onMouseMove.bind(this);
        this.lock = this.lock.bind(this);
        this.unlock = this.unlock.bind(this);

        // Setup event listeners
        this.domElement.addEventListener('click', this.lock);
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === this.domElement) {
                document.addEventListener('mousemove', this.onMouseMove);
                this.isLocked = true;
            } else {
                document.removeEventListener('mousemove', this.onMouseMove);
                this.isLocked = false;
            }
        });
    }

    onMouseMove(event) {
        if (!this.isLocked) return;

        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        this.euler.setFromQuaternion(this.camera.quaternion);
        this.euler.y -= movementX * 0.002;
        this.euler.x -= movementY * 0.002;
        this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));
        this.camera.quaternion.setFromEuler(this.euler);
    }

    lock() {
        this.domElement.requestPointerLock();
    }

    unlock() {
        document.exitPointerLock();
    }

    dispose() {
        this.domElement.removeEventListener('click', this.lock);
        document.removeEventListener('mousemove', this.onMouseMove);
    }

    // Movement methods
    moveForward(distance) {
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion);
        direction.y = 0; // Keep movement in XZ plane
        direction.normalize();
        this.camera.position.addScaledVector(direction, distance);
    }

    moveRight(distance) {
        const direction = new THREE.Vector3(1, 0, 0);
        direction.applyQuaternion(this.camera.quaternion);
        direction.y = 0; // Keep movement in XZ plane
        direction.normalize();
        this.camera.position.addScaledVector(direction, distance);
    }

    getDirection() {
        const direction = new THREE.Vector3(0, 0, -1);
        return direction.applyQuaternion(this.camera.quaternion);
    }
}

export { PointerLockControls }; 