# iPhone usability fixes

## What changed

- The full play surface, including spaces between controls, declares `touch-action: none`.
- A play-surface-only, non-passive Touch Events fallback cancels touch endings and browser gestures during play. Pointer Events remain the only movement/look/fire/jump input path; the fallback never synthesizes clicks or shots.
- Native Pause activation is preserved. A final shot's touch ending is still suppressed if that shot opens results. Menu events are outside the guarded surface, and menu pinch zoom/scrolling remain available.
- The game viewport follows VisualViewport size/offset changes, orientation and fullscreen transitions. Resize bursts are coalesced into one animation-frame callback; offset-only updates do not resize the renderer. Pinched menus use layout dimensions so their text is not counter-scaled.
- A manifest requests standalone display; Apple web-app metadata supplies the title and safe-area-compatible status-bar behavior. The manifest uses credentialed loading because this Site is private. There is no service worker or offline cache.
- An optional fullscreen button checks the actual standard or WebKit API and capability flags. It requests fullscreen directly from a user click, treats navigation-UI hiding as a hint, and reports rejection or lack of confirmation. Exiting fullscreen pauses an active game. Desktop mouse capture remains a separate action.

## User steps

1. Reload the latest private game URL in Safari.
2. Use **Share → Add to Home Screen** (Share may be inside Safari's page menu).
3. Enable **Open as Web App** if shown, then tap **Add**.
4. Launch KPM from its Home Screen icon; sign in again if asked.

Ordinary browser or embedded-app tabs may retain toolbars. A page cannot promise
to remove them. The app offers fullscreen only when supported at runtime and
shows Home Screen guidance otherwise. Installation does not change Site sharing.

## Verification

Automated tests cover repeated touch endings, simultaneous touch ownership,
native Pause taps, gesture prevention scoped away from menus, final-shot cleanup,
visual viewport/chrome changes, resize coalescing, menu magnification, disposal,
unsupported/disabled/rejected/unconfirmed fullscreen, duplicate request taps,
standalone detection and legacy WebKit fullscreen. Existing desktop, touch,
gameplay and graphics-budget tests remain included.

The permitted browser automation check was attempted again on Obsidian and failed
before opening a browser: `trusted Node process exited unexpectedly; kernel reset`.
No physical iPhone verification was available. The change is tested at event and
layout-state level, not confirmed against Safari's native zoom recognizer or an
installed Home Screen session. Check rapid right-side taps while moving,
portrait/landscape rotation, Safari toolbar changes, menu zoom, Pause, Resume and
the Home Screen launch on a real iPhone.

The later right-thumb gesture update replaces the visible fire/jump buttons.
See [TOUCH-GESTURES.md](TOUCH-GESTURES.md) for the classifier and updated phone QA.

## Primary documentation consulted

- [WebKit: More Responsive Tapping on iOS](https://webkit.org/blog/5610/more-responsive-tapping-on-ios/) explains manipulation, touch endings, and preserving scalable pages.
- [Apple: Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html) documents standalone metadata, the absence of Safari URL/button bars, and `navigator.standalone` (archived reference).
- [Apple: Turn a website into an app](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/27/ios/27) documents current Share/Add to Home Screen/Open as Web App steps.
- [WebKit: Safari 16.4](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/#fullscreen-api) announced unprefixed fullscreen for macOS and iPadOS; this is not taken as a guarantee for iPhone.
- [WebKit: Safari 27](https://webkit.org/blog/18325/webkit-features-for-safari-27-0/) was checked for newer platform changes. The implementation still gates on actual browser capabilities instead of assuming support from an OS version.
- [MDN: VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport) describes visible size, offsets, scale, and resize/scroll events.
- [MDN: touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action) documents gesture behavior and the accessibility implications of disabling zoom.
