import { WALK, RUN, GRAV, JUMP, RADIUS } from './game.js';

export class Player {
    constructor(camera, controls) {
        this.camera = camera;
        this.controls = controls;
        this.position = camera.position;
        this.velocity = new THREE.Vector3();
        this.onGround = false;
        this.yVel = 0;
    }

    update(delta, keys, colliders) {
        // Movement
        const speed = keys.shift ? RUN : WALK;
        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();
        
        this.camera.getWorldDirection(forward);
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
        
        forward.y = 0;
        forward.normalize();
        right.normalize();
        
        if (keys.w) this.velocity.add(forward.multiplyScalar(speed * delta));
        if (keys.s) this.velocity.sub(forward.multiplyScalar(speed * delta));
        if (keys.a) this.velocity.sub(right.multiplyScalar(speed * delta));
        if (keys.d) this.velocity.add(right.multiplyScalar(speed * delta));
        
        // Gravity and jumping
        if (this.onGround && keys.space) {
            this.yVel = JUMP;
            this.onGround = false;
        }
        
        if (!this.onGround) {
            this.yVel += GRAV * delta;
        }
        
        // Apply movement
        const oldY = this.position.y;
        this.position.add(this.velocity);
        this.position.y = oldY + this.yVel * delta;
        
        // Collision detection
        this.handleCollisions(colliders);
        
        // Reset velocity
        this.velocity.multiplyScalar(0);
    }

    handleCollisions(colliders) {
        // Implement collision detection with walls and other objects
        // ... (implement collision logic)
    }
} 