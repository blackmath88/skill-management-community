"""Personalise a fresh template without credentials or network access."""
import argparse
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def initialise(root, repository, title):
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9-]*/[A-Za-z0-9][A-Za-z0-9._-]{1,79}", repository):
        raise ValueError("Use owner/repository (repository name: 2–80 characters)")
    if not title.strip() or len(title) > 200 or any(ord(c) < 32 for c in title):
        raise ValueError("Title must be a single nonempty line, at most 200 characters")
    project_path = root / '.observstory/project.json'
    project = json.loads(project_path.read_text())
    if project.get('repository'):
        raise ValueError('Already initialised; edit project identity deliberately instead')
    manifest_path = root / '.observstory/knowledge.json'
    manifest = json.loads(manifest_path.read_text())
    config_path = root / 'observstory.config.json'
    config = json.loads(config_path.read_text())
    project.update(project_id=repository.split('/')[1].lower(), title=title,
                   repository=repository, note='Registration and connectors are separate.')
    manifest['title'] = title
    config['title'] = title + ' · Observatory'
    for path, value in [(project_path, project), (manifest_path, manifest), (config_path, config)]:
        path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')
    return project


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repository', required=True)
    parser.add_argument('--title', required=True)
    args = parser.parse_args()
    try:
        project = initialise(ROOT, args.repository, args.title)
    except (ValueError, OSError) as error:
        parser.exit(1, str(error) + '\n')
    print('Initialised ' + project['repository'] + '; review, complete the notes, and commit.')
