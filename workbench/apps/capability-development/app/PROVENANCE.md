# Provenance and adaptation record

Date: 11 November 2026. This document states where the code in `app/` came from, on what basis
it was reused, and what was changed. It is a factual record, not a licence grant.

## Source

| Item | Value |
| --- | --- |
| Source repository | `blackmath88/leader-me` (private) |
| Source commit inspected and copied from | `55114f3b9de2214e835b9fd9bf005d861811c1d8` |
| How it was obtained | Shallow clone into a scratch directory during this session; read-only |
| Licence file in the source repository | **None.** No `LICENSE`, `LICENSE.md` or `COPYING` exists at that commit |
| Third-party vendored code in the source | None found. Its dependencies are declared in `package.json`, not vendored |

## Basis for reuse

The source repository has no licence file, so by default no reuse rights are granted to anybody.
Reuse here rests on one fact and nothing else: **both repositories belong to the same owner, and
that owner gave the instruction to use `blackmath88/leader-me` as the implementation starting
point for this derivative.** The copyright holder directing the derivation is the permission.

Consequences the owner should be aware of:

- This is not an open-source licence grant. If `app/` is ever published, distributed, or worked on
  by anybody outside the owner's control, **both repositories need an explicit licence first.**
  This repository is public, so the code is already readable by anybody; readable is not the same
  as licensed, and that gap is the owner's to close.
- No third-party code was copied. Every dependency is fetched from its own registry under its own
  licence; `npm ls` lists them.
- The original repository was **not modified**. It was cloned read-only outside this repository and
  nothing was written to it or pushed.

## What was carried over, and why

Carried over largely as written, because rewriting it would have been a regression risk for no
benefit. Each file names its origin in a header comment.

| This app | From Leader Me | What was kept, and what changed |
| --- | --- | --- |
| `src/storage/indexeddb.ts` | `src/storage/indexeddb.ts` | Kept the transaction, abort and conflict handling verbatim in intent — it is what guarantees a failed write is never reported as saved. Changed: database and channel names, user-facing messages, and `save` now returns a copy rather than the caller's object |
| `src/domain/validation.ts` | `src/domain/validation.ts` | Kept the `Reader` error-collecting pattern, the length and collection caps, and the drop-unknown-fields policy. The record set, the relationship checks and the privacy check on `attribution` are new |
| `src/storage/portability.ts` | `src/storage/portability.ts` | Kept the versioned-envelope approach and the separation of export-format, records, storage and appearance versions. Added conversion of Leader Me exports and a per-import summary with notes |
| `src/application/session.ts` | `src/state/journey.tsx` | Kept the save queue, the expected-revision check, the generation counter and the stale-tab handling. Changed: it is no longer a React provider, so a different presentation reimplements none of it |
| `src/domain/transitions.ts`, `src/domain/cascade.ts` | `src/domain/quest.ts` | Kept the transition-table shape and the cascade approach. The states, records and cascades are this application's |
| `src/domain/evidence.ts` | `src/domain/progression.ts` | Kept the "derive from records, explain in words" approach, the context normalisation and the three-quests-two-contexts threshold. The four milestone names are retained as a second view (`legacyMilestoneFor`) so a converted record keeps the meaning it had |
| `src/ui/styles/app.css` | `src/styles/app.css` | Kept the token structure and the white-canvas, sans-serif direction, which `../VISUAL-DIRECTIONS.md` asks not to undo silently. Palette and layout adjusted |
| `src/ui/primitives.tsx` | `src/components/ui.tsx` | Kept `useSave` (only report "saved" when a save actually resolved) and `ConfirmButton`. `Field` is new and associates its label with its control |
| `src/content/leadership/capabilities.ts` | `src/content/skills.ts` | **Capability ids are unchanged on purpose**, so a converted Leader Me export still refers to something. Wording extended; a `limits` field added to each |
| `src/content/leadership/methods.ts` | `src/content/methods.ts` | Two method ids and the CCL source carried over. Explanations rewritten; a third method added; citations now carry their verification state |

## What was deliberately not carried over

| Not carried over | Reason |
| --- | --- |
| `src/avatar/**` and the `zdog` dependency (about 1,200 lines) | `../CONCEPT.md` §5 says avatar redesign must not be the critical path, and `../VISUAL-DIRECTIONS.md` treats choosing a visual world as separate design work that has not happened. A 3-D renderer would have been the largest single piece of this build and would have prejudged that decision. Replaced by a CSS-only emblem fed a narrow display model (`derivePresentationModel`) |
| TanStack Start and TanStack Router | This application has no server, no data loading and nine screens. A server framework for a local-first app is moving parts with nothing to do. Replaced by Vite and a 90-line hash router |
| Profile claims, Gallup themes and values | Personality-adjacent standing statements about a person. This application records explanations under test against a situation instead. A Leader Me import says in its notes that these were not imported, rather than dropping them silently |
| The `Quest` record and the four-skill-group constraint | Migrated into richer practice-activity semantics with an explicit rehearsal/real distinction |
| The demo records | Written fresh, because this application's record set is different. The new demo is also deliberately an uncomfortable shape rather than a success story |

## Verification of this record

- The source commit was read at `/home/user/leader-me` in this session. The absence of a licence
  file was checked by listing the repository root.
- Every file listed above carries a header comment naming its origin, so the table can be checked
  against the code rather than trusted.
- No statement here was taken from the source repository's documentation; the comparison is
  against the code at that commit.
