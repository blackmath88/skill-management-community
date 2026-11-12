# Modular companion — visual references and construction grammar

Researched 12 November 2026. Status: recommendations for discussion, not selected final artwork. Official pages and repository descriptions inspected; demos were not executed and source code was not audited. Licensing below is limited to what was actually established.

## Useful references

| Reference | What to study | Relevance and limit |
| --- | --- | --- |
| [Zdog gallery](https://zzz.dog/) / [repository](https://github.com/metafizzy/zdog) | Round geometric forms in flat-shaded 2.5D; declarative composition; Canvas/SVG | Closest rendering language to LeaderMe. An engine, not a supplied modular companion/editor. |
| [Character Creator Zdog](https://github.com/GalileaV/Character-Creator-Zdog) / [demo link from repo](https://galileav.github.io/Character-Creator-Zdog/) | README proposes character customisation through parts, colours and accessories | Useful editor precedent. Humanoid anatomy is outside our brief; README objectives are not verified working features. Reuse licence not established. |
| [DiceBear Bottts](https://www.dicebear.com/styles/bottts/) / [library](https://github.com/dicebear/dicebear) | Swappable faces, mouths, antennas, side units and textures within a consistent vector style | Strong catalogue/layer grammar reference; profile heads do not supply spatial assembly or an evidence system. Style page states personal/commercial use; inspect exact artwork terms before copying. |
| [DiceBear Shapes](https://www.dicebear.com/styles/shapes/) | Sparse abstract geometry, composition and palette | Good reference for a quiet faceless identity or static fallback. Official style page identifies CC0; do not assume all DiceBear styles have the same licence. |
| [Pudgy Pals](https://github.com/nmagarino/Pudgy-Pals-Procedural-Creature-Generator) / [demo link](https://nmagarino.github.io/Pudgy-Pals-Procedural-Creature-Generator/) | Creature families generated from a spine, heads and limb choices | Useful contrast: large combinatorial freedom can introduce collisions and visual artefacts, acknowledged by authors. SDF/raymarching is unnecessary for our first slice. Reuse licence not established. |
| [Cubebot by David Weeks — visual catalogue](https://hauslondon.com/products/cubebot-by-david-weeks) | Pose, articulated blocks, material consistency and an object worth keeping on a desk | Physical design inspiration only. We would use an abstract non-human silhouette, not copy this humanoid product or its protected design. |
| [EPFL Roombots](https://www.epfl.ch/labs/biorob/research/modular/roombots/) | Repeated connector modules create changing structures | An industrial construction reference, not a web asset kit. Useful principle: new relationships between existing parts can express change without making the object larger. |

## Recommendation: a small kinetic sculpture that feels alive

Working name: Studio Assemblage. Borrow the consistency of a good construction toy, the configurable parts of vector avatars and the brief responsive motion of a companion. Create original artwork.

A curated kit should produce three distinctive silhouettes before adding more parts. Nice results depend on compatible proportions, attachment rules, negative space and colour relationships; the renderer alone cannot supply these.

Proposed grammar:
- One dominant rounded core: pebble, arch or rounded block.
- Three to five named attachment positions with discrete orientations.
- Six compatible accents: loop, fin, bridge, counterweight, disc and inlay.
- One deliberate asymmetry and one recognisable opening/motif; eyes optional.
- Two main colours plus one small accent, with shared edge thickness and curvature.
- Brief orient/settle motion after interaction, then stillness. No persistent bouncing.
- Memory marks stay small and optional; the same kit can be reorganised without implying a higher level.

## Three art directions to compare

| Direction | Appearance | How it stays modular | Tradeoff |
| --- | --- | --- | --- |
| Nordic kinetic sculpture — recommended starting point | Matte colour, soft geometric shapes, generous gaps, crisp white surrounding UI | Visible seams and shared rounded connectors; palette and proportions do most of the work | Needs excellent silhouette and motion to feel like a companion |
| Pixel workshop | Clearly authored pixel silhouettes, limited palette, few deliberate animation frames | Parts align to a fixed pixel grid and common attachment anchors | Each part needs pixel-specific artwork; pixelating a 3D render is not enough |
| Precision instrument | Enamel-like surfaces, dark graphite, etched marks and a small signal accent | Rings, pivots and sockets make assembly legible | Can feel like equipment; avoid equating technical styling with seriousness |

Professional/banking is a quieter presentation of the same chosen identity, not a suit or a different competence model. Industrial styling does not require photorealism. Preserve the app's white canvas and sans-serif direction while exploring companion materials.

## Implementation implications

Prototype with Zdog or native SVG first, depending on whether rotation proves useful. Use Three.js only if depth, materials or asset authoring justify the step. WebGPU is not required by this brief.

Keep identity as catalogue parts, attachment IDs, discrete transforms and palette choices; map it to each renderer/theme. A style switch must retain the identity signature, not merely regenerate a random avatar from a seed.

Use original primitives and locally bundled reviewed assets. A customisation file is data, not permission to run SVG scripts, external URLs or shaders. Do not send a personal identifier or journal data to a public avatar API to render the companion.

## Next visual proof

Show three compositions in the Nordic family, then the same identity translated into pixel and precision styles. Show one selected memory and its evidence panel. Compare recognition at small size, perceived warmth, ownership and what visual changes imply. These are proposed deliverables, not completed renders.
