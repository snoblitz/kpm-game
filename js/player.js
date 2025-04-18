import * as THREE from 'three';
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

    update(dt, keys, colliders) {
        // Handle jumping
        if (keys[' '] && this.onGround) {
            this.velocity.y = JUMP;
            this.onGround = false;
        }

        // Apply gravity
        this.velocity.y += GRAV * dt;

        // Check ground collision
        if (this.position.y <= this.height) {
            this.position.y = this.height;
            this.velocity.y = Math.max(0, this.velocity.y);
            this.onGround = true;
        }

        // Get movement direction from keys
        const speed = keys.shift ? RUN : WALK;
        const forward = (keys.w ? 1 : 0) - (keys.s ? 1 : 0);
        const right = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);

        // Calculate movement vector based on camera direction
        if (forward !== 0 || right !== 0) {
            const angle = this.controls.getObject().rotation.y;
            const sin = Math.sin(angle);
            const cos = Math.cos(angle);
            
            const moveX = (forward * sin + right * cos) * speed * dt;
            const moveZ = (forward * cos - right * sin) * speed * dt;

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
        this.position.y += this.velocity.y * dt;
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