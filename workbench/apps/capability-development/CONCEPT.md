# Skilling Me Softly — product concept

Updated: 12 November 2026. Status: owner-selected positioning and companion direction; detailed mechanics remain hypotheses. A functional preview exists on the build branch; the richer character described here is not yet implemented. No effectiveness claim.

[Companion](COMPANION.md) · [Research sparring prompt](PERPLEXITY-SPARRING.md) · [Visual directions](VISUAL-DIRECTIONS.md) · [Architecture](ARCHITECTURE.md) · [Delivery plan](PLAN.md) · [Evidence and prior art](PRIOR-ART.md) · [App index](../README.md)

## 1. Purpose and scope

Develop the existing Leader Me concept into a personal, gameful capability-development application. People choose a meaningful direction, work on real situations, rehearse, act, seek feedback and adapt. The system also helps distinguish personal learning needs from constraints in shared practice, resources, incentives or authority.

This notebook holds the concept and plan. A separately runnable derivative now exists in this repository on branch `ccr-cda53478-1fik71`, under `workbench/apps/capability-development/app/`, with a [hosted preview](https://blackmath88.github.io/skill-management-community/). LeaderMe is the predecessor and a character-design reference. Earlier plans assigning implementation exclusively to LeaderMe are historical; this concept update does not move or merge the app. This is not the community's official platform. No personal journals, participant information or confidential organisational cases belong in this public documentation.

Three perspectives govern decisions together: senior engineering protects integrity and maintainability; design thinking tests usefulness and desirability; organisational development protects agency and attends to relationships, context and power.

## 2. Product promise

**The honest CV for yourself.**

Skilling Me Softly makes your development visible to you. Build a non-human companion that is yours from day one, and let selected experiences from actual working life become part of its history. Try something, get support, notice what happened and discover what carries into the next situation. Over time, build an inspectable history of what you practised, what you can point to, where you need help and how your practice changes.

The owner's thesis: make skills and personal growth visible to oneself. The testable product hypothesis is that meaningful practice plus an honest visible history can improve self-understanding, calibrated confidence and choice of next action. It is not established by the existence of a working app.

A conventional CV persuades others. This private record permits “with help”, “only rehearsed”, “contradictory feedback”, “not recently tried” and “blocked by conditions”. It is neither a credential nor an exhaustive or objective account of a person. Recording more does not mean growing more. Selective sharing is optional; there is no default employer view.

The character is the emotional centre, with evidence available behind its history. A fictional example: three attempts at explaining complex information, substantial help on the first, a colleague's successful explanation-back on the second, adaptation for another audience on the third. The next question is performance under time pressure—not “communication 80%”.

The application is not an LMS, employee assessment, personality diagnosis, generic chatbot or universal future-skills catalogue. Leadership remains the first domain; collaboration provides a second domain to test reuse.

Useful working distinctions: skills describe learned activities; competencies bundle requirements for situated performance; capabilities concern producing relevant outcomes under conditions; expertise includes domain-specific judgement; routines describe recurring coordinated practice. These definitions are working conventions, not a universal hierarchy.

## 3. Existing foundation and limits

Leader Me files were inspected read-only during the preceding discussion: README.md, docs/PRODUCT.md, docs/CHARACTER-STUDIO.md, docs/ARCHITECTURE-NEXT.md, src/domain/types.ts, progression.ts, recommend.ts, src/state/journey.tsx and src/storage/types.ts. Observed source tree revision in connector responses: fef298be0ff0d48eade4423c2ed7fafb4f19b6fa. No local execution or current test verification was performed. The architecture document itself describes a proposal and an older baseline.

Observed code includes evidence-derived milestones, quest attempts and reflections, provenance-aware profile claims, revision-aware storage, personal/demo isolation and situation-sensitive recommendations. The state provider imports a single skills catalogue and exposes arbitrary mutation callbacks. The domain requires a method for every quest and fixes four leadership skill groups. These are concrete extension points, not reasons to rewrite the app.

The character concept includes a stable identity, transient expression and evidence-linked development. Future XP is desired but exact rules were undecided. Character-centred home and AI horizons must not be confused with fully implemented functionality.

## 4. Behavioural product model

Direction → situation → notice strengths and constraints → competing explanations → choose a next move → prepare → attempt → review → adapt or transfer.

Users may enter through a situation rather than complete a profile. Reveal questions progressively. Always distinguish observations, interpretations and hypotheses. Offer a few reasoned alternatives rather than a diagnostic verdict.

A meaningful action plan identifies the cue, action, likely obstacle, fallback, observable signal and review point. Require detail proportionate to the activity, not a lengthy form for every small attempt.

Three development routes coexist:

- Personal practice: develop understanding or execution.
- Shared practice: negotiate or test a routine with other people.
- Conditions: clarify mandate, obtain support or address resources and conflicting incentives.

Pausing, declining or escalating can be legitimate. Do not assign responsibility for an institutional problem to someone without authority to change it.

## 5. Game mechanics independent of visual style

| Mechanic | Meaning | Boundary |
| --- | --- | --- |
| Character / personal identity | Chosen representation of a practised role and development history | Not the person's worth or a psychological type |
| Direction | Revisable aspiration | Not an inferred deficit |
| Campaign | Bounded intention connecting activities | Not necessarily a course or fixed sequence |
| Quest / activity | Meaningful observation, rehearsal, attempt or change | Not generic task completion |
| Equipment | A method, conceptual lens or practical resource | Changes available support, not numerical power |
| Perk | User-confirmed contextual strength with examples and possible overuse | Not a permanent personality bonus |
| Experience | Eligible documented practice | Not competence or mastery |
| Journal | Observations, uncertainty and adaptation | Private by default |

The modular non-human companion is central to the next product experience, not a decorative emblem. Preserve LeaderMe's geometric assembly direction and investigate a renderer that can deliver it well. See [Companion](COMPANION.md) and [research decisions](RESEARCH-DECISIONS.md). Different visual worlds can express the same identity and records; they cannot change learning or privacy rules. A character-free accessible view remains available. Prototype one compelling character before building all four skins.

## 6. Motivation and learning hypotheses

Choice and a personally meaningful direction may support agency. Specific feedback may support perceived competence. Optional peer involvement may support connection. Avatar ownership may encourage continuity. These are design hypotheses informed by research, not validated effects of this application.

Use cue-linked plans to bridge intention and action. Use rehearsal as preparation, not a substitute for application. Use later review to examine transfer. Do not optimise for session length or daily visits. Research qualifications and links are in PRIOR-ART.md.

## 7. Progression semantics

Maintain three separate projections:

1. Practice experience: deterministic credit for eligible activities.
2. Capability evidence: explored, rehearsed, tried, repeated, applied elsewhere and feedback available.
3. Presentation: optional visual development or a non-gameful equivalent.

Retain existing milestones and their historical meaning. Broadening is practice breadth, not mastery. XP remains a possible later, explicitly versioned convention; defer XP and cosmetic unlocks in the next companion prototype. Numerical weights remain proposed until tested. No points for opening the app, conversation volume, long prose, duplicate saves or claiming success. No multiplication by adding skill tags. Changed and unsuccessful attempts can qualify. No global competence score, competitive ranking or streak penalty.

An evidence-linked view must recompute after deletion. Cosmetic ownership and evidence are separate: propose preserving previously chosen appearance while removing unsupported evidence claims; decide and test this policy explicitly before implementation. Cosmetic choices must never certify competence.

## 8. Candidate first campaign

Candidate from the supplied plan: help a group move from recurring discussion to a clear next decision. The separate rebuild review also proposes an AI-briefing campaign to test a more distant skill domain. Selection and delivery order remain open; see the [app index](../README.md) for repository ownership.

A user says three units repeatedly reopen an issue. The system explores existing strengths and asks what the user can decide, recommend or negotiate. Branches include personal practice, contested ownership, competing priorities and lack of opportunity.

One route offers a rehearsal: a colleague resists a governance discussion. The user practises a question, then plans a real cue: if the decision is reopened, ask who can close it and what information that person needs. A fallback is to ask the sponsor, not force agreement.

After the meeting, the user reports that no final decision emerged but the group agreed to ask the sponsor. The system records a real attempt and partial outcome without inferring improved competence. A later follow-up checks whether authority was clarified. This can change the next activity rather than simply award another quest.

The second, genuinely different collaboration campaign concerns a handover between autonomous units: observe a successful and difficult case, compare expectations, test a minimal agreement and review its effects. Shared practice and received quality matter more than individual persuasion.

## 9. AI role

AI supports Explore, Rehearse and Review. It asks questions, offers hypotheses, simulates bounded roles and drafts possible insights. Persistent proposals are editable and rejectable. AI cannot award XP, confirm strengths, diagnose personality, mutate records or declare structural problems solved.

Learning mode asks for a first attempt and offers graduated help. Task-support mode may provide more direct assistance. Never treat assisted performance as independent learning. Record assistance when useful without pretending it yields a precise competence estimate.

Keep the AI sparring partner conceptually separate from the user's character. Never infer emotions to animate the character.

## 10. Privacy and collective learning

Personal development remains private by default. A user may prepare a reviewed share package: an anonymised case, reusable practice, request for support or structural obstacle. Sharing creates a snapshot, not manager access to the journal. Exported copies cannot reliably be recalled by deleting the original.

No covert skills inference from workplace communications. AI-inferred claims require provenance and human validation. Organisational learning needs human judgement and authority, not automatic reporting of personal weaknesses.

## 11. Success and falsification

Test whether people choose and carry out useful actions, distinguish capability needs from constraints, explain what they learned, adapt practice and retain control over their data. Observe burden, misunderstanding, shame, artificial documentation and reward chasing.

A four-to-six-week formative pilot is proposed, not scheduled or authorised. Include enthusiasts and sceptics with different authority levels. Enjoyment and return visits are secondary to worthwhile action and learning. A small pilot cannot establish long-term effectiveness.

## 12. Non-goals and open decisions

No universal taxonomy, competency ranking, LMS replacement, marketplace, manager dashboard, central ingestion, paid AI or deployment in this documentation task. Open decisions: exact XP policy, cosmetic retention, minimum evidence capture, content lifecycle, provider and hosting, rights for source materials, and whether organisational integration is needed at all.

## 13. Research fit and the wider work

The existing [prior-art and evidence review](PRIOR-ART.md) supplies research leads and qualifications; the table below is a design synthesis, not a new literature review.

| Research thread | Product implication | What remains to test |
| --- | --- | --- |
| Learning and transfer | Distinguish understanding, rehearsal and real application | Whether the loop improves later application |
| Work design and conditions | Record opportunity, resources, support and authority | Whether it helps identify a useful organisational next move |
| Behavioural planning | Include a concrete cue and fallback | Whether plans become attempts |
| Agency and motivation | Offer choice, useful feedback and optional connection | Whether users experience ownership rather than obligation |
| Gamification and avatar identification | Explore meaningful character ownership | Whether a non-human companion adds value beyond novelty |
| AI and expertise | Record assistance and try some new cases independently | Whether capability grows beyond supported output |
| Reflection and feedback | Separate observation, interpretation and other perspectives | Whether reviews improve judgement without excessive burden |

Community supplies perspectives, cases and methods. The future-skills radar offers possible directions. Skills in the Wild and Skillcember create collective occasions to practise. Skilling Me Softly carries the learner-owned history across those occasions; no automatic data integration or participant profiling is implied.

The first formative test should ask whether people can describe their development accurately, point to examples, name the support and conditions involved, and choose a worthwhile next challenge. Compare character and non-character presentations with equivalent content. A small pilot cannot establish long-term effectiveness.
