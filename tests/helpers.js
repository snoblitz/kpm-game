import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Load the exact browser build, without a WebGL context or a package download.
const context = { exports: {}, module: {}, console };
vm.runInNewContext(readFileSync(new URL('../vendor/three.min.js', import.meta.url), 'utf8'), context);
globalThis.THREE = context.exports;

export const THREE = context.exports;
export function near(actual, expected, tolerance = 1e-9) {
  if (Math.abs(actual - expected) > tolerance) throw new Error(actual + ' is not close to ' + expected);
}
export function memoryStorage(initial = '{}') {
  let value = initial;
  return { getItem: () => value, setItem: (key, next) => { value = next; } };
}

// Inventory is a CPU-side upper bound, not renderer.info or a GPU benchmark.
export function sceneInventory(scene) {
  const geometries=new Set(),materials=new Set();
  let renderObjects=0,triangles=0,lights=0,shadowLights=0;
  scene.traverseVisible(object=>{
    if(object.isLight){lights++;if(object.castShadow)shadowLights++;}
    if(!object.geometry)return;
    renderObjects++;
    geometries.add(object.geometry);
    (Array.isArray(object.material)?object.material:[object.material]).forEach(material=>materials.add(material));
    if(object.isMesh)triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3*(object.isInstancedMesh?object.count:1);
  });
  return {renderObjects,triangles,lights,shadowLights,geometries:geometries.size,materials:materials.size};
}
