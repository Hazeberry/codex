# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
"""Reine Paket-/Planertests mit Prozessattrappen, keine Engine-Partien."""
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('haupt',ROOT/'auswertung/prior-ohne-orakel/haupt.py')
H=importlib.util.module_from_spec(spec)
spec.loader.exec_module(H)


class Tests(unittest.TestCase):
    def test_plan(self):
        p=H.plan()
        self.assertEqual(len(p),144)
        self.assertEqual(len({x['id'] for x in p}),144)
        for o in ['g','f']:
            for arm in ['A','H','R']:
                numbers=[n for x in p if x['art']==o+'-'+arm for n in range(x['first'],x['first']+x['count'])]
                self.assertEqual(numbers,list(range(1,481)))
        self.assertEqual(sum(x['jobMinutes'] for x in p)+20+30+55+30,9135)

    def run_package(self,first,opponent='g'):
        calls=[]
        def bounded(args,log,seconds):
            calls.append((args,seconds))
            raw=Path(args[args.index('--roh')+1]);nr=int(args[args.index('--von')+1])
            raw.write_text(json.dumps({'nr':nr})+'\n')
            Path(log).write_text('Prozessattrappe\n')
            return {'code':0,'timeout':False,'dauerMs':1}
        with tempfile.TemporaryDirectory() as t, patch.dict(os.environ,{'GITHUB_ACTIONS':'true'}), \
             patch.object(H.P,'bounded',bounded), patch.object(H.P,'sha',lambda _: 'b'*64), \
             patch.object(H.P,'quellen',lambda extra=():{'sourceSHA':'a'*40,'hashes':{}}), \
             patch.object(H.P.subprocess,'run'), patch.object(H.P.subprocess,'check_output',return_value='v22.23.4'):
            code=H.P.package(opponent+'-H',Path(t),haupt=True,von=first,umfang=20,extra=H.EXTRA)
            self.assertEqual(code,0)
            meta=json.loads((Path(t)/(opponent+'-H.meta.json')).read_text())
            self.assertEqual(meta['n'],480)
            self.assertEqual(meta['seed'],237 if opponent=='g' else 238)
        return calls

    def test_first_packet_and_repeats(self):
        calls=self.run_package(1)
        self.assertEqual(len(calls),23)
        self.assertEqual([int(a[a.index('--von')+1]) for a,_ in calls],list(range(1,21))+[1,2,3])
        self.assertTrue(all(a[a.index('--seed')+1]=='237' and seconds==600 for a,seconds in calls))

    def test_later_packet_no_repeats_and_fuego_budget(self):
        calls=self.run_package(21,'f')
        self.assertEqual(len(calls),20)
        self.assertEqual([int(a[a.index('--von')+1]) for a,_ in calls],list(range(21,41)))
        self.assertTrue(all(a[a.index('--seed')+1]=='238' and seconds==1800 for a,seconds in calls))

    def test_guard_no_local_games(self):
        with tempfile.TemporaryDirectory() as t, patch.dict(os.environ,{'GITHUB_ACTIONS':'false'}):
            with self.assertRaisesRegex(ValueError,'ausschließlich'):
                H.P.package('g-A',Path(t),haupt=True,von=1,umfang=20)


if __name__=='__main__':
    if len(sys.argv)>1 and sys.argv[1]=='merge':
        print(json.dumps(H.merge(Path(sys.argv[2]),Path(sys.argv[3]),expected=H.plan(4,2))))
    else:
        unittest.main()
