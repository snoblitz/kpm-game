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
- **Drag the right side** to aim, then lift and reposition your thumb as needed.
- **Tap the right side** for one shot on release. Rapid taps fire individually, with no debounce or added cooldown.
- **Flick straight up quickly and release** on the right side to jump. Start an upward aim slowly, or hold briefly before dragging, to distinguish it from jumping.
- Tap **Pause**, then **Resume** to continue. **Retry** starts a fresh run after results.
- Portrait and landscape layouts are supported; landscape offers more aiming space.

Each gesture keeps its own pointer ID until release. Cancellation, loss of
capture, pausing, app switching and resizing clear held touch input.
The right side tracks one thumb at a time alongside the independent left stick.
Aiming drags cannot become jumps later. Jump requests last one physics update and
still require the player to be on the ground. See [TOUCH-GESTURES.md](TOUCH-GESTURES.md)
for gesture thresholds, ambiguity and device verification limits.

### More screen space on iPhone

Open the game in **Safari**, then **Share → Add to Home Screen**. Enable
**Open as Web App** if that option appears, tap **Add**, and launch **KPM from the
Home Screen**. Sign in again if asked. This is the supported route to playing
without Safari's address and tab bars; ordinary browser tabs may keep their UI.

The start/pause panel also offers **Enter fullscreen** only when the browser
exposes a usable fullscreen API. Fullscreen is optional, requires a button tap,
and can be declined by the browser. It is not assumed to work on every iPhone.

Rapid-tap/gesture prevention applies to the play surface. The menu remains a
separate scrollable, zoomable surface; there is no global `user-scalable=no` or
`maximum-scale` restriction. The canvas and HUD follow the visual viewport as
browser chrome changes, while pinch-zoomed menus retain their magnification.
See [IPHONE.md](IPHONE.md) for verification limits and primary documentation.

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
- **Show performance stats** displays compact FPS, frame time and resolution at
  the upper-right edge on phones. Desktop shows the additional draw, triangle,
  geometry and texture counters; the full readout is also in the output's title.

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
7. On a phone, hold the left stick while aiming, tapping rapidly to fire, and flicking up to jump; right-thumb actions must not stop movement.
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
