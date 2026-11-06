# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
"""Kurze Werkzeugtests mit GTP-Attrappen; keine Engine-Partien."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('deckel', ROOT / 'auswertung/diagnose/deckel-fortsetzungen.py')
D = importlib.util.module_from_spec(spec)
spec.loader.exec_module(D)
PARAMS = json.loads((ROOT / 'docs/daten/death-transfer/eingaben.json').read_text())[0]['params']


class Fake:
    def __init__(self, resign=False):
        self.stones = {'B': [], 'W': []}
        self.closed = False
        self.resign = resign
        self.commands = []

    def ask(self, cmd):
        self.commands.append(cmd)
        parts = cmd.split()
        if parts[0] == 'clear_board':
            self.stones = {'B': [], 'W': []}
        elif parts[0] == 'play' and parts[2] != 'PASS':
            self.stones[parts[1]].append(parts[2])
        elif parts[0] == 'genmove':
            return 'RESIGN' if self.resign else 'PASS'
        elif parts[0] == 'list_stones':
            return ' '.join(self.stones[parts[1]])
        elif parts[0] == 'final_score':
            return 'W+7.5'
        return ''

    def close(self):
        self.closed = True


def fixture():
    board = [0]*361
    i = 15*19+3
    board[i] = 1
    return dict(id='unit', mc=1, color=2, board=board, params=PARAMS,
                captures={'1': 0, '2': 0}, history=[{'color': 1, 'idx': i}])


class Tests(unittest.TestCase):
    def test_full_plan_and_pairs(self):
        prepared = {'starts': [{'id': f'case-{i}'} for i in range(8)]}
        plan = D.plan(prepared)
        self.assertEqual(len(plan), 64)
        self.assertEqual(len({c['id'] for c in plan}), 64)
        for a in plan:
            self.assertEqual(sum(c['start'] == a['start'] and c['sims'] == a['sims'] and
                                 c['seed'] == a['seed'] and c['cap'] != a['cap'] for c in plan), 1)

    def test_only_cap_differs_between_arms(self):
        s = fixture()
        a = D.parameters(s, {'cap': 0, 'sims': 120})
        b = D.parameters(s, {'cap': 200, 'sims': 120})
        self.assertEqual([k for k in a if a[k] != b[k]], ['captureCap'])
        self.assertEqual(a['resignEnabled'], 0)
        self.assertEqual(a['deathTransfer'], 1)

    def test_two_stub_passes_numbering_score_and_cleanup(self):
        engine, gnu = Fake(), Fake()
        config = dict(id='unit', start='unit', cap=0, sims=120, seed=761)
        with tempfile.TemporaryDirectory() as t:
            out = Path(t)
            r = D.play(fixture(), config, out, lambda: engine, lambda: gnu, limit=2)
            self.assertTrue(r['gueltig'])
            self.assertEqual(r['enginePoints'], 7.5)
            moves = json.loads((out / 'fortsetzung.json').read_text())
            self.assertEqual([m['mc'] for m in moves], [2, 3])
            self.assertEqual([m['color'] for m in moves], ['W', 'B'])
            self.assertIn('RE[W+7.5]', (out / 'partie.sgf').read_text())
        self.assertTrue(engine.closed and gnu.closed)

    def test_resign_is_invalid_and_processes_close(self):
        engine, gnu = Fake(resign=True), Fake()
        with tempfile.TemporaryDirectory() as t:
            with self.assertRaisesRegex(AssertionError, 'Aufgabe'):
                D.play(fixture(), dict(cap=0, sims=120, seed=761), Path(t), lambda: engine, lambda: gnu)
        self.assertTrue(engine.closed and gnu.closed)

    def test_mirrored_color_changes_score_perspective(self):
        s = fixture()
        s['color'] = 1
        s['board'] = [3-x if x else 0 for x in s['board']]
        s['history'][0]['color'] = 2
        with tempfile.TemporaryDirectory() as t:
            r = D.play(s, dict(cap=200, sims=120, seed=761), Path(t), Fake, Fake, limit=2)
            self.assertEqual(r['enginePoints'], -7.5)
            self.assertIn('PL[W]', (Path(t) / 'partie.sgf').read_text())

    def test_complete_stub_report_and_corrupted_result(self):
        starts = []
        for i in range(8):
            s = fixture()
            s['id'] = f'unit-{i}'
            starts.append(s)
        prepared = dict(starts=starts, sourceSha='source', inputSha256='input', engineSha256='engine')
        with tempfile.TemporaryDirectory() as t:
            root = Path(t)
            for config in D.plan(prepared):
                out = root / config['id']
                out.mkdir()
                start = next(s for s in starts if s['id'] == config['start'])
                D.write(out, 'herkunft.json', {k: prepared[k] for k in ['sourceSha', 'inputSha256', 'engineSha256']})
                result = D.play(start, config, out, Fake, Fake, limit=2)
                D.write(out, 'ergebnis.json', result)
            D.report(prepared, root)
            r = json.loads((root / 'bericht.json').read_text())
            self.assertEqual(r['games'], 64)
            self.assertEqual(len(r['pairs']), 32)
            self.assertTrue(all(p['deltaCapMinusDefault'] == 0 for p in r['pairs']))
            file = root / D.plan(prepared)[0]['id'] / 'ergebnis.json'
            damaged = json.loads(file.read_text())
            damaged['enginePoints'] = 1000
            file.write_text(json.dumps(damaged))
            with self.assertRaisesRegex(AssertionError, 'Endstand inkonsistent'):
                D.report(prepared, root)

    def test_limit_and_missing_packages_are_invalid(self):
        with tempfile.TemporaryDirectory() as t:
            with self.assertRaisesRegex(AssertionError, 'Zugdeckel'):
                D.play(fixture(), dict(cap=0, sims=120, seed=761), Path(t), Fake, Fake, limit=1)
            with self.assertRaises(FileNotFoundError):
                D.report({'starts': [{'id': f'case-{i}'} for i in range(8)]}, Path(t))


if __name__ == '__main__':
    unittest.main()
