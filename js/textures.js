/**
 * Procedural Brick Texture Generator
 * Creates a repeatable brick pattern texture for walls
 * @returns {THREE.Texture} Generated brick texture
 */
export function makeBrickTexture() {
  const W = 128, H = 128;              // Texture dimensions
  const bw = 32, bh = 16;              // Brick dimensions
  const ctx = Object.assign(document.createElement('canvas'), {width: W, height: H}).getContext('2d');
  
  // Background color
  ctx.fillStyle = '#402a1f';
  ctx.fillRect(0, 0, W, H);
  
  // Generate brick pattern
  for(let r = 0; r < H/bh; r++) {
    const off = r % 2 ? bw/2 : 0;  // Offset alternate rows
    for(let c = -1; c < W/bw + 1; c++) {
      const x = c * bw + off;
      const y = r * bh;
      const shade = 110 + Math.random() * 30 | 0;  // Random brick shade
      ctx.fillStyle = `rgb(${shade},${60 + Math.random() * 20 | 0},40)`;
      ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2);
    }
  }
  
  // Create Three.js texture
  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  return tex;
}

/**
 * Visual Effects - Bullet Tracer
 * Creates a temporary line showing bullet path
 * @param {THREE.Scene} scene - The game scene
 * @param {THREE.Vector3} start - Starting position
 * @param {THREE.Vector3} end - Impact position
 */
export function spawnTracer(scene, start, end) {
  const mat = new THREE.LineBasicMaterial({
    color: 0xffffaa,
    transparent: true,
    opacity: 1
  });
  const geo = new THREE.BufferGeometry().setFromPoints([start.clone(), end.clone()]);
  const tracer = new THREE.Line(geo, mat);
  scene.add(tracer);
  
  // Fade out effect
  let t = 0;
  const fade = () => {
    t += 0.05;
    mat.opacity = 1 - t;
    if (t < 1) requestAnimationFrame(fade);
    else scene.remove(tracer);
  };
  fade();
}

/**
 * Visual Effects - Impact Spark
 * Creates a temporary spark effect at bullet impact point
 * @param {THREE.Scene} scene - The game scene
 * @param {THREE.Vector3} pos - Impact position
 */
export function spawnSpark(scene, pos) {
  const geo = new THREE.SphereGeometry(0.1, 6, 6);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffff44 });
  const spark = new THREE.Mesh(geo, mat);
  spark.position.copy(pos);
  scene.add(spark);
  
  // Shrink effect
  let scale = 1;
  const decay = () => {
    scale *= 0.85;
    spark.scale.setScalar(scale);
    if (scale > 0.05) requestAnimationFrame(decay);
    else scene.remove(spark);
  };
  decay();
} 