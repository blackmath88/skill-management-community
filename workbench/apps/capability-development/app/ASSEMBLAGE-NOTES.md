# Living Assemblage implementation

Implemented locally on `living-assemblage`, based on the existing app branch
`ccr-cda53478-1fik71` at `03c8601d117d37270c731a68a70e4cd96d7fb243`.
The mandate was read in full from `main` at `0953cbfaf2e7ce4d38b0685185d64919ba3a9ba8`.
The main branch contains the design documents; the preview branch contains the executable app.
No current Observatory snapshot was available; discovery used the repository directly.
No merge, push or deployment performed.

## Implemented

Home now contains six original faceted pieces, four palettes, three labelled fictional memory
examples, and a static SVG presentation that progressively enhances to Three.js. The original
Home recommendations, records, campaigns, settings and personal/demo namespaces remain intact.

Choose a piece, return it and its supported subtree to the repertoire, preview an available
contact, rotate by 180 degrees and place. Selection works through raycasting or HTML controls.
Camera controls provide a limited orbit and reset. Undo retains the last 20 successful composition
changes in the current mounted session; it does not undo evidence changes. A complete six-piece
composition is available immediately and a five-piece composition remains complete.

`src/assemblage/model.ts` owns semantic schema/catalogue v1, authored contact frames and pure
validation. Receiving frames and the child's foot compute world transforms; no renderer objects
are saved. One root, unique catalogue parts and instance IDs, valid connections, occupied slots,
cycles, bounded orientations, finite catalogue sizes and conservative AABB intersections are
checked before writes. A 0.015 world-unit overlap tolerance accommodates contact surfaces. This
small grammar deliberately rejects many possible arrangements; snapping is not proof of stability.
There is no gravity solver, free dragging, arbitrary scale or imported executable geometry.

Hidden pieces retain stable IDs in the repertoire. Markers retain associations while pieces are
hidden. The evidence panel resolves opaque IDs against the existing record set; the renderer is
passed appearance and marker IDs only, without evidence IDs, example IDs or record text.
A linked marker can be hidden or restyled without deleting evidence. Evidence deletion uses the
existing cascade and removes the marker unless the user previously chose to retain an unlinked
decoration. Unsupported associations cannot be restored by undo or imported as appearance.

Composition and persistent motion-off are optional fields in the existing profile. The existing
`AppSession.run` queue, IndexedDB snapshot validation and expected revisions handle every save.
A command also checks its expected composition to reject stale appearance edits. Old record
sets without this optional field remain valid. Full-record export/import includes it through the
existing boundary. Appearance-only export remaps piece and marker IDs and excludes evidence
associations and example IDs. Imports are bounded to 40 KB, validated before replacement, and
leave both current records and the entered source text intact on failure. Unknown schemas and
catalogues fail explicitly. No parallel localStorage store was added.

## Renderer and lifecycle

Pinned Three.js and types: 0.187.0. Existing React/React DOM 19.3.1, Vite 8.3.5 and TypeScript
6.0.3 are unchanged. Published Fiber 9.8.2 lists React `>=19 <19.4`; official v9 documentation
supports React 19 and async renderer creation. Fiber and Drei were not adopted: the small direct
adapter needs neither their reconciliation layer nor backend-specific helpers. No alpha packages.

Official references checked during implementation:
- https://threejs.org/docs/pages/WebGPURenderer.html
- https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide

Enhancement waits until the viewport is visible and the document is not hidden. It uses
`WebGPURenderer`, first preferring WebGPU, then explicitly retrying forced WebGL 2 after an
initialization/compilation failure. Initialization steps have an eight-second timeout. Shader
precompilation and a one-pixel WebGPU output check precede reporting readiness. Both failed
paths or failed chunk loading leave the static view and DOM controls in place. Runtime loss
shows an explicit static fallback; Retry graphics reconstructs from semantic state.

Geometry uses flat matte materials, hemisphere and directional lighting, actual scene shadow
maps and a ground receiver. No post-processing, ContactShadows, textures or CDN assets.
The shadow mode is PCFShadowMap, supported by the chosen renderer. Solids use authored chamfered
shoulders; bridge, opening and wedge compare sharper cut edges within the same material family.

Rendering is demand-driven, with a maximum 420 ms settling animation after explicit edits.
OS reduced motion and the persisted motion-off choice suppress it. Intersection/visibility
observers pause rendering, pixel ratio is capped at 1.75, and abort/disposal guards cover pending
async initialization and StrictMode cleanup. Renderer statistics on the canvas expose submissions,
initialization time and last CPU submission duration for tests; these are not GPU frame-time/FPS
benchmarks. Device/context loss, retry and repeated mounts are exercised by browser checks.

## Verification commands

From this app directory:

```sh
npm ci
npm run verify
npm run test:browser
npm run test:assemblage
# With `npm run preview -- --host 127.0.0.1` running:
npm run test:renderers
```

The browser runners resolve the environment's Playwright. Set `NODE_PATH` to its modules directory
and `CHROMIUM_PATH` to an installed Chromium if the matching Playwright browser is unavailable.
`test:renderers` uses explicit software Vulkan/WebGPU flags in its WebGPU case, and writes images
and measurements to `test-results/assemblage` (or `SCREENSHOT_DIR`). `ASSEMBLAGE_URL` can override
the production-preview URL. These flags are test configuration, not application requirements.

Baseline: 327 tests, typecheck, lint and production build passed before integration.
Final checks: typecheck/lint/build passed, 343 tests passed across 21 files, 79 existing browser
checks and 13 assemblage browser checks passed. The six-case renderer matrix passed, including
actual WebGPU device destruction and WebGL context loss. Detailed measurements and device
observations are recorded in the accompanying implementation report. Software test success does not establish learning efficacy or visual approval by users.

## Rights and dependencies

Geometry, SVG fallback, palette choices, small marker shapes, swatches and favicon were authored
for this task by Codex at the owner's instruction. Tumi Ishi and Bausack were composition/material
inspiration only. No models, product designs, textures, fonts, images or demo source were copied.
The original source is `src/assemblage/geometry.ts`; no external asset attribution or redistribution
obligation applies to those original shapes. The repository's existing lack of an overall licence
is unchanged; public repository visibility is not a new grant.

Three.js 0.187.0: MIT, Three.js authors. Its complete installed licence is preserved at
`public/THREE-LICENSE.txt`, included in production output. Matching DefinitelyTyped types are MIT.

**Dependency deviation:** `@types/three` brings development-only transitive packages:
Rapier compat 0.12.0 (Apache-2.0), tween.js 23.1.3 (MIT), stats.js types 0.17.4 (MIT), WebXR types
0.5.24 (MIT), fflate 0.8.3 (MIT), meshoptimizer 1.1.1 (MIT). These are upstream typing-package
requirements, not imported runtime dependencies. No Rapier/physics engine code is bundled or
used, but a literal ban on any Rapier package in the lockfile is not met. Avoiding that would
require maintaining a separately pruned typing distribution. No dependency version was silently
substituted and no unsafe lockfile edits were made.

## Limits

- Hardware WebGPU, physical mobile hardware, Safari/Firefox and a real screen reader were not
  available for verification. Narrow Chromium viewport checks are not a physical-device test.
- Software Vulkan was necessary for the successful WebGPU checks on this host. A different forced
  WebGPU launch configuration produced driver/pipeline errors; initialization alone is not proof.
- The lazy renderer is approximately 222 KB gzip; Vite warns about its roughly 819 KB raw chunk.
  This is a significant optional enhancement cost. Loopback ResourceTiming observations are in the
  implementation report; no battery or real-world network performance claim is made.
- Static SVG uses a painter's algorithm and approximate shading. GPU and static rendering are
  semantically equivalent, not pixel-identical. No hard real-time or physical stability guarantee.
- The import schema deliberately accepts only this six-piece catalogue and 12 markers. No general
  editor, plugin system, custom model import or multi-style platform was added.
- The inherited clean install reported 10 moderate advisories. No forced upgrades were performed.
- Browser storage remains unencrypted, browser-local and not a backup. No new server or network
  service exists. All test evidence is synthetic; no personal records were imported or sent.
