# KPM — Kill Per Minute

A small desktop browser target-shooting game built with Three.js and vanilla
JavaScript. Clear 13 moving targets, defeat the boss, review your time and accuracy,
then retry to improve your personal best.

[Play KPM](https://snoblitz.github.io/kpm-game/)

## Controls

- Click **Start** to capture the mouse and begin the timer.
- **WASD / arrow keys** move; **mouse** looks; **left click** shoots.
- **Shift** runs; **Space** jumps.
- **Esc**, changing tabs, or leaving the window pauses the run.
- Click **Resume** to continue. **Retry** resets the room, timer and all run statistics.
- **Mute sound** is available in the start/pause/results panel.

Enemies are moving targets, not attackers: this is a speed/accuracy challenge.
Combos grow when successive target kills are less than two active seconds apart.
Accuracy counts arena and boss shots; boss accuracy is also shown separately.
Personal bests are stored locally when browser storage is available.

## Run locally

Serve the repository over HTTP, for example with Python 3:

```sh
python -m http.server 8000
```

Open http://localhost:8000/ in a desktop browser with WebGL, keyboard and mouse.
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
timing and resource disposal. They do not create a WebGL renderer.

Before releasing, also check in a browser:

1. Start, move and look in several directions; walls stop movement.
2. Shoot all 13 targets, defeat the boss, and check time/accuracy/results.
3. Retry twice; counters reset and the room remains consistent.
4. Press Esc and switch tabs while moving; time freezes and keys do not stay held.
5. Resize the window; the canvas, aiming and HUD remain aligned.
6. Check console errors and audio/mute behavior.

Pull requests run the regression checks. Deployment remains on the existing
main-branch Pages workflow.

## License

MIT License — feel free to use this code for your own projects.
Three.js retains its upstream MIT license in `vendor/LICENSE.three`.
