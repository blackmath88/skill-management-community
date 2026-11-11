"""Thin default-branch adapter for the pinned upstream producer, not a fork."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys


def verify_output(output):
    art = json.loads((output / 'data/knowledge.json').read_text())
    errors = [d for d in art.get('diagnostics', []) if d['severity'] == 'error']
    if not art.get('complete') or errors:
        raise ValueError('Knowledge incomplete: ' + json.dumps(errors))
    return art


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--producer', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=Path('observstory'))
    args = parser.parse_args()
    producer = args.producer.resolve()
    env = dict(os.environ)
    env.update(OBSERVSTORY_SHA=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
               OBSERVSTORY_REF='refs/heads/' + os.environ['DEFAULT_BRANCH'],
               OBSERVSTORY_KNOWLEDGE='.observstory/knowledge.json',
               OBSERVSTORY_OUTPUT=str(args.output))
    subprocess.run([sys.executable, str(producer / 'scripts/observstory.py'), 'build'], env=env, check=True)
    subprocess.run([sys.executable, str(producer / 'scripts/publish_workspace.py')], env=env, check=True)
    art = verify_output(args.output)
    if art['resolved_commit'] != env['OBSERVSTORY_SHA'] or art['requested_ref'] != env['OBSERVSTORY_REF']:
        raise ValueError('Source commit/ref mismatch')
    release = producer / 'frontend/release'
    if not (release / 'index.html').is_file():
        raise ValueError('Pinned producer lacks the prebuilt workspace')
    (args.output / 'index.html').replace(args.output / 'map.html')
    shutil.copy2(release / 'index.html', args.output / 'index.html')
    shutil.copytree(release / 'assets', args.output / 'assets', dirs_exist_ok=True)
    print('Workspace ready; knowledge source: ' + art['resolved_commit'])


if __name__ == '__main__':
    main()
