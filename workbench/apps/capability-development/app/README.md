# Skilling Me Softly

A local-first capability-development application. You choose a direction or start from a situation
you are actually in, work through a bounded campaign, rehearse, try something for real, review what
happened, and see what your own records do and do not show.

Everything you enter stays in this browser. There is no account, no server and no analytics, and the
app makes no network request of its own. The only links that leave the device are the source
citations on the Methods page, which go to a publisher if you click one, in a new tab and with no
referrer; nothing about your records travels with them.

Status: **a working first implementation.** It has not been used by anybody, it has not been
piloted, and nothing in it has been shown to improve anybody's practice. See
[Limitations](#limitations).

- [Concept](../CONCEPT.md) · [Architecture](../ARCHITECTURE.md) · [Plan](../PLAN.md) · [Prior art](../PRIOR-ART.md) · [Visual directions](../VISUAL-DIRECTIONS.md)
- [Decisions taken while building this](DECISIONS.md) · [Provenance and adaptation](PROVENANCE.md) · [Implementation checklist](CHECKLIST.md)

## Setup and run

Requires Node 22.12 or newer. Every command runs from this directory (`app/`).

```bash
cd workbench/apps/capability-development/app
npm ci                  # installs from the lockfile; use `npm install` only to change dependencies
npm run dev             # development server on http://localhost:5180
```

Then open <http://localhost:5180>. The first screen asks what would be useful next; there is no
profile to complete first. Switch to **Fictional demo** in the header to look at invented records
without touching your own.

```bash
npm run build           # production build into dist/
npm run preview         # serve the production build on http://localhost:4173
```

## Checks

```bash
npm run typecheck       # tsc --noEmit
npm run lint            # eslint
npm run test            # vitest: unit, property, application, storage, content and AI tests
npm run verify          # typecheck + lint + test + build
npm run test:browser    # the two end-to-end journeys, against the production build
```

`npm run test:browser` needs a build first (`npm run build`) and needs Playwright with its
Chromium available. It resolves Playwright from the environment rather than declaring it as a
dependency — see [DECISIONS.md A12](DECISIONS.md) for why — and if it cannot find it, it says so
and exits non-zero rather than reporting a pass it did not run.

### What the checks actually covered, when last run

| Check | Command | Result |
| --- | --- | --- |
| Type checking | `npm run typecheck` | clean, no errors |
| Linting | `npm run lint` | clean, no errors |
| Unit, property, integration | `npm run test` | **295 passed**, 17 files, 0 failed, 0 skipped |
| Production build | `npm run build` | succeeded; 456 kB JS (133 kB gzipped), 8.8 kB CSS |
| Browser journeys | `npm run test:browser` | **63 of 63 checks passed** |
| Clean install | `npm ci` | succeeded from the lockfile, 217 packages |

Test counts by area: domain 93 (including six property-based invariants over generated record
sets), application 56, storage 41, content 38, AI boundary 41, plus the browser journeys.

Passing tests demonstrate specified software behaviour. They say nothing about psychological
validity or whether anybody learns anything.

## What the browser test walks through

`tests/browser/journey.mjs` drives the real production build in Chromium against real IndexedDB.

**Journey A — the complete loop.** Describe a situation; start the campaign; see that competing
explanations are offered rather than one diagnosis; keep one explicitly; reach the choosing step
and see that only one of its four branches is personal practice; rehearse against the scripted
counterpart; plan the real attempt; record a partial outcome ("nobody could name who approves, so
the group agreed to ask the sponsor"); review it with a competing explanation; and check that
practice experience moved by exactly the documented amount and that the rehearsal is still
recorded as a rehearsal. Then reload, and check the records are still there.

**Journey B — where clarifying a mandate is the right move.** The same opening, but the person
takes the conditions branch. The step says in plain words that this is not a training activity and
that no amount of personal practice would have produced the decision. The request is sent, nothing
comes back, and that is recorded as an outcome: nothing is credited for the attempt, 1 is credited
for reviewing why, no capability claims to have been practised, and the campaign can be stopped
without that reading as a failure.

It also checks accessibility basics: a skip link, a declared language, one level-1 heading, a
focusable main region, and a keyboard-operable records/demo switch.

## How it is put together

```
src/domain/        pure records, legal transitions, cue-linked plans, deletion cascades,
                   validation, and the three projections
src/content/       authored packs (capabilities, methods, branching campaigns) and the registry
src/application/   named commands, and the session that owns the save queue
src/storage/       RecordStore (in-memory and IndexedDB), export/import, Leader Me conversion
src/ai/            provider port, deterministic local stand-in, proposal guards
src/ui/            one React presentation. Replaceable without touching anything above it
```

The boundary that matters: the presentation receives **projections**, never the record set plus a
licence to recompute the rules. A second presentation would replace `src/ui/` and reimplement
nothing — not the save queue, not the progression rules, not the privacy rules. `src/ui/` is one
presentation, not a theme system; choosing a visual world is separate design work that has not
happened, and [../VISUAL-DIRECTIONS.md](../VISUAL-DIRECTIONS.md) describes it.

### Three things the code is built to keep apart

**A rehearsal is not something you did at work.** An activity is an observation, a rehearsal or a
real attempt, and the distinction runs through the evidence ladder, the counting convention, every
label and the storage format. No import, no conversion and no AI response can turn one into the
other.

**What your records show is not a score.** `deriveCapabilityEvidence` describes what is
documented — explored, rehearsed, tried, repeated, tried in more than one setting — and says what
would be recorded next. `derivePracticeExperience` applies an explicit, versioned counting
convention. Both are on one screen with their rules visible, because the risk this product has to
manage is somebody reading a number as a measure of their ability.

**A problem with the conditions is not a personal training need.** Every activity carries a route:
your own practice, shared practice, or conditions. The leadership campaign has four branches out of
its choosing step and only one is personal practice; two end in asking somebody with the authority,
and one ends because the opportunity is not there. Those are presented as complete answers.

## The optional sparring partner

Off by default in the sense that nothing happens until you open it. It is a **local stand-in**: a
fixed set of question templates selected by the shape of the request. It is not a language model,
it makes no network request, and nothing you give it leaves the device.

The sequence is: tick which records to include → see exactly what would be sent → send → read what
came back → keep, edit or reject each suggestion. What the preview shows is the request; there is
no second code path that could send more.

It can offer questions, competing explanations and a scripted counterpart's line. It cannot record
anything, award anything, confirm a strength, say who you are, or declare a structural problem
solved. Pattern checks refuse responses that try, and refused suggestions are shown with the
reason rather than hidden. Those checks are necessarily incomplete; the guarantee that matters is
structural — progression is derived from activities, attempts and reviews, so no provider response
is an input to it at all.

A live provider is **not** implemented. See [DECISIONS.md A5](DECISIONS.md) for what one would
need first.

## Your records

Stored in this browser with IndexedDB, under two separate namespaces: your own records and the
fictional demo. That is separation inside one browser — it is not access control, and it is not
tenant isolation.

- **Export** writes a plain JSON file holding every record in the current namespace.
- **Import** replaces every record in the namespace at once, after showing you what the file
  contains. Never a partial merge: half-applied records could not be explained.
- A **Leader Me export** is converted on read. No record is upgraded: a quest's cue stays empty
  because Leader Me had no cue field, a reflection on something never attempted is dropped, and
  profile claims and Gallup themes are not imported. The import summary says so for each.
- A file from a newer version of this app is refused outright rather than read with fields missing.
- **Delete everything** empties the namespace. Revisions never go backwards, so a stale tab cannot
  undo a deletion.

Browser storage is not an encrypted backup. Anybody with access to this browser profile can read
it, and clearing site data deletes it. Once you have copied an export somewhere, that copy has its
own life: deleting your records here cannot recall it.

## Limitations

These are things that are genuinely true of this build, not caveats for form's sake.

- **No user has used this.** No pilot has run. No claim is made that it helps anybody practise
  better, and the counting convention's weights are a prototype that has not been tested with
  anybody.
- **Every citation is unverified.** No publisher host is reachable from the environment this was
  built in, so the titles, authors and attributed claims behind all five methods were recorded as
  written down, not as checked. The Methods page shows this. They must be checked before this
  content is used anywhere outside this repository.
- **One visual presentation.** The four worlds in `../VISUAL-DIRECTIONS.md` are not built, and the
  character is a CSS emblem rather than the predecessor's 3-D figure. That was deliberate; see
  [PROVENANCE.md](PROVENANCE.md).
- **The data-minimisation check is narrow.** Validation refuses something that looks like a contact
  detail in an evidence *attribution*. It does not and cannot stop somebody typing a name into a
  free-text note. The protection is a guard on one structured field, not a filter over the journal.
- **The AI guard rules are patterns.** A differently worded response gets past them. What holds is
  the structure, not the patterns.
- **Share packages are text you write.** Nothing is transmitted and nothing is copied from your
  records automatically. There is no delivery mechanism, by design.
- **No licence.** The predecessor repository has none, and neither does this directory. Reuse here
  rests on the owner's instruction, not on a grant. See [PROVENANCE.md](PROVENANCE.md).
- **Not multi-device.** No sync, no backup, no server. Two browsers are two separate record sets.

## Accessibility

Keyboard operable throughout, with visible focus. Every state cue has a non-colour carrier: a
rehearsal is labelled in text as well as hatched, and the evidence ladder shows filled marks with
the stage name always present as words. Reduced motion is respected. Every essential action is
available without the character. Labels are associated with their controls and hints are wired
through `aria-describedby`.

Not yet done: no screen-reader pass with a real assistive technology, and no contrast audit beyond
choosing the palette for it.
