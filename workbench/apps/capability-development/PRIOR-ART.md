# Evidence, prior art and adoption decisions

Date: 11 November 2026. Status: selected research inputs and proposed adoption decisions. Not a systematic review or dependency/security audit.

[Concept](CONCEPT.md) · [Architecture](ARCHITECTURE.md) · [Plan](PLAN.md)

## 1. Evidence discipline

Research informs mechanisms, not proof of this product. Source types, limited access and transfer limitations matter. Repository capabilities below are documented claims unless specifically noted. No project was installed or benchmarked during this conversation. GitHub main is mutable; pin a release/commit and verify cutoff availability before copying. Licences are initial checks, not legal advice.

## 2. Behaviour and gamification

- Michie, van Stralen and West (2011), peer-reviewed conceptual synthesis: COM-B and Behaviour Change Wheel. Useful for considering capability, opportunity and motivation; not a validated automatic diagnosis and not a complete theory of organisational power. https://pmc.ncbi.nlm.nih.gov/articles/PMC3096582/
- Sailer and Homner (2020), peer-reviewed gamification meta-analysis. Positive learning findings do not identify an effective points/avatar recipe for workplace transfer. Abstract/index and available repository material consulted, not a full critical appraisal. https://eric.ed.gov/?id=EJ1245270 ; https://opus.bibliothek.uni-augsburg.de/opus4/frontdoor/deliver/index/docId/109056/file/109056.pdf
- 2024 meta-analysis, Gamification enhances student intrinsic motivation, perceptions of autonomy and relatedness: 35 interventions, 2,500 participants. Educational evidence, not a workplace product validation. Verify full bibliographic metadata before external publication. https://link.springer.com/article/10.1007/s11423-023-10337-7
- Sheeran, Listrom and Gollwitzer, online 2024, The when and how of planning: 642 tests of implementation intentions. Supports cue-linked action planning; does not guarantee organisational transfer. Abstract-level use. https://www.tandfonline.com/doi/full/10.1080/10463283.2024.2334563
- Ratan et al. (2019 online / 2020 issue), Proteus-effect meta-analysis: avatar effects across experimental virtual environments. Does not establish that an abstract workplace character produces better professional behaviour. Abstract-level use. https://www.tandfonline.com/doi/full/10.1080/15213269.2019.1623698

Design hypotheses: meaningful choice, credible feedback, contextual challenge, optional connection and continuity may help. Test them separately. No claim that cosmetic upgrades, XP or a particular geometry cause competence.

## 3. Learning, transfer and AI

- Blume, Ford, Baldwin and Huang (2010), peer-reviewed training-transfer meta-analysis. Environment and measurement source matter; apply cautiously to this product. Abstract consulted. https://journals.sagepub.com/doi/10.1177/0149206309352880
- Parker and Knight (2024), SMART work-design model. Supports attention to work characteristics rather than only personal skills. https://onlinelibrary.wiley.com/doi/full/10.1002/hrm.22200
- Brynjolfsson, Li and Raymond (2025), Generative AI at Work, peer-reviewed field study. Performance support and learning require distinct interpretation. https://academic.oup.com/qje/article/140/2/889/7990658
- Generative AI and the temporary upskilling of knowledge workers (26 October 2026), peer-reviewed study. Abstract-only consultation: supported performance did not establish corresponding independent knowledge gain. Verify complete author metadata before external publication. https://link.springer.com/article/10.1038/s41562-026-02566-6
- Shen and Tamkin (29 January 2026), provider-authored research on coding skill formation. Small randomised experiment; short-term outcome; not a general claim that AI prevents learning. https://www.anthropic.com/research/AI-assistance-coding-skills

Implication: distinguish participation, enjoyment, understanding, assisted performance, independent application, sustained transfer and organisational outcomes. Do not use XP as a proxy for all of them.

## 4. GitHub adoption shortlist

| Project | Reuse proposal | Initial licence finding | Limit and adoption gate |
| --- | --- | --- | --- |
| vercel/ai | Provider adapter, streaming and structured outputs behind application-owned port | Apache-2.0 | Verify exact release against current stack; explicit direct/gateway route and retention; no domain dependency |
| promptfoo/promptfoo | Synthetic prompt/model regression evaluations in development/CI | MIT core | Verify release, telemetry and provider data flows; human review remains necessary |
| dubzzz/fast-check | Property/model-based tests for invariants and sequences | MIT | Test in current Vitest toolchain; keep properties semantically precise |
| statelyai/xstate | Optional rehearsal orchestration | Licence must be checked at pinned release | Use only after comparison with plain transitions; avoid copying beta main examples |
| Selleo/mentingo | Study prompt versioning, roleplay boundaries, shared contracts and company variation | MIT repository | File-level review before copying; do not inherit LMS scoring, infrastructure or tenant assumptions |
| LearningLocker/learninglocker | Future external learning-record integration reference | GPL-3.0 main application; xapi-validation separately MIT | Do not use xAPI as canonical private development model; legal and data-flow review before integration |
| json-logic/json-logic-engine | Possible future persisted rules | Not verified here | Defer; typed rules sufficient initially; no arbitrary executable tenant rules |

Canonical sources:

- https://github.com/vercel/ai and https://github.com/vercel/ai/blob/main/LICENSE
- https://github.com/promptfoo/promptfoo and https://github.com/promptfoo/promptfoo/blob/main/LICENSE
- https://github.com/dubzzz/fast-check and https://github.com/dubzzz/fast-check/blob/main/LICENSE
- https://github.com/statelyai/xstate and https://stately.ai/docs
- https://github.com/Selleo/mentingo and https://github.com/Selleo/mentingo/blob/main/LICENSE
- https://github.com/LearningLocker/learninglocker and https://github.com/orgs/LearningLocker/repositories
- https://github.com/json-logic/json-logic-engine

Primary repository pages for AI SDK, XState and Mentingo were retrieved; other entries use primary search results/documentation. No claim of release-specific compatibility, independent security assurance or long-term maintainability.

## 5. Other useful patterns, not required dependencies

- Stanford STORM/Co-STORM: source-oriented perspective exploration. Borrow question-broadening, not simulated stakeholder participation. https://github.com/stanford-oval/storm
- Onyx: source-bound organisational knowledge access. A curated case collection may suffice; search does not solve ownership or validity. https://github.com/onyx-dot-app/onyx
- Nesta OJD DAPS Skills: documented skills extraction and explicit limitations. Text mentions are not evidence of a person's ability; English job-ad assumptions do not generalise automatically. https://nestauk.github.io/ojd_daps_skills/pipeline_summary/

## 6. Do not outsource these rules

The application must own the distinction between practice and competence, rehearsal and application, personal and structural work, conflicting evidence, private reflection and shared knowledge. Libraries provide mechanisms, not professional judgement.

Before implementation: verify the current source versions, licences and exact behaviours needed; record keep/adopt/borrow/defer decisions; run a bounded fit spike; document removal cost.
