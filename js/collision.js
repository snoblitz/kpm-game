import { RADIUS } from './constants.js';

/**
 * Collision Detection
 * Checks if a position is blocked by walls
 * @param {number} x - X coordinate
 * @param {number} z - Z coordinate
 * @param {Array} colliders - Array of collidable objects
 * @returns {boolean} True if position is blocked
 */
export function blocked(x, z, colliders) {
  const s = new THREE.Sphere(new THREE.Vector3(x, 2, z), RADIUS);
  return colliders.some(c => {
    if (!c.geometry || !c.geometry.boundingBox) return false;
    return c.geometry.boundingBox.clone().applyMatrix4(c.matrixWorld).intersectsSphere(s);
  });
}

/**
 * Enemy Collision Detection
 * Checks if an enemy's movement would result in a collision
 * @param {THREE.Vector3} position - Proposed new position
 * @param {Array} colliders - Array of collidable objects
 * @returns {boolean} True if collision would occur
 */
export function checkEnemyCollision(position, colliders) {
  const sph = new THREE.Sphere(position, 0.5);
  return colliders.some(c => {
    if (!c.geometry || !c.geometry.boundingBox) return false;
    return c.geometry.boundingBox.clone().applyMatrix4(c.matrixWorld).intersectsSphere(sph);
  });
}

/**
 * Boss Collision Detection
 * Checks if the boss's movement would result in a collision
 * @param {THREE.Vector3} position - Proposed new position
 * @param {Array} colliders - Array of collidable objects
 * @returns {boolean} True if collision would occur
 */
export function checkBossCollision(position, colliders) {
  const sph = new THREE.Sphere(position, 0.25);
  return colliders.some(c => {
    if (!c.geometry || !c.geometry.boundingBox) return false;
    return c.geometry.boundingBox.clone().applyMatrix4(c.matrixWorld).intersectsSphere(sph);
  });
}

/**
 * Ray Intersection Check
 * Checks if a ray intersects with any collidable objects
 * @param {THREE.Raycaster} raycaster - The raycaster to use
 * @param {Array} objects - Array of objects to check against
 * @param {number} maxDistance - Maximum distance to check
 * @returns {THREE.Intersection|null} Intersection data or null if no hit
 */
export function checkRayIntersection(raycaster, objects, maxDistance) {
  const intersects = raycaster.intersectObjects(objects, false);
  return intersects[0] && intersects[0].distance < maxDistance ? intersects[0] : null;
} 