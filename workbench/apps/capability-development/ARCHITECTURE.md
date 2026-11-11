# Capability development application — architecture

Date: 11 November 2026. Status: **partly superseded and partly implemented.** The boundaries in
sections 2 and 4 to 12 were implemented. Sections 1 and 3 are superseded: see the notice below.

[Concept](CONCEPT.md) · [Plan](PLAN.md) · [Prior art](PRIOR-ART.md) · [The implementation](app/README.md)

> ## Superseded: this is no longer an in-place evolution of Leader Me
>
> **Sections 1 and 3 below assume one application package evolved inside the Leader Me
> repository. That is not what was built.** The application is a separately runnable derivative at
> [`app/`](app/) in this repository, derived from `blackmath88/leader-me` at commit `55114f3b`.
> Useful implementation and design were retained rather than rebuilt or copied wholesale.
>
> The reasoning, what it costs and what would reverse it are in
> [`app/DECISIONS.md` A1 and A2](app/DECISIONS.md). What was carried over, what was not, and the
> licence position are in [`app/PROVENANCE.md`](app/PROVENANCE.md). The original repository was
> not modified.
>
> Two further decisions depart from this document. Section 1's "keep the existing framework and
> lockfile" is superseded by A2: the app uses Vite and React with no server framework, because
> every record stays in the browser. Section 11's candidate list is unchanged in intent;
> `fast-check` was adopted, the rest were not.
>
> Read sections 2 and 4 to 12 as the design that was implemented, and
> [`app/CHECKLIST.md`](app/CHECKLIST.md) for what is implemented, verified, deferred and blocked.

## 1. Decision (superseded — see the notice above)

Evolve Leader Me as one application package with a headless development core. Keep the existing framework and lockfile until compatibility checks establish a reason to change. No replacement scaffold, microservices, event-sourcing platform or generic plugin system.

Headless means rules and accepted records do not depend on a character renderer, company vocabulary or interface layout. It does not mean building an enterprise platform in advance.

## 2. Boundaries

Presentation → application commands/queries → pure domain transitions → revision-aware persistence. AI and integrations are adapters. Content supplies versioned authored definitions.

| Boundary | Owns | Must not own |
| --- | --- | --- |
| Domain | Records, invariants, legal transitions, evidence and practice projections | React, providers, rendering |
| Application | Commands, reference validation, revision checks, persistence orchestration | Visual layout |
| Storage | Transactional snapshots, migrations, import/export | Learning judgement |
| Content | Definitions, sources, templates, rules | Private records or executable plugins |
| AI | Provider communication and validated proposals | Canonical writes or rewards |
| Presentation | Interaction and selected read models | Duplicated domain rules |

## 3. Proportionate repository direction (superseded — see the notice above)

Retain src/domain, storage, avatar, content, state, routes and components. Introduce application commands, queries and ports when the first use cases need them. Add ai contracts and evaluation only with the relevant slice. Split domain files by responsibility as they grow; do not create empty framework folders.

Existing JourneyProvider remains a persistence coordinator initially. Move domain mutations to named commands and remove its direct dependency on the single SKILLS catalogue. Do not replace its save queue or conflict protection casually.

## 4. Records

- DevelopmentDirection: user text, focus, history.
- Campaign: direction reference, purpose, state, activities, review intent.
- Situation: current record extended with optional constraints and support.
- WorkingHypothesis: category, text, source, status, evidence references, revision history.
- PracticeActivity: kind, planned cue/action/obstacle/fallback/signal, state, context references and optional methods.
- Attempt: actual action, changed/stopped/interrupted status, time and assistance used.
- EvidenceItem: observation, work-sample reference or attributed feedback; source and visibility.
- Review: observation, interpretation, alternatives, next adjustment.
- AIProposal: kind, payload, referenced IDs, base revision, provenance, lifecycle.
- SharePackage: explicit reviewed snapshot, included fields and provenance. Defer delivery infrastructure.

These are responsibilities, not an instruction to replace all current types. Migrate Quest incrementally into richer practice activity semantics. Existing records must remain interpretable. Do not force every activity to have a method or every campaign into a linear sequence.

## 5. Commands and results

Introduce only needed commands: CreateCampaign, RecordSituation, AddWorkingHypothesis, PlanActivity, RecordAttempt, SaveReview, AcceptAIProposal and DeleteEvidence. They validate inputs, references and legal transitions, calculate a next state and persist using expected revision. Return typed validation/conflict/storage results.

Commands must not compute from a stale UI snapshot and overwrite a newer saved state. Use the existing queue and revision transaction semantics. AI acceptance is idempotent and revision-aware.

## 6. Derived read models

Separate derivePracticeExperience(records, policy), deriveCapabilityEvidence(records, content) and deriveDevelopmentSummary(records, content). Presentation receives these projections. Avatar receives a narrow display model and appearance configuration, never journal text.

Practice totals are derived from eligible source records, not imported authoritative totals. Policy version and explanation are visible. Define how historical policy versions remain interpretable. Avoid silently recalculating a user's history under unannounced weights.

## 7. Content packs and variation

Leadership is the first pack; collaboration is the second. Stable IDs and versioned definitions include observable capability descriptions, methods, limits, sources, templates and recommendation rules. Preserve referenced historical definitions or sufficient snapshots.

Separate presentation configuration, content selection, programme configuration and governance. A company theme cannot override privacy or evidence semantics. Avoid arbitrary tenant-specific code. Start with two domains and a minimal presentation contract; no multi-tenant backend, billing or SSO until required.

## 8. AI contract

Selected records/turns → exact preview → explicit send → protected server endpoint → provider adapter → validated response → reviewable proposal → accepted ordinary command.

Support deterministic fake providers first. A live provider requires separate permission, credentials, limits and retention review. Do not put secrets in client code. Validate invented references, malformed output, stale revisions and repeated acceptance. Streaming partials are never canonical. Treat retrieved content as untrusted evidence, not instructions.

AI SDK is a candidate adapter, not a domain dependency. No agent framework is needed for one bounded rehearsal. Core workflows remain usable without AI.

## 9. Persistence and migrations

Retain RecordStore snapshot storage initially. Its personal/demo namespaces are not tenant isolation. Keep physical database, personal data, export, content and progression versions distinct.

Each schema addition ships with validation, migration, export/import and regression fixtures. Read old exports, reject unsupported newer versions without truncation, preserve unrelated and supported forward-compatible data according to explicit policies. Imports are validated atomic replacement, never partial undocumented merge.

Preserve truthful save status, unsaved edits, stale-tab handling and namespace generation protection. No CRDT or sync replacement without an actual collaborative/offline-sync requirement.

## 10. Privacy, deletion and sharing

Local browser storage is not encrypted backup. Do not broaden no-outbound-data claims after adding live AI. Show what is sent and describe provider-side limitations. No raw journal telemetry by default.

Deleting evidence updates related projections and handles dangling references explicitly. Review cosmetic retention separately. Shared/exported copies have independent lifecycles and cannot be promised revocable. Data minimisation applies to feedback about other people.

## 11. Candidate reuse

Consider fast-check for invariants, Promptfoo for AI evals, AI SDK for provider integration and XState only after a transition-complexity spike. Study Mentingo for patterns; do not inherit its LMS or tenant infrastructure. Keep xAPI as a future explicit export adapter. See PRIOR-ART.md for limitations and verification gates.

## 12. Required verification

Unit tests for transitions and projections; property tests for deduplication, order-independent operations where applicable, legal sequences and round trips; application tests for stale proposals and revisions; storage tests for isolation, migrations and failures; one automated browser test covering a full campaign and a structural-barrier branch.

Passing tests demonstrates specified software behaviour, not psychological validity or long-term learning effectiveness.
