import { ROOM } from './constants.js';
import {
  WALL_H,
  RADIUS,
  WALK,
  RUN,
  GRAV,
  JUMP,
  BASE_BOSS_HEALTH,
  MIN_BOSS_HEALTH,
  BOSS_SPEED,
  MAX_LEVELS,
  ENEMIES_PER_LEVEL
} from './constants.js';

export {
  ROOM,
  WALL_H,
  RADIUS,
  WALK,
  RUN,
  GRAV,
  JUMP,
  BASE_BOSS_HEALTH,
  MIN_BOSS_HEALTH,
  BOSS_SPEED,
  MAX_LEVELS,
  ENEMIES_PER_LEVEL
};

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