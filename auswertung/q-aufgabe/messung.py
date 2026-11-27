#!/usr/bin/env python3
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
"""Eine geplante Partie pro Prozess. Begutachtung ausschließlich aus eingefrorenen Daten."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys

from archiv import ANZAHL, SEED, fingerprint

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('aufgabe113', ROOT/'auswertung/diagnose/aufgabe-113.py')
G = importlib.util.module_from_spec(spec)
spec.loader.exec_module(G)
ENGINE = 'a14ac4d4058072ec552ca524832095f628412224b96ff7159806e35499fcb4b6'
ZUG = re.compile(r'PASS|[A-HJ-T](?:[1-9]|1[0-9])')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def single(path):
    row, = [json.loads(line) for line in path.read_text().splitlines()]
    return row


def validate(row, trace, nr):
    seed = SEED * 100000 + nr
    f = 1 if nr % 2 == 0 else 2
    color = 'S' if f == 1 else 'W'
    assert row['nr'] == nr and row['seed'] == seed and row['wirFarbe'] == color
    assert row['ki'] == {'mctsFixedSims':120, 'resignEnabled':1} and row['komi'] == 7.5
    assert row['vorgabe'] == 0 and row['stufe'] == 1 and not row['gnugoDarfAufgeben']
    assert not row.get('abgebrochen') and row['neustarts'] == 0
    moves = row['zuege']
    assert len(moves) == row['zuegeAnzahl'] <= 600 and all(ZUG.fullmatch(m.upper()) for m in moves)
    resign = row['aufgabe'] is not None
    assert not resign or row['aufgabe'] == color
    assert [e['mc'] for e in trace] == list(range(f-1, len(moves)+int(resign), 2))
    streak = 0
    for e in trace:
        assert (e['nr'],e['seed'],e['f'],e['vorher']) == (nr,seed,f,streak)
        s = e['suche']
        if s is not None:
            assert s['sims'] == 120 and isinstance(s['n'],int) and s['n'] >= 0 and abs(s['q']) <= 1
            assert s['q'] == (s['w']/s['n'] if s['n'] else 0)
            streak = streak+1 if e['mc'] >= 60 and s['q'] <= -.95 else 0
        assert streak == e['nachher']
        q_resign = e['typ']=='resign' and e['info'].startswith('Q ')
        assert q_resign == (s is not None and streak >= 5)
        if e['mc'] < len(moves):
            assert e['typ'] in ('stone','pass') and e['zug'].upper() == moves[e['mc']].upper()
        else:
            assert resign and e['typ'] == 'resign' and len(e['brett']) == 361
            assert q_resign or (s is None and e['info'].startswith('alle Züge todgeboren'))
    if resign:
        assert trace[-1]['mc'] == len(moves)
        return 'Q' if trace[-1]['suche'] is not None else 'Benson'
    if [m.upper() for m in moves[-2:]] == ['PASS','PASS']:
        return 'zwei Pässe'
    assert len(moves) == 600
    return 'Zuglimit'


def play(nr, archive):
    folder = Path('roh')/str(nr)
    folder.mkdir(parents=True, exist_ok=False)
    raw, log = folder/'partie.jsonl', folder/'spur.jsonl'
    subprocess.run(['node','gnugo-duell.js','--partien','1','--von',str(nr),'--seed',str(SEED),
        '--stufe','1','--vorgabe','0','--gnugo-aufgabe','0','--maxzuege','600','--ki',
        'mctsFixedSims=120,resignEnabled=1','--roh',str(raw),'--q-spur',str(log)],
        check=True, timeout=600, stdout=subprocess.DEVNULL)
    row = single(raw)
    trace = [json.loads(l) for l in log.read_text().splitlines()]
    category = validate(row,trace,nr)
    key = fingerprint(row['zuege'])
    assert key not in archive, f'Archivüberlappung Nr. {nr}'
    proof = dict(nr=nr, seed=row['seed'], farbe=row['wirFarbe'], ende=category, verlauf=key,
                 quelle=os.environ['GITHUB_SHA'], engine=ENGINE, gnugo=digest(Path('/usr/games/gnugo')),
                 dateien={p.name:digest(p) for p in (raw,log)})
    (folder/'manifest.json').write_text(json.dumps(proof))


def continue_game(g, history, expected):
    G.setup(g, history)
    assert G.board(g) == expected
    passes = int(bool(history) and history[-1][1].upper() == 'PASS')
    for i in range(600):
        color = 'BW'[(len(history)+i)%2]
        move = g.ask('genmove '+color).upper()
        assert ZUG.fullmatch(move)
        passes = passes+1 if move == 'PASS' else 0
        if passes == 2:
            return -G.score(g.ask('final_score'))
    return None


def judge(nr):
    folder = Path('roh')/str(nr)
    manifest = json.loads((folder/'manifest.json').read_text())
    assert manifest['quelle'] == os.environ['GITHUB_SHA'] and manifest['gnugo'] == digest(Path('/usr/games/gnugo'))
    for file, sha in manifest['dateien'].items():
        assert digest(folder/file) == sha
    row = single(folder/'partie.jsonl')
    trace = [json.loads(l) for l in (folder/'spur.jsonl').read_text().splitlines()]
    assert validate(row,trace,nr) == manifest['ende']
    history = [('BW'[i%2],m) for i,m in enumerate(row['zuege'])]
    out = Path('bewertet')/str(nr)
    out.mkdir(parents=True, exist_ok=False)
    values = []
    if manifest['ende'] == 'Q':
        last = trace[-1]
        assert 'BW'[len(history)%2] == ('B' if row['wirFarbe']=='S' else 'W')
        for level in (1,10):
            g = G.gnugo(level,row['seed'],out,'stufe-'+str(level))
            try:
                v = continue_game(g,history,last['brett'])
                values.append(v if v is None or row['wirFarbe']=='S' else -v)
            finally:
                g.close()
    (out/'urteil.json').write_text(json.dumps(dict(**manifest,margen=values)))


def control():
    from tempfile import TemporaryDirectory
    with TemporaryDirectory() as tmp:
        for level in (1,10):
            g = G.gnugo(level,17,Path(tmp),'kontrolle')
            try:
                for history in [[('B','D4')],[('B','D4'),('W','Q16')]]:
                    G.setup(g,history)
                    b = G.board(g)
                    assert b[15*19+3] == 1 and sum(x!=0 for x in b)==len(history)
                    if len(history)==2:
                        assert b[3*19+15]==2
                    move = g.ask('genmove '+'BW'[len(history)%2]).upper()
                    assert ZUG.fullmatch(move)
            finally:
                g.close()


if __name__ == '__main__':
    assert os.environ.get('GITHUB_ACTIONS') == 'true' and digest(ROOT/'index.html') == ENGINE
    if sys.argv[1] == 'kontrolle':
        control()
    else:
        mode, group = sys.argv[1:]
        assert mode in ('spielen','bewerten') and 0 <= int(group) < ANZAHL//10
        archive = set(json.loads(Path('archiv.json').read_text())) if mode=='spielen' else None
        for nr in range(10*int(group)+1, 10*int(group)+11):
            if mode=='spielen':
                play(nr, archive)
            else:
                judge(nr)
