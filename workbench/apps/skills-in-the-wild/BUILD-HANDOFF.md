# Adoption decision and first-build handoff

Status: recommendation and future execution brief, 12 November 2026. This task created documentation only. No agent has been launched and no implementation repository has been created.

## Recommendation: new scaffold, selective port, one complete mission

Create a separate application repository, provisionally named **skills-in-the-wild**, when implementation is commissioned. Keep this community repository as the method/concept home. Have an agent set up a minimal runnable foundation and selectively port useful parts of Guerrilla Office Tactics, then review a complete user journey before expanding.

| Approach | Assessment |
| --- | --- |
| Full GitHub fork | Preserves upstream history but brings the meeting-specific product, brand and deployment assumptions. Appropriate only if we intend to maintain a closely aligned Guerrilla variant. Not the recommended starting point. |
| Copy all files and rename | Quick initial appearance, but carries unrelated content, identifiers, links and configuration. Avoid. |
| Fresh scaffold with selective port | Recommended. Reuse tested interaction patterns while giving campaign, missions and follow-up their own model. Record source revision and modifications. |
| Entirely fresh implementation | Possible, but repeats useful card/flow work. Use only where inspection shows adaptation is more complex than replacement. |

“Ask an agent to set up the basics” should mean this bounded selective-port slice, not an unspecified generic landing page or learning platform.

## Inspected prior art

[Guerrilla Office Tactics](https://github.com/blackmath88/guerrilla-office-tactics), inspected main revision [87ce5a542e9fa3ee9454cf87e9bb73fa861dd060](https://github.com/blackmath88/guerrilla-office-tactics/tree/87ce5a542e9fa3ee9454cf87e9bb73fa861dd060).

The README describes Astro, React islands, content as data, pure derivation functions, printable cards and static hosting. The inspected tree contains one implemented tool route, meeting-bystander. Other named tools in its schema/links must not be assumed implemented.

| Upstream area | Proposed treatment |
| --- | --- |
| src/content/schema.ts | Borrow separation of content and rendering; define campaign/edition/scenario/mission types rather than copying fixed IDs |
| src/components/ToolFlow.jsx | Inspect and adapt reusable navigation/form behaviour; support returning for feedback and another attempt |
| src/components/InterventionCard.jsx | Adapt printable result pattern into a field mission card |
| src/content/contract.ts | Retain legitimacy, evidence, exit and return-path concepts, with skills-specific wording |
| src/lib/meeting-bystander.ts and tests | Borrow pure-function/testing approach; do not copy meeting-specific gating as skills logic |
| src/layouts/ToolLayout.astro and styles | Reuse suitable layout ideas; replace Guerrilla branding with accessible wilderness direction |
| public/_headers and scripts/finalize-csp.mjs | Inspect and regenerate security configuration for actual built output |
| Analytics, deployment metadata, brand assets and fonts | Do not copy blindly; analytics off, no inherited tokens/domain, verify asset licences |

The inspected root tree contains no root LICENSE file. Do not infer an open-source licence from repository access. Before copying code, record the owner's reuse permission/licensing decision and retain applicable third-party notices. The repository inspection is not a licence audit or runtime verification.

## Smallest useful build

A separate static Astro/React app is a proportionate starting recommendation, subject to current upstream review. No backend, login, live model integration, personnel analytics or LMS integration.

Deliver:
1. Campaign home explaining Skills in the Wild and its application method.
2. AI edition with six scenario summaries; only the first mission is interactive, other entries clearly labelled as previews.
3. One end-to-end mission: Turn notes into action, using the supplied synthetic example.
4. Editable preparation and field card, quality checks, feedback, next attempt and review decision.
5. Print/export of an explicitly chosen card. Private reflections excluded unless deliberately selected.
6. Separate synthetic demo state; it must never overwrite a user's draft.
7. Clear save/delete behaviour. If local storage is used, disclose device scope and provide reset.
8. Keyboard-accessible flow, text alternative to map navigation, readable mobile and print layouts.
9. README, source provenance, narrow tests and a handoff with observed validation results.

No automatic scoring, competitive leaderboard, competency inference or promise that completion demonstrates competence.

## Acceptance checks

- Complete the synthetic mission from landing to printable card without an AI API.
- Unknown owner/date values remain unknown; no derivation silently fills them.
- Navigate back and forward without unintended data loss.
- Demo loading does not overwrite a personal case.
- Reset removes saved case data; export includes only the selected content.
- Feedback and a second attempt are reachable after the first card.
- Check keyboard, mobile and print rendering manually or with browser automation.
- Inspect network activity: no user-input transmission or analytics in the baseline.
- Run the app's build and meaningful tests; report exact results and any unexecuted checks.

## Review gates

First review: usable synthetic mission and visual direction.
Second review: content refinement with a facilitator and potential participants.
Third review: separately authorised small workplace pilot.
Later: decide deployment, duration, further domains and any optional Skilling Me Softly integration.

Do not add campaigns, accounts or infrastructure before the first complete journey is reviewable.

## Ready-to-use execution prompt

Use after the owner identifies or creates the exact application repository:

> Work in the explicitly assigned Skills in the Wild application repository. Read its AGENTS.md and preserve unrelated changes. Read the concept, AI scenarios and build handoff in blackmath88/skill-management-community/workbench/apps/skills-in-the-wild. Inspect current blackmath88/guerrilla-office-tactics and compare it with the recorded source revision. Confirm the applicable reuse permission and licences before copying.
>
> Build the “Smallest useful build” described here: a static campaign foundation, an AI edition and one complete synthetic Turn notes into action mission, including feedback and a second attempt. Selectively port suitable flow/card patterns with provenance; replace meeting logic, branding, fixed IDs and deployment assumptions. Keep app code out of the community repository.
>
> Use an accessible wilderness visual direction with plain-language navigation. No backend, AI API, account system, analytics, deployment or real personnel data. No agents launched by this document; execute only within the owner's actual task authorisation.
>
> Run the acceptance checks, update README and handoff, and prepare a reviewable branch/PR in the assigned app repository. Report what works, what remains uncertain and what needs a decision. Do not publish or launch a workplace pilot.

[Concept](CONCEPT.md) · [AI scenarios](AI-SKILLS-IN-THE-WILD.md)
