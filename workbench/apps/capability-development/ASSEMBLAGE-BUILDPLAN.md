# Skilling Me Softly: living assemblage build plan

Date: 12 November 2026. Status: selected visual direction; implementation mandate, not implemented functionality.

Read alongside [Concept](CONCEPT.md), [Companion](COMPANION.md), [Architecture](ARCHITECTURE.md), [Plan](PLAN.md), [Visual references](VISUAL-REFERENCES.md) and [Research decisions](RESEARCH-DECISIONS.md).

## 1. Decision and relationship to earlier documents

The selected direction is a tactile, faceted, personally composed non-human sculpture inspired by Tumi Ishi wooden rocks and the varied construction vocabulary of Bausack. It is not a human avatar, pet, dashboard mascot or physics game.

This document updates the earlier Zdog-first rendering proposal for this bounded visual prototype only: investigate Three.js WebGPURenderer as the preferred enhanced renderer, with tested WebGL 2 fallback and an accessible static presentation. WebGPU is an implementation preference, not a learning mechanism or performance claim. Existing privacy, evidence and day-one-worth constraints remain authoritative. Do not rewrite the domain or existing application plumbing.

A practice-area block means 'an area I am working on', not a certified unit of competence. More recorded skills must not automatically increase size, stability, worth or structural strength. Identity choices are available on day one. Development expands an optional repertoire and adds user-curated inspectable memories.

## 2. Art direction

Working name: Living Assemblage. Painted-timber warmth with matte-mineral restraint. Warm off-white ground; chalk, ink, muted terracotta, moss and one brighter accent. Near-orthographic elevated three-quarter camera, limited orbit and reset view. Strong silhouettes, asymmetry, negative space and convincing contacts. No mandatory face.

Start with six original curated pieces: broad faceted foundation, tall irregular solid, squat irregular solid, wedge, bridge and signature form with an opening. Four palettes; three small memory-marker designs. Use deterministic authored geometry or original GLB assets. Compare sharp facets against restrained bevels. No unreviewed external textures or photorealistic wood grain.

A five-piece composition must look complete, not under-levelled. Keep a small visible composition and a repertoire tray; removing a piece from display does not delete its history. Avoid literal skill pictograms on every surface. No automatic ornament accumulation, tower-height score, cracking, collapse, decay, streaks or needy messages.

Motion: brief coordinated orientation and settling after explicit interaction; stop afterward. No inferred mood, perpetual floating or particles. A long absence changes nothing.

## 3. Bounded stack and compatibility gate

Keep existing React, TypeScript, bundler, state and storage conventions. Inspect the real implementation, package files, lockfile, repository instructions and current work before installing anything. This workbench folder contains planning documents; do not assume it is the executable application root. Locate the existing app and avoid generating a replacement scaffold. If the implementation is only in another repository, report its location and the cross-repository prerequisite rather than inventing or duplicating it here.

Preferred enhanced stack: Three.js WebGPURenderer; React Three Fiber only on a verified compatible stable React/Fiber combination; selected Drei helpers only after backend checks. R3F v9 documents React 19 and asynchronous renderer initialisation. Do not silently upgrade React or adopt alpha packages to satisfy this preference. If incompatible, use a small direct-Three React adapter or document a bounded alternative.

First gate: render the same faceted piece, material, camera, selection and shadow treatment using WebGPU and forced WebGL 2. Verify initialisation failure, shader/material compatibility, demand rendering, resource disposal and StrictMode lifecycle. Do not assume WebGL-specific Drei helpers work with WebGPU. ContactShadows is not a complete inter-block shadow solution. Prefer the simplest compatible lighting and grounding treatment; no post-processing initially.

WebGPURenderer documents a WebGL 2 backend fallback; explicitly test it. Do not claim automatic fallback recovers every initialisation/runtime failure. If both GPU paths fail, retain the static representation and all DOM controls. No raw WebGPU or Rapier dependency in this slice. No GPU compute requirement has been established.

Pin verified compatible dependency versions in the existing lockfile and record actual resolved versions and licences. Do not copy version numbers from moving repository branches.

## 4. Interaction and placement

The UI is ordinary accessible React around one lazily loaded 3D viewport: sculpture, repertoire tray, piece inspector and adjacent evidence panel. Avoid turning the whole interface into a canvas.

Minimum workflow:
1. Choose a piece from the tray.
2. Preview compatible contact positions.
3. Rotate through bounded permitted orientations.
4. Confirm placement; settle briefly.
5. Select a marker to open its real supporting record.
6. Recompose, undo and reset view.

Use authored local contact frames and allowed placements, not unrestricted gravity. Each piece definition has catalogue ID, geometry reference, local contact frames, permitted receiving/resting frame combinations and bounded orientations. Contact-frame alignment computes transforms. Validate slot occupancy, roots, cycles, unsupported parts and obvious overlaps. Document conservative overlap limits; successful snapping does not establish physical stability. Begin with curated combinations. Free dragging is optional enhancement over the same placement commands, not the only interaction. No CAD gizmos in the normal interface.

## 5. Semantic contract and existing-data integration

Keep a versioned semantic composition independent of renderer objects: schemaVersion, catalogueVersion, stable instance IDs, part IDs, parent IDs, contact-frame IDs, bounded orientation, palette and opaque marker IDs. Store no Three.js object graph as identity. Keep transient camera/selection state separate from evidence meaning.

The renderer receives appearance/presentation state only, never journals, colleague names, feedback prose or emotion/competence inference. A marker selection emits an opaque ID; the application resolves it into an accessible evidence panel. Reuse the existing application commands, persistence queue and revision/conflict semantics. Do not add a parallel unsynchronised localStorage store.

Three curated marker fixtures: linked loop for assistance; turned route for an unsuccessful/partial attempt that informs a next move; paired inlay for conflicting feedback. These are recall aids, not assessment labels. Use synthetic fixtures in development; label them as examples. Wire one real trace-to-record path through existing data before declaring integration complete.

Deleting evidence must remove its evidence association; offer explicit retention as an unlinked decoration. Hiding/restyling a marker must not delete evidence. Never silently fabricate or substitute supporting records.

## 6. Resilience, privacy and rights

All actions have labelled HTML controls: select piece/contact position, rotate, place, remove, undo and reset camera. A DOM piece/marker list duplicates essential canvas selection. Focus remains usable when panels open or rendering fails. No colour-only or depth-only meaning. Touch targets and layout must work on narrow screens.

Respect prefers-reduced-motion plus a persistent motion-off option. Start from a static view; asynchronously enhance. With no WebGPU, no WebGL 2, adapter/device/context loss or loading error, preserve evidence and controls. Recover from semantic state where possible; otherwise show an explicit static fallback without losing unsaved work.

Render on demand; invalidate during bounded animations and camera interaction, then stop. Pause when hidden/offscreen; cap pixel density; dispose resources and listeners on unmount. Verify this for the actual selected backend, not just a generic example.

Save/reload and JSON export/import must use existing storage boundaries and validation conventions. Separate appearance-only export from evidence export. Validate before atomic replacement; reject unsupported future schemas without truncation. Preserve original imported data on failure. Local browser storage is neither encrypted backup nor guaranteed persistence. No outbound journal telemetry, CDN tracking or external texture requests.

Use original geometry or explicitly cleared assets. Record source, creator, licence, modifications and redistribution obligations in an asset-rights note. Public GitHub visibility is not permission. Verify licences for copied demo code independently from models, fonts and textures.

## 7. Implementation sequence and stop gates

A five-day spike is an initial planning budget, not a delivery promise.

1. Discovery and renderer gate: inspect repository/app, preserve current changes, record baseline checks; prove WebGPU plus forced WebGL 2 and static fallback with one piece. Report an incompatible app location or framework blocker instead of rebuilding plumbing.
2. Visual proof: six-piece original catalogue and one excellent static composition; establish camera, palette, edges, contacts and lighting. Capture a screenshot. Do not bury unfinished art under panels.
3. Assembly: semantic schema, deterministic placement, validation, selection, bounded rotations, undo and repertoire tray. Unit tests for alignment, invalid assemblies and deterministic round trips.
4. History and accessibility: three clearly labelled example markers; one actual trace-to-evidence route; keyboard/touch operation, reduced motion and bounded settling.
5. Persistence and hardening: existing save/reload and export/import integration; failed imports, unknown catalogues, unsupported future schemas, renderer failures, cleanup, narrow-screen and idle checks. Capture final screenshots and document deviations.

Ship a small working vertical slice before expanding the catalogue. No backend, AI, sync, authentication, XP, shop, physics sandbox, social features, multi-style world system or generic plugin architecture. Do not deploy or change unrelated files.

## 8. Acceptance and evidence

Required: visually coherent complete day-one sculpture; six curated pieces and four palettes; pointer and keyboard placement; no impossible/cyclic assembly accepted; undo; three distinguishable markers; one real evidence interaction; faithful save/reload and appearance export/import; marker deletion semantics; motion-off; static fallback; verified WebGPU and forced WebGL 2 paths or explicit documented blocker. Existing workflows and records must remain intact.

Run available lint, typecheck, unit and browser tests. Add tests for schema/placement/import invariants and a browser flow covering assemble, inspect, reload, export/import and fallback. Exercise repeated mount/unmount and failure recovery. Do not claim tests passed when tooling is unavailable.

Record production incremental chunk transfer, initialisation time, interaction frame-time observations, idle rendering submissions/activity, cleanup and a real mobile/browser check where available. State hardware/browser/build and limitations. No invented FPS, battery or bundle benchmarks. Visual approval and learning efficacy are separate from passing software tests.

Compare the same history without a character in later research: ownership, accurate interpretation, retrieval, next actions and burden. Never describe enjoyment alone as evidence of learning.

## 9. References and reuse boundaries

Checked 12 November 2026; documentation/repository review, not local runtime verification:
- https://tumiishi.com/ — material/composition reference, not reusable assets or proof of a relationship to Bausack.
- https://de.wikipedia.org/wiki/Bausack — construction vocabulary/background; not code or asset rights.
- https://github.com/pmndrs/react-three-fiber — React scene integration.
- https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide — React 19/v9 and async WebGPU initialisation; warns about feature compatibility.
- https://threejs.org/docs/pages/WebGPURenderer.html — backend fallback and forceWebGL.
- https://gpuweb.github.io/gpuweb/ — API specification, not an engine.
- https://github.com/pmndrs/drei — helpers; verify selected helpers on both backends.
- https://drei.docs.pmnd.rs/staging/contact-shadows — planar contact shadow limitations/cost.
- https://pmndrs.github.io/examples/examples/shoe-configurator — selectable dynamic product-object presentation.
- https://github.com/pmndrs/examples — locate current demo source and check licences before reuse.
- https://github.com/mediageni/LowPolyRockGenerator — deterministic faceted-shape exploration only; licence/assets not cleared here.
- https://github.com/pmndrs/react-three-rapier — future sandbox reference; not required.
- https://r3f.docs.pmnd.rs/advanced/scaling-performance — on-demand rendering.

## 10. Copy-paste Codex build prompt

```text
Implement the Living Assemblage visual prototype for Skilling Me Softly. Read workbench/apps/capability-development/ASSEMBLAGE-BUILDPLAN.md first, then the linked CONCEPT, COMPANION, ARCHITECTURE, PLAN and research/visual notes. This assemblage plan updates the earlier Zdog-first renderer proposal for this slice only; preserve privacy and evidence semantics.

Act as a senior interaction designer and browser-graphics engineer. Deliver a bounded working visual vertical slice, not another architecture essay. The direction is an original, tactile, faceted sculpture inspired by Tumi Ishi and Bausack: painted-timber warmth, matte-mineral restraint, asymmetric recognisable silhouette, negative space, convincing contact and brief settling motion. No face required. No generic dashboard with a token 3D ornament.

First inspect repository instructions, git status, actual app location, implementation, package files, lockfile, storage/versioning and existing tests. Preserve others' changes. This workbench directory may only contain documentation. Locate the real app before coding. If it exists only in another repository, report the concrete cross-repository blocker and do not generate a replacement application. Keep existing framework, bundler, state and persistence plumbing.

Prefer Three.js WebGPURenderer with tested WebGL 2 fallback and static DOM/SVG presentation. Use React Three Fiber only with a verified compatible stable React combination. R3F v9 requires React 19; do not silently upgrade React or install alpha packages. A small direct-Three adapter is acceptable if required. Check current official docs and resolved dependencies. Prove async initialisation, basic material/lighting, selection, on-demand rendering and forced WebGL 2 first. Test selected Drei helpers rather than assuming WebGPU compatibility. If blocked, document the exact failure and choose the smallest viable path without hiding the deviation. No raw WebGPU or physics engine.

Build six original curated pieces, four palettes, a complete day-one composition, repertoire tray, selection, authored contact-frame placement, bounded rotation, undo and reset view. Prefer click-to-place with keyboard parity over arbitrary 3D dragging. Reject invalid roots, occupied contacts, cycles, unsupported parts and obvious overlap. Do not claim snapping proves physical stability.

Keep semantic composition/versioning independent of renderer objects. Never pass raw journal text or feedback to the renderer. Add three labelled synthetic history-marker examples and wire one real marker-to-evidence interaction through the existing app. Skills represent practice areas, not competence units. No automatic size/strength/height growth, XP, earned identity parts, collapse, decay or absence punishment.

Integrate save/reload and appearance export/import through existing persistence and revision conventions. Preserve old records, handle unsupported versions and validate imports before atomic replacement. Separate unlinked cosmetic retention from evidence deletion. All identity options are available immediately.

Keep essential controls and evidence outside the canvas. Include reduced motion, persistent motion-off, touch/narrow-screen behaviour, static fallback, initialisation failure and context/device-loss recovery where applicable. Render only while needed; pause hidden/offscreen, cap resolution and dispose resources. No outbound private data or external tracking/assets. Record asset licences and actual dependency versions.

Work in the sequence and acceptance gates in the build plan. No backend, AI, auth, sync, physics sandbox, platform rewrite, deployment or unrelated changes. Run available checks and add focused placement/schema/import tests plus a browser integration flow. Capture screenshots if tooling supports it; do not claim visual verification otherwise.

Finish with changed files, actual stack/versions, completed acceptance criteria, commands and results, screenshots or capture limitations, actual backend/device checks, measured costs where available, known limitations and the next smallest step. Clearly separate implemented, tested and proposed behaviour.
```
