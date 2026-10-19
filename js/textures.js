// Effects have a single owner and advance on the gameplay clock, including pause.
export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
  }
  tracer(start, end) {
    const geometry = new THREE.BufferGeometry().setFromPoints([start.clone(), end.clone()]);
    const material = new THREE.LineBasicMaterial({ color: 0xffffaa, transparent: true });
    this.add(new THREE.Line(geometry, material), 0.12, 'tracer');
  }
  spark(position) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffff44 })
    );
    mesh.position.copy(position);
    this.add(mesh, 0.2, 'spark');
  }
  add(mesh, duration, type) {
    this.scene.add(mesh);
    this.items.push({ mesh, duration, remaining: duration, type });
  }
  update(delta) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.remaining -= delta;
      if (item.remaining <= 0) {
        this.remove(i);
      } else if (item.type === 'tracer') {
        item.mesh.material.opacity = item.remaining / item.duration;
      } else {
        item.mesh.scale.setScalar(item.remaining / item.duration);
      }
    }
  }
  remove(index) {
    const { mesh } = this.items[index];
    this.scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
    this.items.splice(index, 1);
  }
  clear() { while (this.items.length) this.remove(this.items.length - 1); }
}

export function disposeObjects(objects) {
  // Shared geometry/materials are disposed exactly once.
  const geometries = new Set();
  const materials = new Set();
  objects.forEach(object => object.traverse(child => {
    if (child.geometry) geometries.add(child.geometry);
    if (child.material) {
      (Array.isArray(child.material) ? child.material : [child.material]).forEach(m => materials.add(m));
    }
  }));
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}
