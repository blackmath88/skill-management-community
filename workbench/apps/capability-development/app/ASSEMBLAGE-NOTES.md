# The assemblage: what was tried, and what it cost

Date: 12 November 2026. Status: implemented. Companion to [ASSET-RIGHTS.md](ASSET-RIGHTS.md) and to
the build plan.

The build plan and the companion brief this implements live on this repository's `main` branch,
not on the branch the application is on, so they are linked by URL rather than by relative path:
[ASSEMBLAGE-BUILDPLAN.md](https://github.com/blackmath88/skill-management-community/blob/main/workbench/apps/capability-development/ASSEMBLAGE-BUILDPLAN.md) and [COMPANION.md](https://github.com/blackmath88/skill-management-community/blob/main/workbench/apps/capability-development/COMPANION.md).

This records the decisions that a reader would otherwise have to reverse-engineer from the code,
and the things that were checked rather than assumed. Where a number appears, it was measured on
the machine and browser named at the bottom.

## 1. Renderer: a direct Three adapter, not React Three Fiber

React Three Fiber 9.8.2 declares `react >=19 <19.4` and `three >=0.156`. This application is on
React 19.3.1 and three 0.187.0, so the combination is compatible and R3F was **not** ruled out on
version grounds — this is worth stating because the build plan warned about exactly that trap and
it would be easy to claim it as the reason.

It was ruled out on proportion. R3F plus Drei is two more dependencies in an application whose
entire runtime dependency list is React and React DOM, and the helpers that would pay for them are
the ones whose WebGPU behaviour the build plan explicitly says not to assume. What this viewport
needs — asynchronous initialisation, render-on-demand, one bounded animation, disposal on unmount,
and a forced WebGL 2 backend — is about 120 lines in `src/assemblage/renderer.ts`, and all of it is
exercised by `tests/browser/assemblage.mjs`.

If a later slice needs instancing, model loading or a transform gizmo, R3F becomes worth
reconsidering. It is not worth it for six meshes.

Everything is imported from `three/webgpu`, so one module graph serves both backends: the same code
constructs a WebGPU backend or, with `forceWebGL: true`, a WebGL 2 one.

## 2. Two things the renderer does that the documentation does not lead you to expect

Both were found by running the browser checks, not by reading.

**The fallback is always attempted, so "is WebGPU there" is the wrong question to ask first.**
WebGPURenderer falls back to a WebGL 2 backend whenever WebGPU cannot answer — and if the browser
has no WebGL 2 context either, that fallback throws from inside its own initialisation, as an
unhandled rejection that `await init()` cannot catch. A check that simulated such a browser (no
`navigator.gpu`, `getContext('webgl*')` returning null) found two uncaught errors in the console
while the fallback otherwise worked perfectly. Both backends are now pre-checked before anything
is constructed: WebGL 2 by probing a 1×1 context and releasing it, WebGPU by the truthiness of
`navigator.gpu` — not `'gpu' in navigator`, because a browser can expose the property with an
undefined value — and, where there is no WebGL 2 to fall into, by asking for an adapter.

**The documented WebGL 2 fallback is silent, and will let you lie about it.** With `navigator.gpu`
present but `requestAdapter()` returning null — which is the state of this container's Chromium,
and of plenty of real machines — `WebGPURenderer.init()` resolves successfully having built a
WebGL 2 backend, and logs a console warning nobody reads. A first version of this code reported
"WebGPU" to the interface in that state. The renderer now asks the renderer which backend it got
(`renderer.backend.isWebGPUBackend`) and reports that; and a request for WebGPU *specifically* is
failed rather than quietly downgraded, so the setting means what it says.

**`Renderer.render()` restarts an internal animation loop on every call.** `setAnimationLoop(null)`
clears the callback but does not stop the loop, so a renderer asked to draw exactly one frame still
schedules sixty a second for the life of the page. The browser check measured **180
`requestAnimationFrame` calls in three idle seconds**. `renderNow()` now stops that loop after each
frame, defensively, because the field is private. After the fix the same check measures **0 frames
in three idle seconds**, and 0 while the viewport is scrolled out of view.

## 3. Edges: sharp, restrained bevel, heavy bevel

All three were built and rendered side by side (squat solid, same outline, same camera):

| Treatment | Triangles | Reads as |
| --- | --- | --- |
| Sharp arris | 24 | Legible, but top and side meet in one hard line: untextured polygon |
| Chamfer at 7% of height | 48 | A worked, painted block — the rim band catches light at its own angle |
| Chamfer at 20% of height | 48 | A rounded pebble; the facet language is gone |

Shipped: the middle one. A bevel here is extra flat faces, never a smoothing pass, so the facets
stay facets.

## 4. The static drawing is a real renderer, not a placeholder

`src/assemblage/project.ts` projects the same authored geometry through the same camera with the
same two light directions, and shades with the same coefficients. Consequences worth knowing:

- The first paint on every visit is the real composition. There is no spinner and no empty box.
- A browser with no working GPU path shows the same sculpture, loses the orbit and the settle, and
  keeps every control. The canvas is layered beneath the SVG and only becomes visible once a frame
  has actually been drawn, so there is no flash.
- It sorts **pieces first, then faces within a piece**. A single global face sort painted the
  bridge through the wedge resting on it and the foundation's near rim over the block standing on
  it. Two levels is correct here only because placement validation refuses any composition whose
  pieces share space — the solids are disjoint, so they can be ordered as whole objects. It is not
  a general depth sort, and that is the honest reason the GPU path exists.
- Both paths call one `fitCamera`, so switching between them does not re-frame the sculpture.

## 5. Contact frames, and what snapping does not prove

A placement is an authored pairing of two named frames plus one of a bounded set of turns. There is
no gravity, no solver and no physics engine. `alignedTransform` puts the resting frame's origin on
the receiving frame's origin with the two normals opposed, and the yaw turns the piece about the
contact normal, which is why every permitted orientation keeps contact.

**Snapping proves the two frames meet. It proves nothing about whether the arrangement would stand
up.** Two checks exist and both are deliberately crude:

- Overlap is tested on axis-aligned boxes shrunk by `OVERLAP_TOLERANCE` (0.045 catalogue units) on
  every side. Shrinking is what stops a legitimate resting contact — whose boxes meet exactly —
  from reading as interpenetration; the price is that an interpenetration shallower than that is
  accepted, and that a piece placed inside the signature form's opening can be refused for
  overlapping a box the ring does not fill. Refusing a legal-looking placement costs one more
  click. Accepting a visibly broken one does not get fixed.
- "Unsupported" means the horizontal centre of a piece's extent falls outside the extent of the
  piece below it. It catches a block hanging off an edge with nothing under its bulk. It is not a
  centre-of-mass calculation and says nothing about mass or friction.

The first six-piece composition was caught by these checks: the column genuinely interpenetrated
both shelf pieces. The foundation's radii are what they are because of that, not by eye.

## 6. What the renderer is given

`src/assemblage/view.ts` is the boundary. The renderer receives geometry, transforms, palette
colours, and marker identifiers that are opaque to it. It receives no journal text, no situation,
no feedback, no attribution and no evidence identifier. Selecting a marker emits its own opaque id;
the page resolves that into a record and shows it in the DOM, outside the canvas. The Assemblage
screen prints the exact payload under "What the picture is given" so the claim can be read rather
than trusted.

## 7. Measurements

Chromium 142 (bundled with the container's Playwright), headless, on Linux x86-64 with **no GPU**:
WebGL 2 is served by ANGLE over SwiftShader, a software rasteriser. `navigator.gpu` exists on a
secure origin but exposes no adapter.

- Production build: `index` 523.5 kB (154.1 kB gzipped); `renderer` chunk — all of three.js —
  818.9 kB (222.0 kB gzipped), dynamically imported, so it is not on the first-paint path and a
  browser that stays on the static drawing never downloads it.
- Idle rendering: 0 animation frames in 3 s with the viewport visible, and 0 with it scrolled out
  of view. Before the fix in §2: 180 in 3 s.
- Shadow maps initialise on the WebGL 2 backend (`shadows=on`), including pieces casting onto each
  other, which a planar ground approximation does not do.
- Mount/unmount: three rounds of leaving and returning to the screen, with no uncaught errors.
- A browser with neither WebGPU nor WebGL: the renderer refuses, the static drawing carries the
  composition, pieces can still be selected, turned and orbited, and the console stays clean.

**Not measured, and not claimed:** frame time, battery, memory, and anything at all about a real
GPU. A software rasteriser's timings would say nothing useful about a phone. The WebGPU *backend*
has never been executed — see below.

## 8. Known limitations

- **The WebGPU backend path is unverified by execution.** No machine available here has a WebGPU
  adapter, so the code that selects it has only ever been seen to refuse. What *is* verified is
  that it refuses honestly, that WebGL 2 is reached, and that the static drawing survives both. To
  verify the backend itself: open the app in a browser with WebGPU, choose "WebGPU only", and the
  status line will name it.
- No real mobile device or touch hardware was available. Narrow-screen layout was checked by
  viewport size only.
- Undo is per visit and lives in React state. It is not written to storage, so a reload clears it.
- The composition is cosmetic and is stored inside `profile.appearance`. It is not a record and is
  not evidence of anything.
- Browser storage is not an encrypted backup, and an exported composition file, once copied, has
  its own life.
