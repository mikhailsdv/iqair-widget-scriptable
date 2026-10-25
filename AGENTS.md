# AGENTS.md

IQAir air quality widget for [Scriptable](https://scriptable.app/) on iOS. API reference: https://docs.scriptable.app/

## Layout

- `src/iqair-aqi.js` is the widget, the only file to edit for widget changes.
- `iqair-aqi.scriptable` is generated from it (JSON with the script and icon). Never edit it by hand.
- `scripts/build.mjs` builds the `.scriptable` file.
- `scripts/screenshots/` renders the README images: `stubs.mjs` mocks the Scriptable APIs, `index.mjs` holds the scenarios (`PAGES`), `renderer.js` lays the widgets out in HTML.
- `docs/screenshots/` holds the generated images used by the README.

## After changing the widget

1. Run `npm run build` and commit `src/iqair-aqi.js` together with `iqair-aqi.scriptable`.
2. If the look changed, run `npm run screenshots` (needs Chrome, or set `CHROME_PATH`) and commit `docs/screenshots/`.
3. Update `README.md` when its content goes stale: features, parameters, constants, themes, languages, screenshots.
4. Update this file when the workflow, structure or rules here change.

## Scriptable runtime

The script runs in Scriptable's JavaScriptCore, not in Node or a browser:

- It's a single file using top-level await. No `import`, `require` or npm packages.
- Use `Request`, not `fetch`. Use `Timer.schedule`, not `setTimeout`.
- Check every API against the Scriptable docs before using it. There's no way to run the real thing here.
- Lock screen widgets are tinted by iOS. Draw them in white and use opacity for hierarchy.
- `RING_PAD` and other padding values were tuned on a real iPhone. Don't change them without checking on a device.

## Testing without an iPhone

Run the script with the mocks from `scripts/screenshots/stubs.mjs`. `npm run screenshots` does this for every scenario and fails if the script throws. Look at the generated PNGs to check the layout. The renderer approximates SwiftUI layout, so device checks are still needed for tight spacing.

## Strings

- Every user-facing string lives in `STRINGS`. Add new keys to all nine languages (en, ru, zh, ja, es, de, fr, pt, kk). Missing keys fall back to English.
- Keep phrases short. A small widget fits about two lines of 15–17 characters for the AQI level.

## Conventions

- Code comments are in Russian. README, AGENTS.md and commit messages are in English.
- Match the existing style: no semicolons, double quotes, 2-space indentation.
