# Asset rights for the assemblage

Date: 12 November 2026.

## Summary

**No third-party asset of any kind was used.** There is no model file, no texture, no font, no
image and no copied demo code in the assemblage. Everything drawn on the Assemblage screen is
generated at run time from numbers authored in this repository.

That is a deliberate choice rather than a happy accident: the build plan requires source, creator,
licence, modifications and redistribution obligations to be recorded for anything reused, and the
cheapest way to be able to state that honestly is to have nothing to state.

## What the shapes are

| Thing | Where it comes from |
| --- | --- |
| The six piece shapes | Outlines authored as explicit radii and angle offsets in `src/assemblage/catalogue.ts`, extruded by `src/assemblage/geometry.ts` |
| The three marker inlays | Authored in `src/assemblage/marker-geometry.ts` |
| The four palettes | Colour values authored in `src/assemblage/catalogue.ts` |
| The static drawing | Projected from the same geometry by `src/assemblage/project.ts` |
| Typography | The application's existing stack: `'Inter', system-ui, …`, requested from the system, never downloaded |

There is no randomness and no generator seeded from the clock, so a given catalogue version always
produces identical vertex data. A unit test asserts this.

## Influences, and what they are not

The visual direction was described in the build plan as "inspired by Tumi Ishi wooden rocks and the
construction vocabulary of Bausack". Those are **references for a look**: irregular faceted solids,
matte painted surfaces, asymmetric balance, visible contact.

Nothing was copied from either. No Tumi Ishi or Bausack photograph, model, colour specification,
product shape or piece of branding was used or traced, and neither name appears in the interface.
The shapes here are ordinary irregular polyhedra; the resemblance is of genre, not of design. If a
specific product shape were ever wanted, that would be a separate rights question and would need
asking before building.

## Dependency

One dependency was added for this work:

| Package | Version | Licence | Why |
| --- | --- | --- | --- |
| `three` | 0.187.0 | MIT | `WebGPURenderer`, its WebGL 2 backend, and the scene plumbing |
| `@types/three` | 0.187.0 | MIT | Types only; not shipped |

Both are pinned exactly in `package.json` and resolved in `package-lock.json`. The version was read
from the registry on 12 November 2026 and the licence from the installed package, not from a
repository branch.

No code was copied from the three.js examples, from `pmndrs/examples`, from `drei`, or from
`LowPolyRockGenerator`. React Three Fiber and Drei are **not** dependencies of this project; the
reasoning is in [ASSEMBLAGE-NOTES.md](ASSEMBLAGE-NOTES.md) §1.

## Network

The assemblage makes no network request. No CDN, no font service, no texture fetch, no telemetry.
The three.js chunk is served from the application's own build output and is loaded only when a GPU
path is actually attempted.
