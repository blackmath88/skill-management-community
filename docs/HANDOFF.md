# Handoff

11 November 2026.

- Reorganised PR #1 into community/, knowledge/ and workbench/ under the owner-approved structure. Direct repository inspection used; no current Observatory snapshot was supplied.
- Split people, session notes and follow-ups; retained source qualifications and original-source hashes. Added R3 AI research as a redacted public copy with an explicitly report-derived synthesis.
- Connected radar session idea, knowledge, worksheet and proposed pilot. No experiments run or apps installed.
- Existing scripts/workflows unchanged. Three curated index files added to explicit knowledge selection; full reports remain unselected.
- Next: review the PR and choose a concrete practice question. Source verification recorded earlier is inherited, not newly repeated.

Validation: foundation structure passed; 91 relative documentation links resolved; existing unit suite passed 4 tests and skipped 3 producer-dependent checks because the pinned Observstory checkout was not available locally. Catalogue and knowledge manifest JSON parsed. CI retains the pinned-producer checks.

## Capability development concept addition

- Learned: main remains a scaffold; the existing docs/oe-skills-community-knowledge branch contains the active three-space notebook. The app work belongs under workbench/apps/, not a replacement of the community concept. Direct connector inspection used; no current Observatory artifact was reviewed.
- Changed: added the linked [concept](../workbench/apps/capability-development/CONCEPT.md), [architecture](../workbench/apps/capability-development/ARCHITECTURE.md), [plan](../workbench/apps/capability-development/PLAN.md) and [prior-art review](../workbench/apps/capability-development/PRIOR-ART.md); extended the app index.
- Authority: user requested a detailed concept and plan in this repository. Technical and product details remain proposals. Documentation approval does not authorise implementation, paid AI, publication elsewhere, merge or deployment.
- Evidence: preceding read-only inspection of Leader Me plus public research and repository documentation; access and verification limitations are recorded in the documents. No private development records or raw conversation imported.
- Checks: repository structure and relevant documents inspected through GitHub. No local checkout, test suite, link checker or application execution performed for this addition. Earlier validation above belongs to the earlier work and is not a fresh result.
- Selection: existing app index provides navigation; no knowledge-manifest status or selection changed. New documents are not automatically selected knowledge.
- Next useful action: review concept boundaries and open policies, then issue a separate bounded implementation mandate in the Leader Me repository.
- Source branch observed before addition: docs/oe-skills-community-knowledge at 1302cd806422689d1f8d6327ec6b6b9edf6b8527. Do not describe the proposal as implemented.

## mailtrace concept and agent build handoff — 2026-11-11

- Changed: added [concept and prior-art leads](../workbench/apps/mailtrace/CONCEPT.md), [milestone build plan](../workbench/apps/mailtrace/BUILD-PLAN.md) and [agent rules/start prompt](../workbench/apps/mailtrace/AGENTS.md). Documentation only; no runtime code, repository creation, deployment, agent launch or live recipient probes.
- Evidence: owner-supplied concept and preceding conversation review. Public reference links are inherited research leads, not a fresh upstream audit. Current repository inspected directly through GitHub; no current Observatory snapshot reviewed. Observed main at ab16b0c70276da33fbae527a5ee9bab4be0365e9 before this addition; earlier branch statements above are historical.
- Boundary: workbench policy keeps app code in a separate repository. Agent must obtain the exact implementation target before writing runtime code. Existing community/app concepts and root agent instructions remain unchanged.
- Design: trace-first offline slice, deterministic Python, bounded public discovery, optional authorised Reacher probing, honest unknowns and German offline replay. Reacher image/API/licence/extra-lookups are investigation gates; SMTP acceptance is not identity proof.
- Checks: repository instructions, structure, branch and relevant documents inspected via connector. No local checkout, test execution, link checker, Docker run or Linuc connectivity experiment performed. Prior validation entries above do not apply to this new documentation.
- Selection: no knowledge manifest or automatic ingestion changed. No real contacts, addresses, private connection details or traces imported.
- Next: approve documentation, select an implementation repository, then start the agent with the supplied prompt. Linuc connectivity and any live testing remain separate operator-authorised work.


## Capability development application — implemented and verified — 2026-11-11

- **Learned:** the concept, architecture and plan in `workbench/apps/capability-development/` were
  specific enough to build from directly. Two places needed a judgement rather than a reading, and
  both are recorded as decisions: where the application lives, and what a rehearsal is worth. The
  predecessor's code at `blackmath88/leader-me` was better than its documents suggested — its
  storage conflict handling, its validation reader and its save-queue semantics were carried over
  largely as written, because rewriting them would have been a regression risk for no benefit.

- **Changed:** built the application at
  [`workbench/apps/capability-development/app/`](../workbench/apps/capability-development/app/).
  About 11,600 lines of source and 4,900 of tests across domain, application, storage, content, AI
  and one presentation. Two content packs; a four-branch leadership campaign where only one branch
  is personal practice; a collaboration handover campaign whose mechanism is a shared routine; a
  deterministic local AI stand-in; export, import, and conversion of Leader Me exports. Added
  [README](../workbench/apps/capability-development/app/README.md),
  [DECISIONS](../workbench/apps/capability-development/app/DECISIONS.md) (15 entries),
  [PROVENANCE](../workbench/apps/capability-development/app/PROVENANCE.md) and
  [CHECKLIST](../workbench/apps/capability-development/app/CHECKLIST.md). Marked the superseded
  sections of CONCEPT, ARCHITECTURE and PLAN, and updated the app index.

- **Authority:** the owner's implementation mandate named the location, the scope and the working
  style, and authorised project-local dependencies, local commits on a dedicated branch, and
  ordinary reversible product and engineering decisions. Nothing was merged, deployed, published
  or paid for. No credentials were added and no external service was touched. Leader Me was cloned
  read-only outside this repository and was not modified.

- **Decisions that supersede earlier documents:** A1, the application is a separately runnable
  derivative here rather than an in-place evolution in the Leader Me repository — ARCHITECTURE §§1
  and 3 and PLAN §1 are superseded. A2, Vite and React rather than keeping the predecessor's
  server framework, because every record stays in the browser. The other thirteen are new ground:
  the versioned counting convention, appearance retention, the AI boundary, the citation
  verification state, and the storage validation contract added after review.

- **Evidence — what was actually run, on the current tree, from a clean `node_modules`:**
  `npm ci` 217 packages; `npm run typecheck` clean; `npm run lint` clean; `npm run test`
  **327 passed, 20 files, 0 failed, 0 skipped**; `npm run build` succeeded, 468 kB JS (136 kB
  gzipped); `npm run test:browser` **79 of 79 checks** across three journeys against the production
  build in Chromium with real IndexedDB. The repository's own checks still pass unchanged:
  `python3 tests/test_foundation.py` 4 passed and 3 skipped for the pinned Observstory producer,
  `python3 scripts/check.py` OK. 176 relative documentation links resolve.

- **Independent review:** two reviewers with no part in writing the code. The first examined domain
  integrity and privacy against the concept's promises; 17 findings, 2 high, 13 material ones
  fixed and the rest recorded as decisions A13 and A14. The second attacked engineering
  correctness with runnable probes; 11 findings, 2 high, every one proven and all fixed. Both
  high-severity findings in the second review were reachable by ordinary use, and one of them —
  three clicks making a namespace permanently unopenable with no export and no delete left on
  screen — was the worst defect in the build. Both reviews are summarised finding by finding in
  the [checklist](../workbench/apps/capability-development/app/CHECKLIST.md), including what each
  reviewer attacked and could not break.

- **Checks the reviews showed were missing, now present:** a property test asserting that whatever
  any command produces is something storage will accept, over every command and generated
  sequences of eight; and a jsdom test navigating between two records asserting the forms reset,
  verified to fail against the unfixed code. The reviewer's point stands as a lesson: 311 green
  tests coexisted with three serious defects because nothing saved a command's output and read it
  back, and nothing drove the interface.

- **Limitations that are true of this build, not caveats for form:** nobody has used it and no
  pilot has run, so no effectiveness claim is made and the counting convention's weights are
  untested. **Every citation is unverified** — no publisher host is reachable from the build
  environment, so all five methods' attributions are recorded as written down rather than checked,
  and the interface says so. **Neither repository has a licence**, so reuse rests on the owner's
  instruction rather than a grant. The data-minimisation check is one regex on one field and does
  not read free text. Campaign history is re-rendered under installed content, with a warning when
  the version differs. One visual presentation; the four worlds are not built.

- **Selection:** no knowledge manifest entry, no Observatory configuration and no workflow was
  changed. The new documents are not automatically selected knowledge, per START-HERE.md. One
  observation for the owner: `observstory.config.json`'s ignore list does not mention
  `node_modules/` or `dist/`. Both are git-ignored so a checkout never contains them, but a local
  Observatory run in a working tree would walk 217 packages. Not changed, because the producer is
  not available here and an unverifiable configuration change is worse than a flagged one.

- **Next useful action:** look at the running app — `cd workbench/apps/capability-development/app
  && npm ci && npm run dev` — and walk the leadership campaign far enough to reach the choosing
  step, which is where the product's central claim either holds or does not. Then decide the two
  things only the owner can: whether to license both repositories, and whether this app or Leader
  Me is the successor. The three product assumptions worth testing first, each with what would
  falsify it, are at the end of the
  [checklist](../workbench/apps/capability-development/app/CHECKLIST.md).

- **Branch:** `ccr-cda53478-1fik71`, pushed to origin. Nothing merged, and no pull request opened.
  Observed `main` at `c69f954` before this work; no current Observatory snapshot was available, so
  the repository was inspected directly.

## GitHub Pages preview setup — 12 November 2026

Owner requested deployment for review. Added a branch-scoped Pages workflow that runs npm ci and npm run verify before uploading only app/dist. Added app/DEPLOYMENT.md with source branch, expected URL, privacy boundaries and later promotion instructions. GitHub Pages was observed configured for GitHub Actions. This adds preview deployment, not a merge or effectiveness claim. See Actions for live build/deployment results.

## Skilling Me Softly redesign pass — 14 November 2026

- Authority: owner-supplied execution brief for one autonomous redesign run; owner named this repository. No merge, no deployment, no dependency or workflow change.
- Changed: branch `redesign/personal-shell` from `ccr-cda53478-1fik71` at d5efbbe. App shell, Home, short development flow, Practice, Repertoire, Settings and a personal SVG mobile. Detail, decisions and limitations: [redesign notes](../workbench/apps/capability-development/app/docs/redesign/README.md).
- Evidence (executed locally in the run): typecheck, lint, unit tests and production build passed; three browser suites passed against the built app in Chromium. Exact counts are in the run report and reproducible with the commands in the redesign notes.
- Not done: no CI run was observed for this branch (the verification workflow triggers only on the preview branch); the hosted Pages preview still shows the earlier build.
- Next: owner reviews the branch; if accepted, decide whether it replaces the preview branch, which is what triggers verification and Pages.
