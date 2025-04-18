// Import Three.js from CDN
const THREE = window.THREE;
import { WALK, RUN, GRAV, JUMP, RADIUS } from './constants.js';
import { blocked } from './collision.js';

export class Player {
    constructor(camera, controls) {
        this.camera = camera;
        this.controls = controls;
        this.position = camera.position;
        this.velocity = new THREE.Vector3();
        this.onGround = false;
        this.height = 2;
        this.radius = RADIUS;

        // Set initial position
        this.position.set(0, this.height, 0);
    }

    update(deltaTime, colliders) {
        // Handle jumping
        if (this.keys[' '] && this.onGround) {
            this.velocity.y = JUMP;
            this.onGround = false;
        }

        // Apply gravity
        this.velocity.y += GRAV * deltaTime;

        // Check ground collision
        if (this.position.y <= this.height) {
            this.position.y = this.height;
            this.velocity.y = Math.max(0, this.velocity.y);
            this.onGround = true;
        }

        // Calculate movement direction based on key inputs
        const moveDirection = new THREE.Vector3();
        if (this.keys.w) moveDirection.z += 1;  // Forward
        if (this.keys.s) moveDirection.z -= 1;  // Backward
        if (this.keys.a) moveDirection.x -= 1;  // Left
        if (this.keys.d) moveDirection.x += 1;  // Right
        
        // Normalize movement vector
        if (moveDirection.length() > 0) {
            moveDirection.normalize();
        }

        // Get movement direction from keys
        const speed = this.keys.shift ? RUN : WALK;

        // Calculate movement vector based on camera direction
        if (moveDirection.length() > 0) {
            const angle = this.controls.getObject().rotation.y;
            const sin = Math.sin(angle);
            const cos = Math.cos(angle);
            
            const moveX = (moveDirection.x * cos + moveDirection.z * sin) * speed * deltaTime;
            const moveZ = (-moveDirection.x * sin + moveDirection.z * cos) * speed * deltaTime;

            // Check collisions before moving
            const newX = this.position.x + moveX;
            const newZ = this.position.z + moveZ;

            // Try moving on each axis separately to allow sliding along walls
            if (!blocked(newX, this.position.z, colliders)) {
                this.position.x = newX;
            }
            if (!blocked(this.position.x, newZ, colliders)) {
                this.position.z = newZ;
            }
        }

        // Apply vertical movement
        this.position.y += this.velocity.y * deltaTime;
    }

    /**
     * Get player's current position
     * @returns {THREE.Vector3} Player position
     */
    getPosition() {
        return this.position;
    }

    /**
     * Get player's current height
     * @returns {number} Player height
     */
    getHeight() {
        return this.height;
    }

    /**
     * Reset player position and state
     */
    reset() {
        this.position.set(0, this.height, 0);
        this.velocity.set(0, 0, 0);
        this.onGround = false;
    }
} 