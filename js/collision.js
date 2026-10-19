import { RADIUS } from './constants.js';

const sphere = new THREE.Sphere();
const bounds = new THREE.Box3();

function intersects(position, radius, colliders) {
  sphere.center.copy(position);
  sphere.radius = radius;
  return colliders.some(collider => {
    if (collider.userData.isFloor || !collider.geometry) return false;
    // Bounds are cached when the static arena is generated.
    if (collider.userData.bounds) return collider.userData.bounds.intersectsSphere(sphere);
    collider.updateMatrixWorld(true);
    collider.geometry.computeBoundingBox();
    return bounds.copy(collider.geometry.boundingBox)
      .applyMatrix4(collider.matrixWorld).intersectsSphere(sphere);
  });
}

const playerPosition = new THREE.Vector3();
export function blocked(x, z, colliders) {
  return intersects(playerPosition.set(x, 2, z), RADIUS, colliders);
}
export function checkEnemyCollision(position, colliders) {
  return intersects(position, 0.4, colliders);
}
export function checkBossCollision(position, colliders) {
  // A sphere enclosing the boss's square footprint avoids visible corner clipping.
  return intersects(position, Math.SQRT2, colliders);
}
export function checkRayIntersection(raycaster, objects, maxDistance = Infinity) {
  const hit = raycaster.intersectObjects(objects, false)[0];
  return hit && hit.distance <= maxDistance ? hit : null;
}
