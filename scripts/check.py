"""Dependency-free checks of selected working files; producer checks run separately."""
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]


def check(root):
    manifest = json.loads((root / '.observstory/knowledge.json').read_text())
    errors = []
    if manifest.get('schema') != 'observstory.knowledge-manifest/v1':
        errors.append('Unsupported knowledge manifest schema')
    if manifest.get('audience') not in ('private', 'public'):
        errors.append('Declare private or public audience')
    ids = set()
    for record in manifest.get('records', []):
        rid = record.get('id')
        if not rid or rid in ids:
            errors.append('Missing or duplicate record id')
        ids.add(rid)
        path = root / record['path']
        if not path.resolve().is_relative_to(root.resolve()) or path.is_symlink() or not path.is_file():
            errors.append('Missing or unsafe selected path: ' + record['path'])
    if not ids:
        errors.append('No selected knowledge')
    for link in manifest.get('links', []):
        if link.get('from') not in ids or link.get('to') not in ids:
            errors.append('Dangling knowledge link')
    for path in ['README.md', 'AGENTS.md', 'START-HERE.md', '.observstory/project.json', '.observstory/workspace.json']:
        if not (root / path).is_file():
            errors.append('Missing ' + path)
    return errors


if __name__ == '__main__':
    errors = check(ROOT)
    print('\n'.join(errors) if errors else 'Foundation structure: OK')
    sys.exit(bool(errors))
