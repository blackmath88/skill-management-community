# Apps

Software supports a method. It does not establish learning effectiveness. Keep app code in its own repository.

## Skilling Me Softly — capability development

An evolution of Leader Me, retaining character development and gameful practice while separating
the underlying engine from company-specific presentation. **Status: implemented and verified as a
separately runnable derivative at [`capability-development/app/`](capability-development/app/).**
Nobody has used it and no pilot has run; it makes no effectiveness claim.

- [**The application: setup, run and what the checks covered**](capability-development/app/README.md)
- [Implementation decisions](capability-development/app/DECISIONS.md) · [Provenance and adaptation](capability-development/app/PROVENANCE.md) · [Checklist: implemented, verified, deferred, blocked](capability-development/app/CHECKLIST.md)
- [Product and behavioural concept](capability-development/CONCEPT.md)
- [Architecture and data boundaries](capability-development/ARCHITECTURE.md) — sections 1 and 3 superseded by decision A1
- [Delivery plan](capability-development/PLAN.md) — stages 0 to 5 executed; the pilot is not scheduled
- [Visual worlds and presentation brief](capability-development/VISUAL-DIRECTIONS.md) — not built; one presentation exists
- [Research, GitHub prior art and adoption gates](capability-development/PRIOR-ART.md)

Two things a reader should know before relying on the app. Its citations are **unverified**: no
publisher host is reachable from the build environment, so every source carries `retrieved: false`
and says so in the interface. And there is **no licence**: the predecessor repository has none, so
reuse rests on the owner's instruction rather than a grant, which needs resolving before anybody
outside the owner's control works on it.

| App / lead | Use | Status and limits | Next question |
| --- | --- | --- | --- |
| [Leader Me](https://github.com/blackmath88/leader-me) | Personal practice history and revisable development hypotheses | Related private repo; not an assessment or this community's platform. The source of the derivative in `capability-development/app/` (commit `55114f3b`, inspected read-only, unmodified) | Which shareable practice record is useful? |
| [Skilling Me Softly](capability-development/app/README.md) | Campaigns, rehearsal versus real attempts, evidence-linked progression, a local AI stand-in | Implemented here; local-first, no server, no outbound request. Untested with users; citations unverified | Does anybody take a conditions branch when it is the honest answer? |
| Sharing is Caring | Possible photo follow-up | Owner's idea; repository URL and capabilities unverified | Identify repo, consent and intended access before use |
| STORM / Co-STORM | Prepare questions and source perspectives | Report-derived lead, not evaluated here | Does preparation broaden or narrow peer discussion? |
| Onyx | Source-bound knowledge access | Report-derived lead, no installation reviewed | Is a curated case collection sufficient first? |
| Roleplay coach / tutor | Additional practice and feedback | Report-derived lead, transfer and feedback validity untested | Can a human expert check the feedback? |

[AI research and source links](../../knowledge/topics/ai-and-capability-development.md). No installations or endorsements are implied.

For future entries: purpose, method supported, canonical repository, inspected version/date, licence and maintenance status, data flows, limitations and next experiment.

[Workbench](../README.md)

## Where the work lives

This public workbench holds the community-facing synthesis, the design documents, and — for this
one app — the implementation. [Skilling Me Softly in LeaderMe](https://github.com/blackmath88/leader-me/tree/main/docs/skilling-me-softly)
holds the supplied source plans and rebuild review; that repository is private and requires access.

The general workbench policy is that app code lives in its own repository. This app is the stated
exception: the owner's implementation instruction named this location, and
[decision A1](capability-development/app/DECISIONS.md) records that, what it costs and what would
reverse it. No fork was created and Leader Me was not modified.

Final visual direction remains open, and the two codebases will drift until one is named the
successor.
