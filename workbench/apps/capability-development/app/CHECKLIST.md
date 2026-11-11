# Implementation checklist

A persistent record of what is implemented, verified, deferred and blocked, so work can resume
accurately after context loss. Updated 11 November 2026.

**Legend.** ✅ implemented **and** verified by a named check · 🟡 implemented, not independently
verified · ⬜ deferred, with the reason · 🚫 blocked, with the blocker.

Resuming: read [DECISIONS.md](DECISIONS.md) first (A1 explains why this app exists separately),
then [PROVENANCE.md](PROVENANCE.md), then this file. Run `npm ci && npm run verify` to confirm the
baseline before changing anything.

## Scope the mandate asked for

| Item | State | Where | Verified by |
| --- | --- | --- | --- |
| Leadership content and a complete campaign | ✅ | `src/content/leadership/` | `content/integrity.test.ts`, browser journey A |
| Collaboration content, a genuinely different mechanism | ✅ | `src/content/collaboration/pack.ts` | `content/integrity.test.ts` (properties run over every installed pack) |
| Contextual branches | ✅ | `campaign-next-decision.ts`, `collaboration/pack.ts` | integrity test: all three routes appear in every campaign; no step traps a user |
| Structural-barrier branches | ✅ | the `conditions` route and `ConstraintKind` | integrity test: every campaign has a conditions choice and a no-opportunity path; browser journey B |
| Rehearsal versus real-world attempts | ✅ | `ActivityKind`, `isRehearsal`, every label | `evidence.test.ts` ("never lets a rehearsal reach a stage that means real application"), `experience.test.ts`, property test, `ai/evaluation.test.ts` case 6, browser journey A |
| Evidence-linked progression | ✅ | `domain/evidence.ts`, `domain/experience.ts` | 43 tests including six property-based invariants |
| Persistence | ✅ | `storage/memory.ts`, `storage/indexeddb.ts`, `application/session.ts` | 32 storage and session tests, including conflict and stale-tab cases |
| Import and export | ✅ | `storage/portability.ts`, `storage/legacy.ts` | 24 tests; a newer file is refused, a Leader Me file is converted and upgrades nothing |
| Optional AI through a deterministic fake provider | ✅ | `src/ai/` | 41 tests, including the seven synthetic evaluation cases PLAN.md §7 names |
| A minimal usable presentation | ✅ | `src/ui/` | browser journeys A and B, 63 checks |
| One presentation only, with a clean boundary | ✅ | `application/queries.ts`, `derivePresentationModel` | the renderer model carries counts only, no journal text |
| Dependencies and commands inside `app/` | ✅ | `app/package.json` | `npm ci` from a clean `node_modules`; one stated exception, DECISIONS A12 |

## Architectural boundaries

| Boundary | State | Note |
| --- | --- | --- |
| Domain owns records, invariants, transitions, projections | ✅ | No file in `src/domain/` imports React, storage or content |
| Application owns commands, references, revisions | ✅ | `src/application/commands.ts`; the session is the only writer |
| Storage owns snapshots, migrations, import/export | ✅ | One `RecordStore` interface, two implementations, one stated copy contract |
| Content is data with versions and sources | ✅ | No executable content; a campaign pins its definition version |
| AI is an adapter that cannot write | ✅ | DECISIONS A6: projections do not read proposals at all |
| Presentation receives projections, not rules | ✅ | No domain rule is recomputed in `src/ui/` |

## Verification actually run

| Check | Command | Result |
| --- | --- | --- |
| Clean install | `npm ci` | succeeded, 217 packages |
| Type checking | `npm run typecheck` | clean |
| Linting | `npm run lint` | clean |
| Unit / property / integration | `npm run test` | 295 passed, 17 files, 0 failed, 0 skipped |
| Production build | `npm run build` | succeeded, 456 kB JS (133 kB gzipped) |
| Browser journeys | `npm run test:browser` | 63 of 63 checks passed |
| Independent review | two reviewers, domain integrity and privacy, and engineering correctness | see the handoff for findings and what was done about each |

## Defects found by the tests and fixed

Recorded because each one is a class of mistake worth watching for again.

1. The campaign step's activity form kept the previous step's title and plan — React reused the
   component in the same tree position. Saving the real attempt recorded an activity that described
   the rehearsal. Fixed by keying on step id. **A wrong record, not a cosmetic bug.**
2. `Field` rendered a `<label>` with no `for`, so no label was associated with its control.
   Fixed with a generated id and `aria-describedby`. Found because the browser test could not find
   a field by its label — which is exactly what a screen reader could not do either.
3. The Leader Me converter emitted a review for a quest that was never attempted, which its own
   validator rejects. Because an import is all-or-nothing, one stray record cost the person every
   other record in the file. Now dropped with a note.
4. The rehearsal panel indexed replies past the first authored line. One pack worked around it by
   duplicating the opening and the other did not, so a counterpart silently never raised its
   strongest objection. Fixed, and the contract now says which convention to follow.
5. The IndexedDB store returned the caller's own object from `save` while the memory store cloned.
   `RecordStore` now states the copy guarantee and both keep it.
6. The summary re-offered a campaign on a situation already covered. Changed so finishing means
   finished — DECISIONS A10.

## Deferred, with reasons

| Item | Why |
| --- | --- |
| ⬜ A live AI provider | The mandate forbids paid inference and credentials. DECISIONS A5 lists what it would need first |
| ⬜ The four visual worlds | Choosing one is design work that has not happened; `../VISUAL-DIRECTIONS.md` describes it. Doing it now would prejudge the decision |
| ⬜ The zdog 3-D character | `../CONCEPT.md` §5 keeps avatar redesign off the critical path. Replaced by a CSS emblem; PROVENANCE explains |
| ⬜ A second presentation client | The boundary exists and is tested, but no second client is built. `../PLAN.md` §8 wants one at pilot stage |
| ⬜ Share-package delivery | Deliberate: a package is text the person copies out. Delivery infrastructure is a separate decision about who sees what |
| ⬜ xAPI export, SSO, multi-tenant server, marketplace, content editor | `../PLAN.md` §12 defers all of these |
| ⬜ A screen-reader pass and a contrast audit | Needs a real assistive technology and a person; the basics are in place and tested |
| ⬜ Promptfoo, fast-check model-based tests, XState | `fast-check` is adopted for property tests. The others need a reason; `../PRIOR-ART.md` §4 sets the gate |
| ⬜ A formative pilot | `../PLAN.md` §8 proposes one; it is not scheduled or authorised |

## Blocked

| Item | Blocker | What would unblock it |
| --- | --- | --- |
| 🚫 Verifying any citation | No publisher host is reachable from this environment's network policy. Checked: `hbr.org`, `onlinelibrary.wiley.com`, `www.tandfonline.com`, `www.ccl.org` all fail to resolve | Network access to those hosts, or a person checking the five methods' sources against the publishers. Every citation carries `retrieved: false` until then — DECISIONS A7 |
| 🚫 A licence for this code | The predecessor repository has no licence file, so reuse rests on the owner's instruction rather than a grant | The owner adding a licence to both repositories. Needed before anybody outside the owner's control works on `app/` — PROVENANCE |

## The next three product assumptions to test

In the order that would be most useful, and each with what would falsify it.

1. **That somebody takes a conditions branch when it is the honest answer.** The design assumes
   people will choose "ask whoever can settle it" over "practise asking better" when their own
   record says nobody present can decide. Falsified if people reliably pick personal practice
   anyway — which would mean the branch labels, not the routing, are doing the work.
2. **That the rehearsal/real distinction survives contact with a user.** The code keeps them apart
   rigorously. Falsified if people describe their rehearsals as things they did, or read
   "rehearsed" as progress towards a rating.
3. **That the two projections are not read as one score.** The screen shows what the records
   contain and a counting convention side by side with their rules. Falsified if people quote the
   practice-experience number as how good they are, which would mean the number should be smaller,
   later, or absent.
