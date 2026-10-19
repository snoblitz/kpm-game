// Fixed pools eliminate per-shot geometry/material allocation and cap overdraw.
export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.pool = [];
    this.disposed = false;
    const sparkGeometry = new THREE.OctahedronGeometry(0.14, 0);
    for (let i=0;i<8;i++) {
      const lineGeometry=new THREE.BufferGeometry();
      lineGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));
      this.pool.push({mesh:new THREE.Line(lineGeometry,new THREE.LineBasicMaterial({color:0x9cfaff,transparent:true,depthWrite:false})),type:'tracer',active:false});
      this.pool.push({mesh:new THREE.Mesh(sparkGeometry,new THREE.MeshBasicMaterial({color:0xffe2a3,transparent:true,depthWrite:false})),type:'spark',active:false});
    }
  }
  acquire(type,duration) {
    if(this.disposed)return null;
    let item=this.pool.find(item=>item.type===type&&!item.active);
    if(!item) { item=this.items.find(item=>item.type===type); this.remove(this.items.indexOf(item)); }
    item.active=true; item.duration=item.remaining=duration;
    item.mesh.material.opacity=1;
    item.mesh.scale.setScalar(1);
    this.scene.add(item.mesh); this.items.push(item);
    return item;
  }
  tracer(start,end) {
    const item=this.acquire('tracer',0.09); if(!item)return;
    const positions=item.mesh.geometry.attributes.position;
    positions.setXYZ(0,start.x,start.y,start.z); positions.setXYZ(1,end.x,end.y,end.z);
    positions.needsUpdate=true;
    item.mesh.geometry.computeBoundingSphere();
  }
  spark(position) {
    const item=this.acquire('spark',0.22); if(!item)return;
    item.mesh.position.copy(position);
    item.mesh.rotation.set(Math.random()*Math.PI,Math.random()*Math.PI,0);
  }
  update(delta) {
    for(let i=this.items.length-1;i>=0;i--) {
      const item=this.items[i]; item.remaining-=delta;
      if(item.remaining<=0)this.remove(i);
      else {
        const fraction=item.remaining/item.duration;
        item.mesh.material.opacity=fraction;
        if(item.type==='spark')item.mesh.scale.setScalar(1+(1-fraction)*2);
      }
    }
  }
  remove(index) {
    const [item]=this.items.splice(index,1);
    if(!item)return;
    this.scene.remove(item.mesh); item.active=false;
  }
  clear() { while(this.items.length)this.remove(this.items.length-1); }
  dispose() {
    if(this.disposed)return;
    this.clear(); disposeObjects(this.pool.map(item=>item.mesh));
    this.disposed=true;
  }
}

export function disposeObjects(objects) {
  const geometries=new Set(),materials=new Set();
  objects.forEach(object=>object.traverse(child=>{
    if(child.isInstancedMesh)child.dispose();
    if(child.geometry)geometries.add(child.geometry);
    if(child.material)(Array.isArray(child.material)?child.material:[child.material]).forEach(material=>materials.add(material));
  }));
  geometries.forEach(geometry=>geometry.dispose());
  materials.forEach(material=>material.dispose());
}
