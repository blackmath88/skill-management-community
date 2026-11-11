# Decisions

Project decisions are recorded below. Template defaults are setup choices, not product decisions.

For each decision record: identifier, date, status (proposed / agreed / superseded), decision, reason, evidence, who agreed and what supersedes it.
Keep proposed decisions distinct from agreed ones. A manifest classification is not approval.

## D1 — Knowledge home (11 November 2026, agreed)

The owner explicitly selected blackmath88/skill-management-community as the repository for this community research and notes. Leader Me is a separate application and potential consumer. Preserve evidence status and keep private community material out of this public repository.


## D2 — Three spaces (11 November 2026, agreed)

The owner approved Community, Domain knowledge & research, and My workbench (frameworks, tools, apps, experiments). Apps remain separate implementations. The trendradar is the first traceable example across all three.


## D3 — Capability-development application location (11 November 2026, agreed)

The owner's implementation mandate placed the application at
`workbench/apps/capability-development/app/` in this repository, as a separately runnable
derivative of `blackmath88/leader-me` at commit `55114f3b`. This supersedes the general workbench
policy that app code lives in its own repository, and supersedes sections 1 and 3 of the app's own
architecture document, which assumed an in-place evolution of Leader Me.

The full reasoning, what it costs and what would reverse it are in
[the app's decisions](../workbench/apps/capability-development/app/DECISIONS.md); what was carried
over and the licence position are in
[its provenance record](../workbench/apps/capability-development/app/PROVENANCE.md). Leader Me was
inspected read-only and not modified. Neither repository has a licence file, so reuse rests on the
owner's instruction rather than a grant; that is the owner's to resolve before anybody outside
their control works on the code.
