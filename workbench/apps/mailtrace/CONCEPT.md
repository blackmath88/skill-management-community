# mailtrace — concept

Date: 2026-11-11. Status: proposed hobby / learning prototype; not implemented or deployed. Owner: Miro (Achim). This document selectively preserves the supplied concept and review, not a raw conversation or contact list.

## Purpose

After an event, badge names needed to be matched to professional profiles and business email addresses. LLM-generated addresses were unreliable. The people are personally known and can provide their addresses directly; there is no outreach objective. The motivation is to understand the underlying mechanics of email discovery on owner-controlled hardware. The process is the product.

Build a transparent evidence recorder for one structured name and one domain. It should show DNS observations, public-source extraction, pattern hypotheses, ranked permutations and optional SMTP observations. An honest unknown is a successful result. Do not optimise hit rate or imply that SMTP acceptance proves mailbox existence or identity.

## Questions to explore

- What do MX, SPF and DMARC reveal, and what do they not establish?
- Can explicit public name/address pairs support a company naming pattern?
- How do SMTP recipient conversations behave under rejection, temporary failure and policy restrictions?
- What does random-recipient acceptance actually establish?
- Can Linuc and its container network reach an authorised SMTP endpoint on outbound TCP/25?
- What do indexed datasets and commercial waterfall orchestration add beyond permutations?
- How can every observation and decision be replayed without repeating network activity?

## Goals and boundaries

Goals: one-name/one-domain pipeline; evidence-linked JSON trace; offline German HTML replay; understandable outcomes even when SMTP is unavailable.

Non-goals: bulk discovery, lead generation, outreach, LinkedIn scraping, account-registration or recovery probing, Holehe-style checks, paid APIs, SMTP proxies, sending email, public tunnels, autonomous watchers and LLM-generated addresses. No DATA command in SMTP verification. No real contacts, private host details or real traces committed to this public repository.

Only test real recipients who know about the experiment and have authorised it, or owner-controlled domains. Development and CI use synthetic fixtures and local services. Authorisation for one person does not imply permission for arbitrary recipients or infrastructure; establish an appropriate domain-testing scope.

## Proposed runtime

Linuc is the owner's Linux execution host. Docker Compose runs a small Python application and an unmodified, pinned Reacher service. Reacher has no host-published API port but needs outbound connectivity. The minimal web view is localhost-only by default; optional remote access binds explicitly to the owner's Tailscale IP. No 0.0.0.0 default, public ingress, paid route or proxy.

The Python package contains CLI, coordinator, doctor, recon, crawler, pattern inference, permutation, probe adapter and trace functions. Keep it prototype-grade: no plugin architecture, database, queue, config framework or frontend build chain.

## Pipeline

0. Doctor: distinguish DNS, TCP connection, SMTP greeting and Reacher API failures. A timeout is not proof of ISP blocking.
1. Domain recon: record MX priorities, provider hypothesis and supporting hostnames, raw SPF/DMARC, missing records and lookup errors. Do not equate mail gateway with the entire mail system. Handle null MX and missing MX separately; consult the applicable SMTP rules rather than assuming both mean no mail.
2. Public pattern discovery: up to ten HTML pages, robots policy, serial fetching and polite delay. Prioritise home/contact/team/imprint/press links. Save source URL, fetch time, extraction method, short excerpt and any explicit person association. Role addresses are not personal-pattern evidence. Count distinct people rather than duplicated footer text.
3. Permutation: structured first/last names, bounded Swiss-aware variants, ranked and deduplicated. Explain every transformation. Accept manual splits/overrides for ambiguous names.
4. Optional SMTP: explicit authorisation gate, tightly bounded checks, preserve raw Reacher output, distinguish acceptance from identity. Avoid duplicating Reacher's own catch-all test.
5. Trace/replay: persist partial results after every stage; replay without network access. Trace collection begins before stage 0, not at stage 5.

## Result semantics

Keep three separate dimensions: source attribution, SMTP observation and mailbox-existence conclusion.

SMTP observations: recipient_accepted, accept_all_observed, recipient_rejected, temporary_failure, policy_blocked, unreachable, unknown, skipped. Preserve command context, response codes and text where actually available. A rejection is not necessarily a nonexistent mailbox. A random recipient accepted in one exchange is not proof of a permanent catch-all configuration. Do not label any address valid simply because RCPT TO was accepted.

Example: attribution=inferred_from_pattern; smtp_observation=recipient_accepted; mailbox_existence=unconfirmed.

Do not infer catch-all behaviour from Microsoft 365. No reliable catch-all prevalence estimate was established in the concept review.

## Prior art and adoption gates

These are reference leads from the preceding review, not a fresh exhaustive source audit or novelty assessment. The implementing agent must inspect pinned upstream revisions before relying on behaviour or licensing.

- Reacher: https://github.com/reacherhq/check-if-email-exists — candidate Rust verification engine with HTTP backend. The old https://github.com/reacherhq/backend is archived. Gate: determine exact image digest/source revision, licence files, API route/schema, optional external lookups, retry/catch-all behaviour and transcript availability. Previous documentation was inconsistent about licences and API versions; do not guess. Do not assume structured JSON contains a complete SMTP transcript. Disable unrelated account/enrichment lookups; if this cannot be established, keep real probing disabled.
- https://github.com/meddion/email-finder — adjacent name/domain discovery implementation; inspect before reuse.
- User-supplied permutation reference, not independently audited: https://gist.github.com/irazasyed/02d6530b83c3ba2fe3682caaff4c0222
- Hunter public-source and inferred-address model: https://help.hunter.io/en/articles/1922677-how-does-hunter-find-email-addresses and https://hunter.io/email-finder
- Waterfall means provider fallback, not a different SMTP primitive: https://hunter.io/blog/waterfall-enrichment/
- Apollo and Zeliq were commercial reference names supplied by the owner; their internal implementation was not established.
- SMTP semantics: https://www.rfc-editor.org/rfc/rfc5321.html
- Microsoft recipient filtering reference: https://learn.microsoft.com/en-us/exchange/mail-flow-best-practices/use-directory-based-edge-blocking

The distinctive product is evidence-linked replay and honest uncertainty, not a new email-discovery algorithm. No LLM is required in the critical path.

## Success criteria

- One end-to-end run creates a readable trace even if port 25 fails.
- Each conclusion names its evidence and remaining uncertainty.
- A synthetic run and replay work offline.
- A separately authorised Linuc experiment distinguishes observed connectivity from unproven ISP-blocking claims.
- No email is sent and no private experimental data is published.

## Decisions and unresolved facts

Proposed decisions: timeline-first UI; small manually managed local run history; deterministic rules; no database. Real supplied addresses may be separate ground truth but must not leak into inference or public fixtures.

Unresolved: Linuc outbound connectivity; Reacher build/behaviour/licence; exact Tailscale binding; implementation repository. Repository policy requires app code in its own repository. This folder is the documentation home, not permission to turn the community notebook into the application.

Next: read [BUILD-PLAN.md](BUILD-PLAN.md) and [AGENTS.md](AGENTS.md).
