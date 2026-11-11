# Decisions for the capability-development application

Decisions taken while implementing `app/`. Each one records what was decided, why, what it
supersedes and what would change it. A decision here is an engineering or product decision taken
under the implementation mandate; it is not approval of anything the mandate did not cover.

Status values: **agreed** (taken and acted on), **proposed** (written down, not acted on),
**superseded**.

---

## A1 — A separately runnable derivative, not an in-place evolution of Leader Me (agreed)

**Supersedes** [`../ARCHITECTURE.md`](../ARCHITECTURE.md) §1 and §3, which assume one application
package evolved in the Leader Me repository, and [`../PLAN.md`](../PLAN.md) §1, which says to
implement in the application repository.

**Decision.** The application is built at `workbench/apps/capability-development/app/` in this
repository, as a separately runnable derivative of `blackmath88/leader-me` at commit `55114f3b`.
Useful implementation and design are retained rather than rebuilt or copied wholesale; see
[PROVENANCE.md](PROVENANCE.md) for what was kept, what was not, and why.

**Reason.** The owner's instruction named this location. It also has two engineering
consequences worth stating: the original repository is untouched, so nothing here can break it;
and the record set, the content contract and the AI boundary could be designed for what they now
have to do, rather than migrated field by field from a model that predates them.

**What it costs.** The two codebases will drift. Leader Me's own history is not in this repository,
so `git log` on these files starts here. A fix made in one does not reach the other.

**What would change it.** A decision to make one of the two the successor. If that is this app,
Leader Me needs a pointer to it; if it is Leader Me, this becomes a prototype and should be said
to be one.

---

## A2 — Vite and React, without TanStack Start or a routing library (agreed)

**Supersedes** [`../ARCHITECTURE.md`](../ARCHITECTURE.md) §1, which says to keep the existing
framework and lockfile until a compatibility check gives a reason to change.

**Decision.** Vite, React 19, strict TypeScript, Vitest. No server framework and no routing
library; a 90-line hash router lives in `src/ui/router.ts`.

**Reason.** Every record stays in the browser, so there is nothing for a server runtime to do, and
a server that does nothing is still a thing to configure, secure and keep current. Nine screens
with no nested layouts and no data loading do not need a router library. The built app opens from
a file path as well as from a server, which makes the browser test simple and honest.

**What it costs.** Deep linking is hash-based. If nested layouts or route-level data loading ever
matter, `router.ts` is the one file to replace.

---

## A3 — Practice experience convention v1, explicitly versioned (agreed)

**Decision.** `src/domain/experience.ts` holds policy v1: an attempted observation or rehearsal
counts 1, a real attempt counts 2, a review offering a competing explanation adds 1, an account
from somebody else adds 1. An absent opportunity earns nothing for the attempt and 1 for reviewing
why. Credit is counted **once per activity**, never per capability tag. The policy version is
displayed next to every total, and `policyForVersion` keeps older versions readable.

**Reason.** [`../CONCEPT.md`](../CONCEPT.md) §7 requires a versioned convention whose weights are
proposed until tested, and forbids credit for opening the app, text length, duplicate saves or
claiming success. Counting per activity rather than per tag is what makes ticking more capability
boxes worthless.

**Status of the numbers.** The weights are a prototype. They have not been tested with anybody and
are expected to change. The property tests in `experience.test.ts` pin the *invariants* (never
negative, order-independent, a rehearsal never beats a real attempt, adding a tag never adds
credit, deleting never adds credit) rather than the numbers, so the numbers can change without
weakening the guarantees.

---

## A4 — A chosen appearance is retained when evidence is deleted (agreed)

**Decision.** Deleting evidence removes the evidence and every claim derived from it, and leaves
the appearance the person chose exactly as they set it. `APPEARANCE_RETENTION` and
`appearanceSurvivesEvidenceDeletion()` in `src/domain/experience.ts` make this a named policy
rather than a side effect of which cascade happened to touch the profile, and a test pins it.

**Reason.** [`../CONCEPT.md`](../CONCEPT.md) §7 asks for this to be decided and tested explicitly.
An appearance is a cosmetic choice, not a claim, so recomputing it would be taking away something
the person chose on the basis of records that have nothing to do with it. The separate half of the
decision matters more: the claim always goes.

**What makes it safe.** Nothing cosmetic is ever presented as evidence. `APPEARANCE_DISCLAIMER` is
shown verbatim wherever appearance is set or displayed, and no appearance unlocks from a record.

---

## A5 — A deterministic local stand-in is the only AI provider in this build (agreed)

**Decision.** `src/ai/fake-provider.ts` returns fixed question templates selected by the shape of
the request. It is not a language model, makes no network request, and is labelled as a stand-in
everywhere it appears. A live provider would be a separate adapter behind the same `AiProvider`
port and is **not** implemented.

**Reason.** The mandate forbids enabling paid inference or adding credentials, and
[`../PLAN.md`](../PLAN.md) §7 asks for the provider contract and a deterministic adapter first.
Determinism is also what makes the evaluation cases in `src/ai/evaluation.test.ts` mean anything.

**What a live provider would need first**, none of which exists: a protected endpoint owned by the
application, credentials held outside client code, rate limits, a retention review, a privacy
statement updated to match the actual data flow, and its own evaluation harness. The guard rules
in `src/ai/guards.ts` are pattern checks and are necessarily incomplete; they are not the
safeguard that matters, which is structural — see A6.

---

## A6 — AI output can never reach progression, by construction (agreed)

**Decision.** Practice experience and capability evidence are derived from activities, attempts,
reviews and evidence items only. No provider response is an input to either. A proposal is a
separate record; accepting one runs the ordinary command for that record with the user as author.

**Reason.** A guard that greps for "I awarded you 20 points" can be worded around. A projection
that does not read proposals at all cannot. `src/ai/evaluation.test.ts` asserts the total does not
move under any of the stand-in's seven misbehaviours.

---

## A7 — Citations carry their verification state, and none in this build is verified (agreed)

**Decision.** `SourceRef` in `src/content/types.ts` requires `retrieved: boolean` and a
`verificationNote`, and `citedOn` replaces an `accessedOn` field that would have implied access.
Every citation in this build carries `retrieved: false`, and the Methods page shows a banner
counting them.

**Reason.** No publisher host — `hbr.org`, `onlinelibrary.wiley.com`, `www.tandfonline.com`,
`www.ccl.org` — is reachable from the build environment's network policy. This was checked, not
assumed. Recording a citation as accessed would have been invented verification, which this
project's own rules forbid. Making the field required means a future citation cannot be added
without declaring its state.

**What this means for the content.** The titles, authors and attributed claims behind the three
leadership methods and two collaboration methods are **unverified**. They must be checked against
the publishers before this content is used anywhere outside this repository.

---

## A8 — Leader Me exports are converted on import, and no record is upgraded (agreed)

**Decision.** `src/storage/legacy.ts` converts a Leader Me export (its format versions 1 and 2).
A quest becomes a real-attempt activity; a reflection becomes a review; a concept application
becomes a written exploration. The plan's `cue` is left empty because Leader Me had no cue field,
and `assistance` is recorded as `app-prompts` rather than `none` because the predecessor never
captured it. Profile claims, Gallup themes, values and a saved appearance are not imported, and
the import summary says so for each.

**Reason.** [`../ARCHITECTURE.md`](../ARCHITECTURE.md) §9 requires old exports to load. The harder
requirement is that conversion must not create a record that claims more than the original did,
which is why each gap stays a gap and is reported.

---

## A9 — One campaign and one direction are active at a time (agreed)

**Decision.** Starting a campaign pauses whichever one was active; creating a direction pauses the
previous one. Neither is deleted.

**Reason.** The home screen's job is to answer "what would be useful next?" with one answer. Two
active campaigns make that question meaningless. Pausing rather than deleting keeps everything the
person wrote.

**What it costs.** Somebody genuinely running two campaigns has to switch between them. If that
turns out to be a real need, the constraint is in `startCampaign` and `createDirection` only.

---

## A10 — Finishing is allowed to mean finished (agreed)

**Decision.** `deriveDevelopmentSummary` offers to start a campaign only on a situation that has
never had one. When everything is done it says nothing is waiting, and that not coming back is a
reasonable choice.

**Reason.** This surfaced from a failing test. Re-offering a campaign on ground already covered
would be inventing work to bring somebody back — the thing [`../CONCEPT.md`](../CONCEPT.md) §6
says not to optimise for. There is no streak, no daily goal and no visit count anywhere.

---

## A11 — Two content packs stay installed (agreed)

**Decision.** Leadership and collaboration are both installed. The collaboration pack's handover
campaign turns on shared routines and received quality rather than individual persuasion.

**Reason.** [`../CONCEPT.md`](../CONCEPT.md) §2 wants a second domain to test reuse. A second pack
with a genuinely different mechanism is the cheapest available check that nothing in the code
assumes leadership. `src/content/integrity.test.ts` runs its properties over every installed pack
rather than over today's two, so a third is checked automatically.

---

## A12 — Dependencies and commands stay inside `app/` (agreed)

**Decision.** `app/` has its own `package.json`, lockfile, `node_modules` and `.gitignore`. No
root configuration was changed.

**One exception, stated explicitly.** The browser test resolves `playwright` from the environment
rather than declaring it as a project dependency, because this container ships Chromium with a
matching Playwright and installing a second copy would not find that browser. The script resolves
it three ways and, if none works, says so and exits non-zero rather than reporting a pass it did
not run. `npm test` does not depend on it. Elsewhere, `npm run test:browser` needs Playwright and
its Chromium installed first.

---

## A13 — The three routes are recorded and shown, but not weighted (agreed)

**Decision.** Every activity carries a route — your own practice, shared practice, conditions —
and it is shown wherever the activity is. Neither projection reads it: asking a sponsor earns the
same credit as practising a question yourself, and raises the same capability evidence.

**Reason.** An independent review raised this as a silent default, and it is better as a stated
one. Crediting the routes differently would mean deciding which kind of work is worth more. The
person did really do the thing either way, and this application is not in a position to say that
clarifying a mandate is worth less than rehearsing a sentence — nor more. Weighting them would
also give somebody a reason to label work as whichever route scores higher, which is exactly the
reward-chasing [`../PLAN.md`](../PLAN.md) §11 says to watch for.

**What it costs.** The distinction the concept treats as central is absent from every number.
Somebody reading only the Progress page cannot see how much of their practice was personal and
how much was asking other people.

**What would change it.** A pilot finding that people cannot tell the two apart from their own
records. The cheaper answer first would be a breakdown by route on the Progress page — showing
the split without weighting it.

---

## A14 — A campaign shows the installed content and says when it has changed (agreed)

**Decision.** A campaign pins the definition id and version it started on. It does not store a
copy of the authored steps. When the installed version differs from the pinned one, the campaign
screen says so, in terms: the step text and options come from the installed version and may not be
the words the person was shown.

**Reason.** An independent review pointed out that pinning a version number is not preserving a
definition: with version 2 installed, a running campaign would re-render under the new text while
labelled "content version 1". Storing a snapshot of every campaign definition in every person's
records is the thorough fix and a significant change to the record format. Saying plainly that the
text may have moved costs a paragraph and removes the false impression, which is the part that
actually harms somebody.

**The limitation that remains.** History is still re-rendered under current content. "The path you
took" resolves historical step ids against the installed pack, so a step that was reworded shows
its new wording, and a branch removed in a later version shows as a raw id. The person's own
records — what they wrote, planned, attempted and reviewed — are untouched either way.

**What would change it.** Editing a published pack rather than adding a new one. At that point the
campaign should carry a snapshot of the steps it used.
