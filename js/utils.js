/**
 * Game Configuration Constants
 */
export const ROOM = 20;      // Room size (width/length)
export const WALL_H = 6;     // Wall height
export const RADIUS = 1;     // Player collision radius

// Movement settings
export const WALK = 10;      // Walking speed
export const RUN = 20;       // Running speed
export const GRAV = -25;     // Gravity force
export const JUMP = 12;      // Jump force

// Boss fight settings
export const BASE_BOSS_HEALTH = 100;  // Starting boss health
export const MIN_BOSS_HEALTH = 50;    // Minimum boss health regardless of clear speed
export const BOSS_SPEED = 8;          // Boss movement speed (2x regular enemy speed)

// Level settings
export const MAX_LEVELS = 5;          // Maximum number of levels
export const ENEMIES_PER_LEVEL = 3;   // Additional enemies per level

/**
 * Distance Measurement
 * Calculates the Euclidean distance between two points
 * @param {THREE.Vector3} point1 - First point
 * @param {THREE.Vector3} point2 - Second point
 * @returns {number} Distance between points
 */
export function measureDistance(point1, point2) {
  return Math.sqrt(
    Math.pow(point1.x - point2.x, 2) +
    Math.pow(point1.y - point2.y, 2) +
    Math.pow(point1.z - point2.z, 2)
  );
}

/**
 * Statistics Management
 * Updates and saves best game statistics
 * @param {Object} stats - Current game statistics
 * @returns {Object} Updated best statistics
 */
export function updateBestStats({ time, accuracy, kills, kpm, longestKill }) {
  const best = JSON.parse(localStorage.getItem('bestStats') || '{}');
  const newBest = {
    time: best.time ? Math.min(best.time, time) : time,
    accuracy: best.accuracy ? Math.max(best.accuracy, accuracy) : accuracy,
    kills: best.kills ? Math.max(best.kills, kills) : kills,
    kpm: best.kpm ? Math.max(best.kpm, kpm) : kpm,
    longestKill: best.longestKill ? Math.max(best.longestKill, longestKill) : longestKill
  };
  localStorage.setItem('bestStats', JSON.stringify(newBest));
  return newBest;
} 