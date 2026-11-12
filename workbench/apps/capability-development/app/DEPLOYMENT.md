# GitHub Pages preview

The owner requested a hosted preview on 12 November 2026.

Verification workflow: `.github/workflows/verify-skilling-preview.yml`.
Deployment workflow on main: `.github/workflows/skilling-pages.yml`.
The preview branch runs **Verify Skilling Me Softly preview** with read-only permissions. After a successful push run, the **Deploy Skilling Me Softly to Pages** workflow on main checks the source repository and branch, checks out that exact commit, rebuilds/verifies it, then deploys from an isolated job. Manual runs and changes to the main workflow use its explicit pinned preview commit. No preview code executes in the Pages-write job.
Preview source: `ccr-cda53478-1fik71`; this is intentionally an unmerged build preview.
Pushes changing app files or this workflow run clean install, typecheck, lint, unit tests and the production build before deployment. Only `app/dist/` is uploaded. Browser journey checks are separate and are not claimed by this workflow.

Expected URL after a successful deployment:
https://blackmath88.github.io/skill-management-community/

Pages source must be GitHub Actions. The `github-pages` environment remains restricted to main; the preview branch is not granted direct deployment access. No personal token or provider key is needed: deployment uses the job's short-lived GitHub token and OIDC, with write permissions limited to the deployment job.

The app uses relative assets and hash routes, so refreshes such as `#/campaign` work under the repository subpath without a server rewrite.

## Privacy and maturity

This is a public prototype. Fictional demo records are included; the workflow never reads or uploads a user's browser journal. Journal data stays in the browser, with no live AI backend. Browser storage is not encrypted backup. GitHub receives normal web hosting requests. Other sites on the same GitHub Pages origin share the browser origin; a path is not a security boundary. Use fictional/non-sensitive material for preview testing.

No effectiveness claim or complete security/accessibility audit is implied by a successful build. Research citations remain unverified as described in the app README.

## Later promotion

When the app is reviewed and merged, consolidate to one main-branch push workflow, remove the workflow_run trigger and pinned preview checkout, and update this document. Do not leave two workflows competing for the same Pages site. Use a previous reviewed commit for rollback and rerun deployment; changing the hosted origin does not migrate browser records.

## Initial verification

GitHub Actions on 12 November 2026 reran typecheck, lint, all 327 unit/property/integration tests and the production build successfully. The first branch-direct deployment was blocked by the existing main-only environment rule; the main-owned workflow resolves that without weakening the rule. npm ci reported 10 moderate advisories; their applicability has not been triaged here. Browser end-to-end tests were not rerun by this deployment workflow.
