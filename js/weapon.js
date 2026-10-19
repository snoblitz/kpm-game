import { disposeObjects } from './textures.js';

export class Weapon {
  constructor(camera) {
    this.camera=camera;
    this.group=new THREE.Group();
    this.group.position.set(0.18,-0.2,-0.65);
    this.recoil=0;
    this.time=0;
    this.muzzle=new THREE.Vector3();
    const parts=[
      [0,-0.07,0.12,0.1,0.18,0.13,0x142437],
      [0,0,0,0.17,0.13,0.35,0x426077],
      [0,0,-0.21,0.08,0.07,0.18,0x91eced],
      [-0.088,0,0,0.015,0.055,0.23,0xf7bd73],
      [0,0.08,-0.02,0.025,0.03,0.08,0x09131d]
    ];
    this.body=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial(),parts.length);
    const transform=new THREE.Object3D();
    parts.forEach(([x,y,z,sx,sy,sz,color],i)=>{
      transform.position.set(x,y,z); transform.scale.set(sx,sy,sz); transform.updateMatrix();
      this.body.setMatrixAt(i,transform.matrix); this.body.setColorAt(i,new THREE.Color(color));
    });
    this.flash=new THREE.Mesh(new THREE.OctahedronGeometry(0.065,0),new THREE.MeshBasicMaterial({color:0xe1ffff}));
    this.flash.position.set(0,0,-0.34); this.flash.visible=false;
    this.group.add(this.body,this.flash); camera.add(this.group);
  }
  shoot() { this.recoil=0.12; this.flash.visible=true; }
  update(delta,moving=false) {
    this.time+=delta;
    this.recoil=Math.max(0,this.recoil-delta);
    this.group.position.x=this.camera.aspect<1 ? 0.09 : 0.18;
    this.group.position.z=-0.65+this.recoil*0.6;
    this.group.rotation.x=-this.recoil*0.3;
    this.flash.visible=this.recoil>0.075;
    this.group.position.y=-0.2+(moving?Math.sin(this.time*9)*0.006:0);
  }
  getMuzzle() { this.camera.updateMatrixWorld(true); return this.flash.getWorldPosition(this.muzzle); }
  reset() { this.recoil=0; this.flash.visible=false; }
  dispose() { this.camera.remove(this.group); disposeObjects([this.group]); }
}
