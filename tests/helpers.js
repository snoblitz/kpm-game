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
