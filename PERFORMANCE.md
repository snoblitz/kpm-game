# Graphics budget and validation

The baseline is phone-controls commit `e713171f2fe32dc8897b56ac0834b8c7a10bc5d0`.
Both inventories were collected with the same vendored Three.js build in Node,
with the complete arena or boss scene. The new inventory includes the weapon.
These are CPU scene inventories, not measurements of WebGL draw calls, GPU time,
frame rate, memory in bytes, or sustained phone performance.

| Inventory / configured cost | Before | Graphics upgrade |
| --- | ---: | ---: |
| Arena triangles, all instances | 2,202 | 726 |
| Boss-scene triangles, all instances | 2,070 | 822 |
| Arena renderable objects | 20 | 25 |
| Boss-scene renderable objects | 9 | 14 |
| Arena unique visible geometries / materials | 5 / 5 | 10 / 10 |
| Lights | 2 | 2 |
| Shadow-casting lights | 1 | 0 |
| Shadow-map size | 2,048 × 2,048 | None |
| Default pixel-ratio ceiling, phone / desktop | 2 / 2 | 1.25 / 1.5 |
| Shot effects | New geometry/materials per shot | Fixed pool: 8 tracers + 8 impacts |
| Added textures or postprocessing | None | None |

The extra renderable objects add detail and a weapon. Instancing renders forty
wall details as two objects. Removing the moving shadow pass, reducing triangles,
and lowering render resolution target different rendering costs; their combined
FPS impact still requires a device test. Renderable-object counts are not actual
draw-call measurements because culling, visibility and rendering passes matter.

At device pixel ratio ≥ 2 and the same viewport, the default phone cap requests
39% as many render-buffer pixels as before; desktop requests 56%. This is a
resolution calculation, not a measured speedup. High quality keeps the old 2×
ceiling. Anti-aliasing is disabled; the intentional faceted style accepts sharper
edges in exchange for avoiding multisampling cost.

## Reproduce inventory and regressions

```sh
node tools/scene-inventory.mjs
npm test
```

The tests include 500 rapid shots: active effects remain capped at sixteen, with
the same geometry/material objects. Expired effects return to their pools;
resources are disposed once at teardown. Ten arena rebuilds preserve scene
counts and release old instancing buffers. Adaptive-resolution samples use a
fixed 90-entry buffer, exclude pauses and interruptions above 250 ms, and reduce
quality only after at least four active seconds of sustained slow intervals.

## Actual browser measurements still needed

Browser automation failed to start in the authoring environment. No rendered
mobile inspection, WebGL performance capture, hardware FPS comparison, or thermal
test was completed. The optional in-game readout uses `renderer.info` for actual
draws/triangles/geometries/textures and a rolling average of frame intervals;
frame intervals are not isolated GPU timing. No telemetry leaves the browser.

For a fair manual comparison, use the same phone, browser, viewport/orientation,
power state and scene. Test the baseline and current version for 60 seconds each
after warm-up, first at the same pixel ratio, then at each version's defaults.
Record FPS/frame intervals, draw calls, triangles and pixel ratio from the
readout (the baseline needs equivalent browser instrumentation). Check both the
13-target arena and boss, rapid firing, rotation, tab switching, pause/resume and
several retries. Verify texture/geometry counts settle after retries. Repeat
after several minutes to detect thermal throttling. Low quality is available
when an individual device needs a steadier frame rate.
