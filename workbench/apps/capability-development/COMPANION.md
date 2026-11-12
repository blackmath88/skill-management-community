# A companion that makes development yours

Date: 12 November 2026. Status: owner-selected product direction; detailed mechanics and rendering technology remain proposals. No implementation in this documentation update.

[Concept](CONCEPT.md) · [Visual worlds](VISUAL-DIRECTIONS.md) · [Research sparring prompt](PERPLEXITY-SPARRING.md) · [Research decisions](RESEARCH-DECISIONS.md) · [Visual references](VISUAL-REFERENCES.md)

## Intent

A modular, expressive, non-human character is the emotional centre of Skilling Me Softly. It can feel like your buddy or alter ego without portraying a human being or claiming to know your personality. The reference is LeaderMe's assembled geometric creature: a recognisable core, curated parts, attachment slots and intentional motion.

The character is complete and worthy on day one. All identity options in the prototype are available from day one. Growth can change chosen arrangements and add curated memories; it does not imply that the starting person was deficient.

## Four independent layers

| Layer | Meaning | Examples |
| --- | --- | --- |
| Identity | Choices that make this recognisably yours | Silhouette, core/face motif, palette, name, composition |
| Expression | Temporary interaction response | Orient toward a selected item, settle after a drag, brief acknowledgement |
| Practice history | Inspectable traces of accepted experiences | Campaign token, motif recalling an adaptation, evidence-linked module |
| Evidence | Records supporting a specific statement | Attempt, conditions, assistance, feedback, later application |

Never derive mood, personality or competence from geometry. A larger part is not a higher skill score. Essential controls and evidence remain accessible without the character.

## Interaction proposals

- Assemble: choose a small set of compatible parts with labelled controls and an immediate preview.
- Recognise: keep identity stable across theme changes and gaps in use.
- Remember: select a history detail to see the experience behind it, including uncertainty and help.
- Reflect: after a partial or unsuccessful attempt, acknowledge the learning without pretending the skill improved.
- Return: welcome a person back without decay, shame, loss of worth or a needy message.
- Adapt: let the user hide or restyle visible history without deleting evidence, and delete evidence without forcing loss of chosen appearance. Exact retention rules require explicit implementation decisions.

A companion beside you and an alter ego representing you are different relationships. Start the prototype with the companion framing and test the alter-ego framing separately; do not silently switch to an AI confidant. The AI sparring partner remains a separate optional capability.

## Technical direction: test craft before choosing an engine

JavaScript/TypeScript is the web implementation language intended here, not Java. WebGPU is a browser graphics/compute API, not an avatar engine or a prerequisite for ownership and expressiveness.

Prototype hypothesis after research review: retain the existing Zdog geometric 2.5D direction, with native SVG as a simpler alternative if rotation is unnecessary. Only investigate Three.js or another richer engine when the visual proof exposes a concrete limitation. Raw WebGPU requires a measured need; no dependency has been installed or upgraded.

Official references inspected on 12 November 2026:
- https://gpuweb.github.io/gpuweb/ — WebGPU API specification.
- https://threejs.org/manual/pages/webgpurenderer — documents a WebGPU backend with WebGL 2 fallback. This is not verification of every material, React integration or target device.
The suggested https://webgpu.github.io/ did not resolve in this check.

Keep a versioned semantic assembly separate from renderer objects: catalogue IDs, part instances, attachment slots, palettes and bounded transforms. Feed an evidence-derived presentation model into a renderer adapter; do not pass raw journal content. Reject invalid assemblies, preserve known historical meaning and handle unsupported catalogues explicitly.

## Small proposed rendering spike

One companion, a curated part catalogue, editing and rotation, three history traces, one trace-to-evidence interaction, save/reload and export/import. Use three proposed cores, six attachments, four palettes and three memory motifs. Prove one coherent family before considering another rendering route. No automatic ornament accumulation or XP in this slice.

Measure load cost, idle activity, mobile responsiveness and resource cleanup. Test reduced motion, keyboard controls, static fallback and adapter failure. Context/device-loss tests apply only if a GPU renderer is adopted. Modern browser API availability alone is not acceptance.

No renderer-specific identity storage, arbitrary uploaded code/shaders, external asset tracking, background GPU loop without purpose or forced cloud connection. Use synthetic records and reviewed/licensed assets.

## Acceptance hypotheses

People recognise it as theirs, can explain what its changes mean without confusing activity with competence, and find a useful next action. Compare against the same experience without a character. Enjoyment matters, but is not evidence of better learning. See the sparring prompt for the broader evidence review.
