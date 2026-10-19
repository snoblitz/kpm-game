# KPM — Kill Per Minute

A small desktop and phone browser target-shooting game built with Three.js and vanilla
JavaScript. Clear 13 moving targets, defeat the boss, review your time and accuracy,
then retry to improve your personal best.

[Play KPM on ChatGPT Sites](https://kpm-kill-per-minute.niceguybadgamer.chatgpt.site)
(private; sign in with the owner's account).

## Controls

- Click **Start** to capture the mouse and begin the timer.
- **WASD / arrow keys** move; **mouse** looks; **left click** shoots.
- **Shift** runs; **Space** jumps.
- **Esc**, changing tabs, or leaving the window pauses the run.
- Click **Resume** to continue. **Retry** resets the room, timer and all run statistics.
- **Mute sound** is available in the start/pause/results panel.

On phones, touch controls are selected automatically. You can also choose
**Phone / touch** in the start or pause panel (useful on hybrid devices).

- Tap **Start** to begin and unlock audio; touch play does not request mouse capture.
- Drag the **left stick** to move; push it to the edge to run.
- **Swipe the right side** to look, then lift and reposition your thumb as needed.
- Tap **FIRE** once per shot. Hold **JUMP** to jump. These work alongside movement and looking.
- Tap **Pause**, then **Resume** to continue. **Retry** starts a fresh run after results.
- Portrait and landscape layouts are supported; landscape offers more aiming space.

Each gesture keeps its own pointer ID until release. Cancellation, loss of
capture, pausing, app switching and resizing clear held touch input.

Enemies are moving targets, not attackers: this is a speed/accuracy challenge.
Combos grow when successive target kills are less than two active seconds apart.
Accuracy counts arena and boss shots; boss accuracy is also shown separately.
Personal bests are stored locally when browser storage is available.

## Visuals and quality

The Signal Range arena uses dark blue structural panels, cyan floor/wall guides,
bright amber faceted targets, and a magenta boss core with an orbiting ring.
The weapon has lightweight recoil and a muzzle flash; successful hits show a
brief marker and confirmation. Targets are taller and easier to distinguish.

**Visual quality** is available in the start/pause panel:

- **Auto** caps render pixel ratio at 1.25 on touch devices and 1.5 on desktop.
  Sustained frame intervals above 22 ms lower the ratio in steps, down to 0.75.
- **Low** caps pixel ratio at 1.0; **High** caps it at 2.0. Manual modes do not adapt.
- **Show performance stats** displays frame intervals/FPS, actual renderer draw
  calls and triangles, geometry/texture counts, and current pixel ratio.

There are no dynamic shadows, postprocessing passes, downloaded textures, or
added lights. Wall details use instancing; effects reuse a fixed pool. These
reduce specific costs, but device FPS has not been measured. See
[PERFORMANCE.md](PERFORMANCE.md) for inventory comparisons and a phone benchmark checklist.

## Run locally

Serve the repository over HTTP, for example with Python 3:

```sh
python -m http.server 8000
```

Open http://localhost:8000/ in a browser with WebGL. Desktop uses keyboard/mouse;
phones use Pointer Events and the on-screen touch controls.
`index.html` is the canonical entry point. The old `KPM.html` URL redirects there.

Three.js 0.132.2 is included in `vendor/`, with its upstream license. The game
does not need a CDN or an npm install.

## Regression checks

With Node.js 20 or later:

```sh
npm test
```

Tests use the same vendored Three.js build as the game and exercise actual
movement, collision, raycasting, scoring, boss/results/retry transitions, pause
timing and resource disposal. Touch tests cover concurrent pointer ownership,
look/fire separation, dead zones, cancellation, pause cleanup and touch play
without pointer lock. They do not create a WebGL renderer or emulate a real phone.
Graphics tests bound scene geometry and active effects, check pooled resource
disposal across retries, and exercise adaptive resolution with simulated frame intervals.

Before releasing, also check in a browser:

1. Start, move and look in several directions; walls stop movement.
2. Shoot all 13 targets, defeat the boss, and check time/accuracy/results.
3. Retry twice; counters reset and the room remains consistent.
4. Press Esc and switch tabs while moving; time freezes and keys do not stay held.
5. Resize the window; the canvas, aiming and HUD remain aligned.
6. Check console errors and audio/mute behavior.
7. On a phone, move, look, fire and jump together; releasing one control must not stop the others.
8. Hold the stick and switch apps, rotate the phone, or pause; no input should remain stuck.
9. Check portrait/landscape safe areas, panel scrolling, mute, resume and retry.
10. Toggle performance stats and each quality setting. Measure on actual phones;
    scene inventory alone does not establish frame rate or thermal behavior.

Pull requests run the regression checks. The current private preview is deployed
to ChatGPT Sites. The existing main-branch Pages workflow is retained; updating
the feature branch does not deploy Pages.

## License

MIT License — feel free to use this code for your own projects.
Three.js retains its upstream MIT license in `vendor/LICENSE.three`.
