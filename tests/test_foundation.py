"""Contract tests use the real pinned producer and disposable Git history."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from check import check
from init_project import initialise
from build_observatory import verify_output

PRODUCER = os.environ.get('OBSERVSTORY_SOURCE')
if PRODUCER:
    sys.path.insert(0, str(Path(PRODUCER) / 'src'))
    from observstory import knowledge, workspace


class Foundation(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.repo = Path(self.tmp.name) / 'project'
        # Independent fixture: valid project edits must not be forced back to template seeds.
        (self.repo / '.observstory').mkdir(parents=True)
        (self.repo / 'docs').mkdir()
        (self.repo / '.observstory/project.json').write_text(json.dumps({
            'schema': 'knowledge-lab.project/v1', 'project_id': 'fixture', 'title': 'Fixture', 'event_ids': []}))
        records = []
        for rid, kind, status, path in [
            ('direction', 'concept', 'candidate', 'CONCEPT.md'),
            ('decisions', 'decision', 'stated', 'docs/DECISIONS.md'),
            ('observations', 'research', 'input', 'docs/OBSERVATIONS.md'),
            ('plan', 'plan', 'current', 'docs/PLAN.md'),
            ('questions', 'question', 'open', 'docs/QUESTIONS.md'),
            ('handoff', 'plan', 'current', 'docs/HANDOFF.md'),
        ]:
            (self.repo / path).write_text('# Synthetic ' + rid + '\n\nFixture evidence.\n')
            records.append({'id': rid, 'type': kind, 'status': status, 'path': path})
        (self.repo / '.observstory/knowledge.json').write_text(json.dumps({
            'schema': 'observstory.knowledge-manifest/v1', 'title': 'Fixture',
            'selection_policy': 'explicit-declaration/v1', 'audience': 'private',
            'records': records, 'links': []}))
        (self.repo / '.observstory/workspace.json').write_text(json.dumps({
            'schema': 'observstory.workspace/v1', 'records': [
                {'id': 'discovery', 'title': 'Discovery', 'kind': 'workstream', 'members': ['direction']}],
            'relations': []}))
        (self.repo / 'observstory.config.json').write_text('{}')
        for name in ['README.md', 'AGENTS.md', 'START-HERE.md']:
            (self.repo / name).write_text('# Fixture\n')

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.repo), *args], text=True).strip()

    def committed(self):
        self.git('init', '-b', 'main')
        self.git('config', 'user.email', 'fixture@example.invalid')
        self.git('config', 'user.name', 'Synthetic fixture')
        self.git('add', '.')
        self.git('commit', '-qm', 'Seed')
        return self.git('rev-parse', 'HEAD')

    def test_initialise_and_refuse_repeat(self):
        initialise(self.repo, 'example/real-project', 'A real project')
        self.assertEqual(check(self.repo), [])
        self.assertEqual(json.loads((self.repo / '.observstory/project.json').read_text())['project_id'], 'real-project')
        with self.assertRaises(ValueError):
            initialise(self.repo, 'example/other-project', 'Other')

    def test_invalid_identity_does_not_change_files(self):
        before = (self.repo / '.observstory/project.json').read_bytes()
        for bad in ['../oops', 'owner/repo;echo', 'owner/repo/extra']:
            with self.assertRaises(ValueError):
                initialise(self.repo, bad, 'No')
        self.assertEqual(before, (self.repo / '.observstory/project.json').read_bytes())

    def test_missing_selected_source_is_failure(self):
        (self.repo / 'CONCEPT.md').unlink()
        self.assertTrue(check(self.repo))

    def test_artifact_gate_rejects_incomplete(self):
        output = Path(self.tmp.name) / 'out'
        (output / 'data').mkdir(parents=True)
        (output / 'data/knowledge.json').write_text(json.dumps({'complete': False, 'diagnostics': []}))
        with self.assertRaises(ValueError):
            verify_output(output)

    @unittest.skipUnless(PRODUCER, 'Set OBSERVSTORY_SOURCE to the pinned producer checkout')
    def test_real_producer_selection_and_commit_identity(self):
        (self.repo / 'unselected.txt').write_text('SYNTHETIC_UNSELECTED_CANARY')
        commit = self.committed()
        (self.repo / 'CONCEPT.md').write_text('SYNTHETIC_UNCOMMITTED_CANARY')
        art = knowledge.build(str(self.repo), 'HEAD', '.observstory/knowledge.json', 'example/project')
        self.assertTrue(art['complete'])
        self.assertEqual(art['resolved_commit'], commit)
        self.assertEqual(knowledge.artifact_errors(art), [])
        self.assertEqual(art['diagnostics'], [])
        self.assertEqual(len(art['records']), 6)
        self.assertNotIn('SYNTHETIC_UNSELECTED_CANARY', json.dumps(art))
        self.assertNotIn('SYNTHETIC_UNCOMMITTED_CANARY', json.dumps(art))
        self.assertFalse(art['selection']['current_direction']['record'])
        self.git('add', 'CONCEPT.md')
        self.git('commit', '-qm', 'Revise selected concept')
        revised = knowledge.build(str(self.repo), 'HEAD', '.observstory/knowledge.json', 'example/project')
        self.assertNotEqual(art['snapshot_id'], revised['snapshot_id'])
        self.assertEqual(revised['records'][0]['content_sha256'], hashlib.sha256(b'SYNTHETIC_UNCOMMITTED_CANARY').hexdigest())
        self.assertNotEqual(art['records'][0]['content_sha256'], revised['records'][0]['content_sha256'])
        self.assertNotIn('unselected.txt', [s['path'] for s in revised['sources']])
        historical = knowledge.build(str(self.repo), commit, '.observstory/knowledge.json', 'example/project')
        self.assertEqual(art['snapshot_id'], historical['snapshot_id'])

    @unittest.skipUnless(PRODUCER, 'Set OBSERVSTORY_SOURCE to the pinned producer checkout')
    def test_real_producer_detects_committed_missing_source(self):
        (self.repo / 'CONCEPT.md').unlink()
        self.committed()
        art = knowledge.build(str(self.repo), 'HEAD', '.observstory/knowledge.json', 'example/project')
        self.assertFalse(art['complete'])

    @unittest.skipUnless(PRODUCER, 'Set OBSERVSTORY_SOURCE to the pinned producer checkout')
    def test_workspace_contract(self):
        self.assertEqual(workspace.errors(json.loads((self.repo / '.observstory/workspace.json').read_text())), [])


if __name__ == '__main__':
    unittest.main()
