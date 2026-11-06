#!/usr/bin/env python3
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
"""Fest gepackter A/H/R-Hauptlauf; keine automatische Wiederaufnahme."""
import argparse
import importlib.util
import json
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('prior_paket', Path(__file__).with_name('paket.py'))
P = importlib.util.module_from_spec(spec)
spec.loader.exec_module(P)
EXTRA = ['auswertung/prior-ohne-orakel/haupt.py', 'auswertung/prior-ohne-orakel/haupt-vorpruefung.js',
         '.github/workflows/prior-ohne-orakel-haupt.yml', 'tests/rahmen.js',
         'tests/prior-ohne-orakel-haupt.js', 'tests/prior-ohne-orakel-haupt.py',
         'tests/prior-ohne-orakel-fixture.js']


def plan(n=480, size=20):
    assert n > 0 and size > 0 and n % size == 0
    return [dict(id=f'{opponent}-{arm}-{first:03d}', art=f'{opponent}-{arm}', opponent=opponent,
                 arm=arm, first=first, count=size, stepMinutes=45 if opponent == 'g' else 60,
                 jobMinutes=55 if opponent == 'g' else 70)
            for opponent in ['g', 'f'] for arm in ['A', 'H', 'R'] for first in range(1, n+1, size)]


def run(id_, folder):
    cfg = next((x for x in plan() if x['id'] == id_), None)
    if cfg is None and id_ != 'kontrolle':
        raise ValueError('Unbekanntes Paket')
    folder.mkdir(parents=True, exist_ok=True)
    marker = folder / 'paket.json'
    if marker.exists() or list(folder.iterdir()):
        raise ValueError('Keine stille Wiederaufnahme oder Überschreibung')
    marker.write_text(json.dumps(cfg or {'id': 'kontrolle', 'art': 'kontrolle'}, indent=2)+'\n')
    return P.package(cfg['art'] if cfg else 'kontrolle', folder, haupt=True,
                     von=cfg['first'] if cfg else 1, umfang=cfg['count'] if cfg else 4, extra=EXTRA)


def merge(parts, out, expected=None):
    expected = plan() if expected is None else expected
    out.mkdir(parents=True, exist_ok=True)
    if list(out.iterdir()):
        raise ValueError('Ziel muss leer sein')
    canonical = {}
    versions = {}
    for cfg in [*expected, {'id': 'kontrolle', 'art': 'kontrolle'}]:
        sub = parts / cfg['id']
        actual = json.loads((sub / 'paket.json').read_text())
        if actual != cfg:
            raise ValueError('Paketplan weicht ab')
        art = cfg['art']
        meta = json.loads((sub / (art+'.meta.json')).read_text())
        base = canonical.setdefault(art, meta)
        if meta != base:
            raise ValueError('Gemischte Metadaten eines Arms')
        if meta['versions'].get('node') != 'v22.23.4':
            raise ValueError('Node-Version weicht von Festlegung ab')
        for key in ['node', 'gnugoSHA256'] + (['fuegoSHA256'] if cfg.get('opponent') == 'f' else []):
            value = meta['versions'].get(key)
            if not value or key in versions and versions[key] != value:
                raise ValueError('Gemischte oder fehlende Programmversionen')
            versions[key] = value
        rows = P.lines(sub / (art+'.jsonl'))
        numbers = list(range(cfg.get('first', 1), cfg.get('first', 1)+cfg.get('count', 4)))
        if [r['nr'] for r in rows] != numbers:
            raise ValueError('Pflichtnummern fehlen oder sind doppelt/fremd')
        with (out / (art+'.jsonl')).open('ab') as target:
            target.write((sub / (art+'.jsonl')).read_bytes())
        repeat = sub / ('wiederholung-'+art+'.jsonl')
        if art != 'kontrolle' and cfg['first'] == 1:
            if [r['nr'] for r in P.lines(repeat)] != [1, 2, 3]:
                raise ValueError('Wiederholungen fehlen')
            shutil.copyfile(repeat, out / repeat.name)
        elif repeat.exists():
            raise ValueError('Fremde Wiederholung')
        for file in (sub / 'einzeln').rglob('*'):
            if not file.is_file():
                continue
            rel = file.relative_to(sub)
            target = out / rel
            if target.exists():
                raise ValueError('Doppelte Einzeldatei: '+str(rel))
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(file, target)
        for file in [sub / 'paket.json', sub / (art+'.meta.json')]:
            target = out / 'pakete' / cfg['id'] / file.name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(file, target)
    for art, meta in canonical.items():
        (out / (art+'.meta.json')).write_text(json.dumps(meta, indent=2)+'\n')
    return {'pakete': len(expected)+1, 'versions': versions}


def main():
    p = argparse.ArgumentParser()
    p.add_argument('mode', choices=['plan', 'run', 'merge', 'quellen'])
    p.add_argument('args', nargs='*')
    a = p.parse_args()
    if a.mode == 'plan':
        print(json.dumps({'include': plan()}))
    elif a.mode == 'quellen':
        print(json.dumps(P.quellen(EXTRA)))
    elif a.mode == 'run':
        return run(a.args[0], Path(a.args[1]))
    else:
        print(json.dumps(merge(Path(a.args[0]), Path(a.args[1]))))
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as e:
        print('KEIN URTEIL: '+str(e), file=sys.stderr)
        raise
