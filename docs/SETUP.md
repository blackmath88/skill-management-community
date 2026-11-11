# Setup and maintenance

## New project

Create from the GitHub template, clone, then run the README initializer. It changes identity/title fields only and refuses to reinitialise an already initialised project. Review and commit its diff. Edit concept, plan and handoff; no provider credentials are needed.

Actions must be enabled for automatic artifacts. Repository defaults and organisation policies may restrict them. The first run may precede project personalisation; that output accurately represents the seed.

## Observatory

The workflow always checks out the repository's default branch and resolves its exact commit. It supplies that commit plus the stable default-branch ref to the pinned upstream producer. Activity collection covers branches/PRs/issues subject to upstream limits. On an event, repository state can have advanced since the triggering commit; the artifact records the actual checkout, not a claim that it represents the event SHA.

A thin runner calls upstream build and workspace publication, then installs the upstream prebuilt frontend. It does not fork the UI or knowledge engine. This runner is needed because the upstream composite Action takes github.sha/github.ref directly, which on a feature-branch push would select branch knowledge instead of the canonical default branch.

PR events use pull_request_target with read-only permissions and default-branch checkout only. No PR head checkout, issue-text shell interpolation or write token is needed. Keep that boundary intact when editing the workflow.

No reconciliation timer is enabled. Use Run workflow if event delivery was missed; add a schedule only after an explicit decision.

## Publication is optional

The delivered workflow uploads an artifact, not a website. Before adding Pages:
1. Decide the intended audience and review every selected document **and activity metadata**.
2. Check repository and Pages access settings separately.
3. For a public bundle, explicitly classify the manifest audience as public; changing that field alone does not publish or sanitise anything.
4. Add a separate reviewed deployment workflow using the generated bundle, a github-pages environment and only the required deployment permissions.
5. Verify the public output and its source commit.

Do not publish an artifact from an untrusted PR run. The current template has no Pages workflow.

## Updates

A GitHub template is a starting snapshot, not a subscription. Review upstream changes before changing the Observstory commit in both workflows and docs/TEMPLATE-PROVENANCE.md. Run structural and producer contract checks against the proposed version. Review the transitive action references too; pinned code is still trusted code.

Existing projects can adopt changes through small PRs; never overwrite their concept, decisions, identity or selected manifest with template seeds.

Choose a project licence before public redistribution. This starter adds no licence on your behalf.
