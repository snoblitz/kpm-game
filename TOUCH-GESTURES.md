# Right-thumb controls

The left stick remains independent. The right side accepts one owned pointer at
a time: drag to aim, tap to fire on release, or flick straight up and release to
jump. There are no visible FIRE/JUMP buttons. Pause and menu controls remain
separate, and the existing surface-only zoom guard remains active during play.

## Recognition rules

All distances are CSS pixels, independent of render resolution. All durations
use Pointer Event timestamps. Coalesced movement samples are inspected when
available; the final release position is included even with sparse move events.

| Intent | Rule |
| --- | --- |
| Tap fire | Release within 180 ms; never travel more than 10 px from the start; total path at most 20 px. |
| Potential upward flick | Cross 10 px within 70 ms, moving upward at at least 0.75 px/ms. Horizontal deviation must be at most the larger of 5 px or 28% of upward displacement. |
| Jump | Release the potential flick within 180 ms, at least 64 px upward, with average upward speed at least 0.8 px/ms. |
| Aim | Slow starts, other directions, timeout, a downward reversal over 4 px, or a flick candidate slowing below 0.55 px/ms lock the gesture into aiming. |

Once aiming is established, it cannot turn into a jump even after acceleration
or reversal. Potential flick motion is briefly buffered rather than tilting the
camera during a jump. If rejected or held beyond 180 ms, the buffered movement
is applied as aiming, and later movement is immediate. Tiny tap jitter does not
move the camera. Long holds and rejected flicks do not shoot.

A fresh, fast upward camera stroke is inherently indistinguishable from an
intentional upward jump flick if it has the same path and timing. These thresholds
favor aiming, but cannot infer intent perfectly. For reliable upward aiming,
start slowly or hold the thumb briefly before dragging. Device feel still needs
physical iPhone feedback; the initial candidate can introduce up to 180 ms of
aiming latency for an ambiguous fast upward stroke.

## Cadence and lifecycle

Each qualifying tap calls the real shooting path immediately on pointerup.
There is no double-tap wait, debounce, one-shot-per-frame boolean or added fire
cooldown. Existing active-run, target collision and boss rules remain unchanged;
taps outside an active run are ignored. The existing eight-tracer pool can reuse
visual effects during very rapid fire but does not limit hit/shot registration.
Shots use the current crosshair direction when the tap is released.

Jump is a one-physics-update request, not a held input; airborne requests do not
create a delayed jump after landing. The right thumb must be released before
another right-side gesture; an additional finger cannot steal it. Pointer cancel,
lost capture, pause, rotation/resize, app switching and disposal discard unfinished
gestures and clear pending jump input. Capture is released before firing so a
final shot can safely open results. No gesture listeners are installed on menus.

## Landscape HUD and verification

Phone performance stats now occupy one compact line beneath Pause, 52 px below
its safe-area-aware top origin, at the right edge. It shows FPS, frame time and
resolution; it never intercepts pointer input. Landscape reserves a 236 px strip
at that edge so the main HUD does not overlap it. The old 174 px bottom offset,
which put the readout near the middle of a short viewport, is removed.

Regression coverage includes rapid repeated taps through real shot counters,
concurrent stick/right input, slow up/down aim, diagonal aim, intentional flicks,
late acceleration, coalesced moves, sparse events, cancellations, capture failure,
rotation, pause/menu exclusion and final-shot cleanup. Existing viewport and
zoom-guard checks remain included. Static layout arithmetic covers landscape
667x375, 844x390, 852x393, 932x430 and toolbar-reduced 844x300 viewports with
representative safe-area insets; it is not a browser render.

The permitted Obsidian browser initialization failed with `trusted Node process
exited unexpectedly; kernel reset`. Actual Safari rendering, native rapid-tap
zoom prevention, gesture feel and hardware FPS remain unverified. On a physical
iPhone, verify these sizes/orientations, safe areas, the performance checkbox,
rapid taps while moving, slow/fast up/down aiming, deliberate flicks, rotation,
Pause/Resume, menu zoom and Home Screen launch.
