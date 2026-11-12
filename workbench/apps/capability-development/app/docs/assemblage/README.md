# Pictures of the assemblage

Captured from the production build in headless Chromium at device scale 2, by
`/tmp`-side scripting of the same server `tests/browser/assemblage.mjs` uses. The machine has no
GPU: WebGL 2 is ANGLE over SwiftShader.

| File | What it shows |
| --- | --- |
| `webgl2-render.png` | The day-one composition on the WebGL 2 backend, with shadow maps |
| `static-drawing.png` | The same composition as SVG — the first paint, and the fallback |
| `selected-piece.png` | The foundation selected (accent outline) with a linked-loop marker on it |
| `marker-record.png` | The record a marker leads to, shown in the page rather than the canvas |
| `screen-top.png` | The whole screen: viewport, camera controls, tray |
| `narrow-screen.png` | 390 px wide; measured horizontal overflow 0 px |
| `palette-*.png` | The other three palettes |

The WebGPU backend is not pictured because no machine available had a WebGPU adapter. See
[../../ASSEMBLAGE-NOTES.md](../../ASSEMBLAGE-NOTES.md) §8.
