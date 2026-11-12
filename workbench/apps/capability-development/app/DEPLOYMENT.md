# GitHub Pages preview

The owner requested a hosted preview on 12 November 2026.

Workflow: `.github/workflows/skilling-pages.yml`.
Preview source: `ccr-cda53478-1fik71`; this is intentionally an unmerged build preview.
Pushes changing app files or this workflow run clean install, typecheck, lint, unit tests and the production build before deployment. Only `app/dist/` is uploaded. Browser journey checks are separate and are not claimed by this workflow.

Expected URL after a successful deployment:
https://blackmath88.github.io/skill-management-community/

Pages source must be GitHub Actions. The `github-pages` environment must permit the preview source branch. No personal token or provider key is needed: deployment uses the job's short-lived GitHub token and OIDC, with write permissions limited to the deployment job.

The app uses relative assets and hash routes, so refreshes such as `#/campaign` work under the repository subpath without a server rewrite.

## Privacy and maturity

This is a public prototype. Fictional demo records are included; the workflow never reads or uploads a user's browser journal. Journal data stays in the browser, with no live AI backend. Browser storage is not encrypted backup. GitHub receives normal web hosting requests. Other sites on the same GitHub Pages origin share the browser origin; a path is not a security boundary. Use fictional/non-sensitive material for preview testing.

No effectiveness claim or complete security/accessibility audit is implied by a successful build. Research citations remain unverified as described in the app README.

## Later promotion

When the app is reviewed and merged, change both the push branch and deployment condition to `main` and update this document. Do not leave two workflows competing for the same Pages site. Use a previous reviewed commit for rollback and rerun deployment; changing the hosted origin does not migrate browser records.
