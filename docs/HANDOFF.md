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

## Skills in the Wild — 12 November 2026

- Learned: current main contains the three-space structure and existing app proposals. Direct GitHub inspection used; no current Observatory artifact reviewed. App code belongs in a separate repository.
- Changed: added [campaign concept](../workbench/apps/skills-in-the-wild/CONCEPT.md), [AI edition/scenarios](../workbench/apps/skills-in-the-wild/AI-SKILLS-IN-THE-WILD.md) and [adoption/build handoff](../workbench/apps/skills-in-the-wild/BUILD-HANDOFF.md); linked from app index.
- Agreed by owner in discussion: Skills in the Wild name/tagline, wilderness theme, campaign introduction plus practical transfer and customised skill scenarios.
- Proposed: separate static app scaffold with selective Guerrilla reuse; first complete synthetic AI mission. No full fork or app implementation decision claimed.
- Evidence: discussion and current repository sources; Guerrilla inspected at 87ce5a542e9fa3ee9454cf87e9bb73fa861dd060. No root licence found in inspected tree; clarify reuse/licensing before porting. No effectiveness claims validated.
- Checks: new concept documents' relative links resolved against the current repository tree plus new files. Documentation-only; no app build or tests executed. Prior test results above are historical.
- Boundaries: no private cases imported, no knowledge-manifest changes, agent launch, fork, runtime implementation, deployment or pilot.
- Next: assign a separate app repository and commission the bounded first-build brief; review one complete mission before expanding.

## Hosted app preview — 12 November 2026

Owner requested GitHub Pages deployment. The app is live at https://blackmath88.github.io/skill-management-community/ from preview branch ccr-cda53478-1fik71; no application merge occurred. The deployment workflow is owned by main and preserves the main-only Pages environment rule. The separate preview verification workflow triggers deployment of the exact successful source commit; build jobs have read-only permissions and only the deploy job has Pages/OIDC write permissions.

Observed successful deployment: https://github.com/blackmath88/skill-management-community/actions/runs/43178075887 (app source 3930a088f3a8e7020011d5673bf9242c171c880c). Fresh CI passed typecheck, lint, 327 tests and production build. Browser smoke check confirmed home, campaign hash navigation and refresh; no application-origin console errors observed. Full browser journeys were not rerun. npm ci reported 10 moderate advisories, not yet triaged. The prototype remains unsuitable for sensitive data; browser-local storage is not an encrypted backup and GitHub Pages paths share an origin.
