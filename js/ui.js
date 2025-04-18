import { updateBestStats } from './utils.js';

/**
 * UI - Game Logo Display
 * Shows the KPM logo at game start
 * @param {THREE.Scene} scene - The game scene
 * @param {THREE.Camera} camera - The game camera
 */
export function showLogo(scene, camera) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = 'bold 64px monospace';
  ctx.fillStyle = '#0f0';
  ctx.textAlign = 'center';
  ctx.fillText('KPM', canvas.width / 2, 80);

  // Create floating logo sprite
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(8, 2, 1);
  sprite.name = "KPM_LOGO";

  // Position logo in front of player
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const logoPos = camera.position.clone().add(dir.multiplyScalar(10));
  logoPos.y += 2;
  sprite.position.copy(logoPos);

  // Make logo face camera
  sprite.onBeforeRender = (r, s, c) => sprite.quaternion.copy(c.quaternion);
  scene.add(sprite);

  // Fade out effect
  let opacity = 1;
  function fade() {
    opacity -= 0.02;
    material.opacity = opacity;
    if (opacity > 0) requestAnimationFrame(fade);
    else scene.remove(sprite);
  }
  setTimeout(() => requestAnimationFrame(fade), 2500);
}

/**
 * Boss Health Bar Creation
 * Creates a visual health bar for the boss
 * @returns {Object} Health bar object containing sprite, canvas, and texture
 */
export function createBossHealthBar() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(4, 0.5, 1);
  
  return { sprite, canvas, texture };
}

/**
 * Boss Health Bar Update
 * Updates the visual representation of boss health
 * @param {Object} bossHealthBar - The health bar object
 * @param {number} bossHealth - Current boss health
 * @param {number} maxHealth - Maximum boss health
 */
export function updateBossHealthBar(bossHealthBar, bossHealth, maxHealth) {
  if (!bossHealthBar) return;
  
  const ctx = bossHealthBar.canvas.getContext('2d');
  ctx.clearRect(0, 0, bossHealthBar.canvas.width, bossHealthBar.canvas.height);
  
  // Draw background
  ctx.fillStyle = '#333333';
  ctx.fillRect(0, 0, bossHealthBar.canvas.width, bossHealthBar.canvas.height);
  
  // Draw health bar with color based on remaining health
  const healthPercent = bossHealth / maxHealth;
  const barWidth = bossHealthBar.canvas.width * healthPercent;
  ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
  ctx.fillRect(0, 0, barWidth, bossHealthBar.canvas.height);
  
  bossHealthBar.texture.needsUpdate = true;
}

/**
 * Show Victory Screen
 * Displays the victory screen with game statistics
 * @param {Object} stats - Game statistics
 * @param {Object} bossStats - Boss fight statistics
 * @returns {HTMLElement} The created statistics box element
 */
export function showVictoryScreen(stats, bossStats) {
  const best = updateBestStats(stats);
  
  // Create statistics box
  const box = document.createElement("div");
  box.style.position = "fixed";
  box.style.bottom = "20px";
  box.style.left = "50%";
  box.style.transform = "translateX(-50%)";
  box.style.color = "white";
  box.style.background = "rgba(0,0,0,0.7)";
  box.style.padding = "12px 20px";
  box.style.font = "16px monospace";
  box.style.border = "1px solid #888";
  box.style.borderRadius = "10px";
  box.style.zIndex = 9999;
  
  box.innerHTML = `
    <div style="text-align: center; color: #ff4444; font-size: 20px; margin-bottom: 10px;">🏆 Victory! 🏆</div>
    <div>🕓 Total Time: ${stats.time.toFixed(2)} sec (Best: ${best.time.toFixed(2)})</div>
    <div>🎯 Accuracy: ${stats.accuracy.toFixed(1)}% (Best: ${best.accuracy.toFixed(1)}%)</div>
    <div>💥 Enemies Killed: ${stats.kills} (Best: ${best.kills})</div>
    <div>🔥 Kill Rate: ${stats.kpm.toFixed(2)}/min (Best: ${best.kpm.toFixed(2)})</div>
    <div>📏 Longest Kill: ${stats.longestKill.toFixed(2)}m (Best: ${best.longestKill.toFixed(2)})</div>
    <div style="border-top: 1px solid #666; margin: 10px 0;"></div>
    <div style="color: #ff4444; font-weight: bold;">Boss Fight Stats:</div>
    <div>⚔️ Boss Fight Time: ${bossStats.time.toFixed(2)} sec</div>
    <div>🎯 Boss Fight Accuracy: ${bossStats.accuracy.toFixed(1)}%</div>
    <div>💢 Damage Per Second: ${bossStats.dps.toFixed(1)}</div>
    <div>🎯 Total Hits: ${bossStats.hits}</div>
    <div>⚡ Total Damage: ${bossStats.damage}</div>
    <div style="margin-top: 10px; color: #4CAF50;">Shoot the green door to advance to the next level!</div>
  `;
  
  document.body.appendChild(box);
  return box;
} 