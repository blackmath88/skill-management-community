# Perplexity research and concept sparring

Prepared 12 November 2026. Copy the prompt below. This commissions research, not implementation.

Act as a critical product researcher, learning-science researcher, interaction designer and browser-graphics engineer. Help me challenge and develop Skilling Me Softly. Do not validate my idea by default.

CONCEPT
A serious but playful personal skill-development companion: “the honest CV for yourself.” People choose a direction, practise in real work, reflect, receive optional feedback and build a visible history of development. The record can honestly say “with help”, “only rehearsed”, “not tried recently”, “conflicting feedback” or “blocked by conditions.” Practice experience is not a competence score.

Its emotional centre is a modular, non-human character: your buddy or alter ego, assembled from expressive geometric parts. Think an abstract creature or living sculpture, with a recognisable identity and restrained motion—not a human avatar, talking therapist, ordinary dashboard mascot or needy virtual pet. It is complete and worthy on day one. Appearance is chosen; development adds meaningful memories and inspectable traces. No punishment for absence or manipulative attachment.

The predecessor LeaderMe has a customisable Zdog character made of interlocking geometric pieces with a stable face, palettes and attachment slots. A functional React/TypeScript prototype now exists, with browser-local storage, campaigns, evidence, progression and a scripted sparring partner. Its current CSS emblem does not deliver this character vision. We want to evolve it, not rebuild the learning engine.

Public concept:
https://github.com/blackmath88/skill-management-community/blob/main/workbench/apps/capability-development/CONCEPT.md
Companion brief:
https://github.com/blackmath88/skill-management-community/blob/main/workbench/apps/capability-development/COMPANION.md
Existing preview source:
https://github.com/blackmath88/skill-management-community/tree/ccr-cda53478-1fik71/workbench/apps/capability-development/app
Predecessor (private; say if inaccessible):
https://github.com/blackmath88/leader-me

RESEARCH TASKS
1. Does something substantially like this already exist? Find close matches and useful adjacent products, open-source repositories and research prototypes. Investigate personal development companions, reflective portfolios, gameful skill practice, modular/procedural creatures and personal informatics. Habitica, Finch and virtual-pet systems are search leads, not presumed equivalents. Compare real-world practice, evidence/provenance, non-human identity, modular construction, progression meaning, privacy and business model. Distinguish demonstrated functionality from marketing. Identify what already solves this and what remains distinctive.

2. Challenge the thesis. Under what conditions does visible development help self-understanding, agency, calibration and action? When does it produce false confidence, performance theatre, surveillance, reward chasing or burdensome documentation? Examine self-regulated learning, reflective practice, self-efficacy/calibration, psychological ownership, self-determination, avatar identification/Proteus effect, gamification and transfer. Separate evidence about students or virtual environments from workplace transfer. Give contradictory and null findings. Do not assume engagement equals learning.

3. Make the companion concrete. Propose three coherent non-human design directions, each with a modular construction grammar, identity, permitted movement, customisation, meaningful history and evidence inspection. Explain what makes it feel “mine” over months. Distinguish resemblance to self from a companion beside self, and test both. Preserve identity across pixel, Nordic geometric, professional and industrial visual worlds without promising every renderer has identical capabilities. Describe five actual interactions, including a partial/failed attempt and returning after a long absence.

4. Investigate implementation using JavaScript/TypeScript. Compare:
- Existing Zdog / Canvas or SVG 2.5D;
- Three.js, with and without React Three Fiber, including WebGPURenderer and fallback;
- Babylon.js;
- PixiJS or a suitable 2D/vector animation approach;
- Raw WebGPU only if a measured need justifies it.
Start from https://gpuweb.github.io/gpuweb/ and official engine documentation. WebGPU is a rendering/compute API, not a character system. Verify current stable versions, licences, React compatibility, browser/device support and fallback limitations. Do not assume WebGPU makes one small character better or faster.

Compare authoring effort, modular attachments, expressive animation, picking, export/portability, bundle size, idle CPU/GPU/battery, mobile performance, accessibility, deterministic state, renderer lifecycle and maintenance. Separate sourced measurements from estimates. Recommend the simplest route that can achieve the desired craft, plus the condition that would justify upgrading.

5. Propose a bounded proof of concept: one character, a small validated part catalogue, editable assembly, three meaningful history traces, gentle motion, one evidence-detail interaction, save/reload and export/import. Renderer receives semantic appearance and presentation state, never raw journal text. Include schema/catalogue versions, invalid-combination handling, reduced motion, context loss/device loss, static fallback, keyboard controls and asset licensing. No arbitrary uploaded scripts/shaders or third-party telemetry. Show an implementation sequence and representative data model, not a speculative platform.

6. Design a small formative study comparing the character experience with the same journey without it. Measure perceived ownership, accurate explanation of development, meaningful real-world attempts, review burden and ability to choose a next step. Include sceptics. State what would falsify the companion hypothesis and what a short study cannot establish.

OUTPUT
- Start with your verdict: what exists, what is distinctive, and the strongest objection.
- A sourced comparison table of 8–12 relevant examples, not a long generic list.
- An evidence map: supported mechanism / uncertain inference / testable product hypothesis.
- Three visual/interaction directions and your recommendation.
- A technical decision matrix and one recommended architecture.
- A short build-and-test plan, tradeoffs and five questions that genuinely change the design.
- Sources with publication/access dates and exact links; primary research, official docs and actual repositories preferred. Mark inaccessible sources and abstract-only reading. Never invent benchmark numbers, licences, current compatibility or novelty claims.
