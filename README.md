# Project foundation

Every project starts with a shared picture of the work and a small, explicit knowledge base.

**Use this template → Create a new repository**, then clone it and run:

```bash
python3 scripts/init_project.py --repository YOUR-OWNER/YOUR-REPO --title "Your project"
python3 scripts/check.py
git add .
git commit -m "Describe the project foundation"
git push
```

Fill in [CONCEPT.md](CONCEPT.md), [the plan](docs/PLAN.md) and [the next handoff](docs/HANDOFF.md). Start humans and agents at [START-HERE.md](START-HERE.md).

## Included from day one

| Part | What you get |
| --- | --- |
| Observatory | Workstreams, board, timeline, activity and evidence, using the pinned upstream Observstory implementation |
| Knowledge | Explicit selection of concepts, decisions, research, plan, questions and handoff with Git provenance |
| Working practice | Short AGENTS.md, issue/PR templates and bounded handoffs |
| Checks | Local structural checks, producer contract tests and artifact validation |
| Optional memory | An onboarding guide for the existing Knowledge Lab service; no model/API account required |

On pushes, PR changes, issue changes and branch creation/deletion, the **Observatory** workflow reads the default branch's selected knowledge and observes repository-wide activity within the upstream collector's configured limits. Download its `observstory` artifact from Actions and serve it:

```bash
python3 -m http.server --directory observstory 8000
```

Open http://localhost:8000/. The workspace needs HTTP; do not open it with `file://`.
`map.html` is the classic map and `knowledge.html` shows selected documents.
A fresh artifact timestamp does not imply complete collection: inspect its diagnostics and degraded coverage.

## Deliberate defaults

- Repository artifacts only. No Pages deployment, recurring schedule, model call or central ingestion.
- Knowledge audience starts as `private`. This is metadata, **not an access-control mechanism**; the repository's actual visibility controls access to committed files and artifacts.
- Workflow tokens are read-only; credentials are not persisted in checkouts.
- The template is framework-neutral. Add your application's own build, tests and licence.
- The template pins upstream code. New repositories do not automatically inherit future template changes.

See [setup and publication](docs/SETUP.md), [optional connected memory](docs/CONNECTED-MEMORY.md), [upstream review](docs/TEMPLATE-PROVENANCE.md) and [security boundaries](SECURITY.md).

## Work on the template itself

`python3 scripts/check.py` checks the current working files without dependencies.
The CI contract suite also uses the pinned Observstory checkout to build knowledge from a disposable Git repository, check missing-source failures, preserve commit identity and reject unselected content.
