import { ROOM, WALL_H, ENEMY_COUNT } from './constants.js';
import { disposeObjects } from './textures.js';

export class LevelManager {
  constructor(scene) {
    this.scene = scene;
    this.walls = [];
    this.decor = [];
    this.colliders = [];
    this.time = 0;
    // Fixed lighting replaces a moving 2048px shadow pass.
    this.sunLight = new THREE.DirectionalLight(0xc2eaff, 1.1);
    this.sunLight.position.set(12, 18, 8);
    this.skyLight = new THREE.HemisphereLight(0x8edfff, 0x202b39, 0.85);
    this.sun = new THREE.Mesh(new THREE.IcosahedronGeometry(2, 0), new THREE.MeshBasicMaterial({ color: 0x8cdde6 }));
    this.sun.position.set(12, 18, -35);
    this.scene.add(this.sunLight, this.skyLight, this.sun);
    this.generateLevel();
  }
  generateLevel() {
    this.clearArena();
    this.time = 0;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM * 2, ROOM * 2), new THREE.MeshLambertMaterial({ color: 0x172635 }));
    floor.rotation.x = -Math.PI / 2;
    floor.userData.isFloor = true;
    this.scene.add(floor);
    this.walls.push(floor);
    const geometry = new THREE.BoxGeometry(ROOM * 2, WALL_H, 1);
    const material = new THREE.MeshLambertMaterial({ color: 0x263b50 });
    const sides = [[0, -ROOM, 0], [0, ROOM, 0], [-ROOM, 0, Math.PI / 2], [ROOM, 0, Math.PI / 2]];
    for (const [x,z,rotation] of sides) {
      const wall = new THREE.Mesh(geometry, material);
      wall.position.set(x, WALL_H / 2, z);
      wall.rotation.y = rotation;
      this.scene.add(wall);
      this.walls.push(wall);
    }
    this.door = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 0.5), new THREE.MeshLambertMaterial({color:0x31586b,emissive:0x082c36}));
    this.door.position.set(0,1.5,-ROOM+0.5);
    this.door.userData.isDoor = true;
    this.scene.add(this.door);
    this.walls.push(this.door);
    const grid = new THREE.GridHelper(ROOM*2,20,0x448794,0x294655);
    grid.position.y = 0.012;
    this.decor.push(grid);
    const ringPoints = Array.from({length:48},(_,i)=>new THREE.Vector3(Math.cos(i*Math.PI/24)*5,0.025,Math.sin(i*Math.PI/24)*5));
    this.decor.push(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ringPoints),new THREE.LineBasicMaterial({color:0x72d4d2})));
    // Two instanced draws for forty wall ribs and guide strips.
    const ribs = [], strips = [];
    for (const [x,z,rotation] of sides) {
      for (const offset of [-16,-8,8,16]) {
        ribs.push({x:x+Math.cos(rotation)*offset,y:3,z:z-Math.sin(rotation)*offset,sx:0.55,sy:6,sz:1.3,rotation});
        strips.push({x:x+Math.cos(rotation)*offset,y:4.4,z:z-Math.sin(rotation)*offset,sx:0.12,sy:1.8,sz:1.34,rotation});
      }
      strips.push({x,y:0.16,z,sx:39,sy:0.08,sz:1.35,rotation});
      ribs.push({x,y:5.8,z,sx:40,sy:0.4,sz:1.4,rotation});
    }
    this.decor.push(this.boxBatch(ribs,new THREE.MeshLambertMaterial({color:0x101d2c})));
    this.decor.push(this.boxBatch(strips,new THREE.MeshBasicMaterial({color:0x48c9d0})));
    this.decor.forEach(object=>this.scene.add(object));
    this.colliders = [...this.walls];
    this.scene.updateMatrixWorld(true);
    this.colliders.forEach(mesh=>{if(!mesh.userData.isFloor)mesh.userData.bounds=new THREE.Box3().setFromObject(mesh);});
  }
  boxBatch(boxes, material) {
    const batch = new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material,boxes.length);
    batch.frustumCulled=false; // r132 has no per-instance bounds; the entire arena is small.
    const transform = new THREE.Object3D();
    boxes.forEach((box,index)=>{
      transform.position.set(box.x,box.y,box.z);
      transform.scale.set(box.sx,box.sy,box.sz);
      transform.rotation.y=box.rotation;
      transform.updateMatrix();
      batch.setMatrixAt(index,transform.matrix);
    });
    batch.instanceMatrix.needsUpdate=true;
    return batch;
  }
  getColliders() { return this.colliders; }
  getEnemyCount() { return ENEMY_COUNT; }
  unlockDoor() { this.door.material.color.setHex(0x00ff00); this.door.material.emissive.setHex(0x126e58); }
  updateSun(delta) { this.time += delta; }
  clearArena() {
    const objects=[...this.walls,...this.decor];
    objects.forEach(object=>this.scene.remove(object));
    disposeObjects(objects);
    this.walls=[]; this.decor=[]; this.colliders=[]; this.door=null;
  }
  dispose() {
    this.clearArena();
    this.scene.remove(this.sun,this.sunLight,this.skyLight);
    disposeObjects([this.sun]);
  }
}
