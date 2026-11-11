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
| Browser journeys | `npm run test:browser` | 79 of 79 checks passed, three journeys |
| Independent review (domain integrity and privacy) | a reviewer with no part in writing the code, against CONCEPT §§4,5,7,9,10 and ARCHITECTURE §§6,10 | **17 findings, 2 high. All 13 material ones fixed**; the rest recorded as decisions A13 and A14. 13 claims checked and confirmed with their enforcement point |
| Independent review (engineering correctness) | a second reviewer attacking concurrency, revisions, import, projections and UI state, with runnable probes | **11 findings, 2 high, every one proven with a probe. All fixed**, and the two guards it identified as the suite's blind spot were added |

## What the independent reviewer found, and what was done

Thirteen of seventeen findings were material and are fixed. Two were high severity because each
made the application tell a user something untrue.

| # | Finding | Severity | Resolution |
| --- | --- | --- | --- |
| 1 | A hypothesis marked "evidence supports it" kept saying so after its only evidence was deleted. Four clicks in the demo reached it | high | `deleteEvidenceCascade` reopens a conclusion that rested on deleted evidence alone, keeping the earlier view in the history. Four tests |
| 2 | The privacy statement claimed information about other people is "kept to a role, never a name". The check is one regex on one field, blocking emails and long digit strings, not names | high | The statement now says exactly what the check does and does not do, in those words. The README limitation was corrected too |
| 3 | "Anything here can be deleted" was untrue for four of six record types | medium | Delete controls for explanations, strengths, suggestions and share packages; `deleteHypothesis` and `deleteProposal` added |
| 4 | A perk survived with zero examples while the delete dialog promised the opposite | medium | The cascade removes a perk that loses its last example, matching the invariant `confirmPerk` enforces on creation |
| 5 | The sparring partner's record checkboxes were pre-ticked under a hint saying nothing is included unless you tick it | medium | They start unticked; sending is disabled until something is selected |
| 6 | The footer asserted "makes no network request" unconditionally while Settings derived it from the provider | medium | Both read `sendsDataOffDevice` |
| 7 | A rehearsal reached the legacy milestone "Practising", which in the predecessor meant a real attempted action | medium | Maps to Exploring. This was the only route by which a rehearsal reached a word implying real application |
| 8 | A Leader Me feedback note became "an account from somebody else" and earned the feedback credit | medium | Imported as the person's own observation, with a note saying the predecessor never recorded who it came from |
| 9 | A campaign pinned its definition version but nothing preserved the definition | medium | The screen says when the installed version differs. The remaining limitation is decision A14 |
| 10 | The Progress page told users to write an exploration; no such feature existed, so the stage was unreachable | medium | Applying a method to a situation in writing, on the situation page |
| 11 | Conversion carried the predecessor's method ids into validation, so one unresolvable id refused a person's entire history | medium | Unknown references dropped with a note; the records are kept |
| 12 | The home screen counted rehearsals that were never attempted alongside real attempts that were | low | Counts attempted rehearsals |
| 13 | "Show exactly what would be sent" omitted the request metadata | low | The preview lists it |
| 14 | The presentation modes promised a character and a journey view that are not built | low | The labels say what the setting does |
| 15 | The situation-delete warning omitted the explanations it removes | low | Listed |
| 16 | A stale suggestion was shown as "Refused" with an empty reason list | low | Distinguished, with its own reason |
| 17 | The three routes are recorded and displayed but reach neither projection | observation | Not changed. Recorded as decision A13, with what would change it |

The reviewer also confirmed thirteen claims it tried and failed to break, each with the code that
enforces it: the rehearsal/real separation through the ladder and the credit rules, the six ways
practice experience resists inflation, the absence of any score or streak, deletion leaving no
dangling contributor, no conditions finding routed into personal training, nothing leaving the
device, the preview being the request, share packages copying and transmitting nothing, the
browser-storage statement, the renderer boundary, a campaign always being stoppable, every number
being traceable to records and a policy version, and AI being unable to write, award or assess.

## What the engineering reviewer found, and what was done

Every finding came with a runnable probe. Both high-severity ones were reachable by ordinary use.

| # | Finding | Severity | Resolution |
| --- | --- | --- | --- |
| 1 | `save` did not validate while `load` refused anything invalid, so three clicks — record an attempt, pause, resume — made a namespace permanently unopenable, with no export and no delete reachable from the error screen. A pasted over-long note did the same | high | Both stores now validate before writing and reject (decision A15). The specific gaps are closed as well: an activity with an attempt cannot return to planned, and `decideHypothesis` applies the cap validation enforces |
| 2 | Pages were not remounted on a route change, so one record's form state was written onto another: activity 2's review form arrived holding activity 1's review, and one click stored it there. Four variants, including the exploration form added hours earlier | high | `key={route.id}` on both record pages. The same mistake had already been fixed inside `Campaign.tsx`; this was the route-level half |
| 3 | `saveReview` set the state directly instead of consulting the transition table, reviving abandoned activities and crediting them | medium | It goes through the table; `recordAttempt` does too, and the table now says what it means |
| 4 | Switching namespace while the first load was still running left the cross-tab watcher on the wrong namespace: a false staleness alarm blocked every save, and real changes went unnoticed | medium | The watcher attaches before the await and only reports for the namespace on screen |
| 5 | `run()` reported `ok: true` for a write into a namespace the caller had switched away from, so the interface said "Saved" and navigated to a record not in view | medium | It reports the truth, naming where the write landed |
| 6 | A Leader Me quest marked completed with no attempt became an activity no command could move: the home screen asked for a review for ever, and both the review and the attempt were refused | medium | Imported as planned, with a note |
| 7 | Reflections dropped because their quest was dropped vanished while the summary said every record had a direct equivalent | medium | Every drop is counted and reported |
| 8 | A perk whose every example was dropped imported with no examples — the exact claim `confirmPerk` refuses to create | medium | Dropped, with a note |
| 9 | Validation permitted campaign shapes the commands assumed impossible, so a branch choice could be recorded nowhere | low | Validation requires the current step to be the end of the path |
| 10 | An unreadable Leader Me file was offered as a valid import that would replace everything | low | Refused, as the native format already was |
| 11 | Ticking a capability on evidence attached to an activity was accepted and then ignored | low | Counted, without double counting what the activity already claims |

Also addressed from its notes: the session is disposed when the provider unmounts, and the
reopened-conclusion count compares by id rather than by position.

The reviewer separately confirmed what it attacked and could not break: old-generation results
mutating session state, `deleteAll`/`reload` racing a command, overwriting newer records from a
stale snapshot, a failed save reported as saved at the store level, revision monotonicity across
`clear()`, 24 hostile import files including prototype-pollution attempts and a 9 MB file, and
every dangling-reference path through the projections.

**The blind spot it named, now closed.** 311 green tests coexisted with findings 1, 2 and 3,
because nothing saved a command's output and read it back, and nothing drove the interface. Both
guards now exist: `src/application/invariants.test.ts` asserts that whatever any command produces
validates — for every command against every starting point, and for generated sequences of up to
eight — and `src/ui/navigation.test.tsx` navigates between two records and asserts the forms
reset. The navigation guard was checked against the unfixed code: four of its five tests fail
without the keys.

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
