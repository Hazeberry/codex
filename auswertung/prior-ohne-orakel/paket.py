#!/usr/bin/env python3
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
"""Eine Partie je Prozess; Zeitwächter und Sicherung nach jeder Partie, nur in Actions."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

FILES = ['index.html', 'gnugo-duell.js', 'auswertung/lebensurteil.js',
         'auswertung/prior-ohne-orakel/regel.js', 'auswertung/prior-ohne-orakel/bericht.js',
         'auswertung/prior-ohne-orakel/paket.py', '.github/workflows/prior-ohne-orakel-probe.yml',
         'auswertung/prior-ohne-orakel/vergleich.js', 'auswertung/prior-ohne-orakel/vorpruefung.js',
         'auswertung/diagnose/wurzel-replay.js', '.github/workflows/prior-ohne-orakel-vergleich.yml',
         'auswertung/kandidaten-orakel/haupt-bericht.js', 'auswertung/messung-zusatz.js', 'auswertung/fuego/bauen.sh']


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def quellen():
    return {'sourceSHA': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
            'hashes': {p: sha(p) for p in FILES}}


def bounded(args, log, seconds):
    start = time.monotonic()
    with open(log, 'w') as out:
        process = subprocess.Popen(args, stdout=out, stderr=subprocess.STDOUT,
                                   stdin=subprocess.DEVNULL, start_new_session=True)
        timeout = False
        try:
            process.wait(timeout=seconds)
        except subprocess.TimeoutExpired:
            timeout = True
            os.killpg(process.pid, signal.SIGKILL)
            process.wait()
    return {'code': process.returncode, 'timeout': timeout, 'dauerMs': (time.monotonic() - start) * 1000}


def lines(path, repair=False):
    if not path.exists():
        return []
    data = path.read_bytes().splitlines(keepends=True)
    if data and not data[-1].endswith(b'\n'):
        if not repair:
            raise ValueError('abgeschnittene Datei: ' + str(path))
        data.pop()
        path.write_bytes(b''.join(data))
    return [json.loads(line) for line in data if line.strip()]


def package(art, output, resume=False):
    if os.environ.get('GITHUB_ACTIONS') != 'true':
        raise ValueError('Partien ausschließlich in GitHub Actions')
    subprocess.run(['git', 'diff', '--exit-code', 'HEAD', '--', *FILES], check=True, capture_output=True)
    control = art == 'kontrolle'
    gegner, arm = ('g', 'A') if control else art.split('-')
    seed, count = (222, 4) if control else (236, 8 if gegner == 'g' else 4)
    output.mkdir(parents=True, exist_ok=True)
    versions = {'node': subprocess.check_output(['node', '--version'], text=True).strip(),
                'gnugoSHA256': sha('/usr/games/gnugo'),
                'gnugo': subprocess.check_output(['/usr/games/gnugo', '--version'], text=True).strip()}
    if gegner == 'f':
        versions['fuegoSHA256'] = sha('fuego-bin/fuego')
    meta = {**quellen(), 'version': 1, 'art': art, 'gegner': gegner, 'arm': arm,
            'seed': seed, 'n': count, 'wiederholungen': [] if control else [1, 2, 3], 'versions': versions,
            'konfiguration': {'sims': 120, 'komi': 7.5, 'vorgabe': 0, 'resign': 0,
                              'gegnerStufe': 1, 'fuegoSpiele': 100, 'maxZuege': 600}}
    meta_path = output / (art + '.meta.json')
    if meta_path.exists():
        if not resume or json.loads(meta_path.read_text()) != meta:
            raise ValueError('Fortsetzen abgelehnt: andere Quelle, Version oder Konfiguration')
    else:
        if resume or list(output.glob('*.jsonl')):
            raise ValueError('Fortsetzen abgelehnt: Metadaten fehlen')
        meta_path.write_text(json.dumps(meta, indent=2) + '\n')
    bad = False
    for repeat in ([False] if control else [False, True]):
        name = ('wiederholung-' if repeat else '') + art
        file = output / (name + '.jsonl')
        existing = lines(file, repair=resume)
        maximum = 3 if repeat else count
        numbers = [r['nr'] for r in existing]
        if len(numbers) != len(set(numbers)) or any(n < 1 or n > maximum for n in numbers):
            raise ValueError('fremde oder doppelte Partienummern')
        if any(r.get('priorLauf', {}).get('status') not in ['ok', 'gegner-absturz'] for r in existing):
            raise ValueError('kein automatischer Neustart technischer Fehler oder Zeitüberschreitungen')
        for nr in range(1, maximum + 1):
            if nr in numbers:
                continue
            folder = output / 'einzeln' / f'{name}-{nr}'
            folder.mkdir(parents=True, exist_ok=True)
            raw, stream = folder / 'roh.jsonl', folder / 'protokoll.jsonl'
            if raw.exists() or stream.exists():
                raise ValueError('angefangene Partie nicht still überschreiben: ' + str(folder))
            args = ['node', 'gnugo-duell.js', '--partien', '1', '--von', str(nr), '--seed', str(seed),
                    '--stufe', '1', '--vorgabe', '0', '--maxzuege', '600', '--schaetzung', '40,80,120,200',
                    '--gnugo-aufgabe', '0', '--ki', 'mctsFixedSims=120,resignEnabled=0',
                    '--prior-ohne-orakel', arm, '--prior-protokoll', str(stream), '--roh', str(raw)]
            if gegner == 'f':
                args += ['--gegner', 'fuego', '--fuego', str(Path('fuego-bin/fuego').resolve()), '--fuego-spiele', '100']
            state = bounded(args, folder / 'partie.log', 600 if gegner == 'g' else 1800)
            try:
                records = lines(raw)
            except (ValueError, json.JSONDecodeError):
                records = []
            if len(records) == 1:
                row = records[0]
            else:
                row = {'nr': nr, 'abgebrochen': 'keine vollständige Ergebniszeile'}
            state['status'] = 'ok'
            if state['timeout']:
                state['status'] = 'timeout'
            elif state['code'] != 0 or len(records) != 1:
                state['status'] = 'technisch'
            elif row.get('abgebrochen'):
                expected = ('GNU Go: genmove ' if gegner == 'g' else 'Fuego: genmove ')
                state['status'] = 'gegner-absturz' if expected in row['abgebrochen'] and 'beendet (' in row['abgebrochen'] else 'technisch'
            state.update({'quelle': meta['sourceSHA'], 'protokoll': stream.relative_to(output).as_posix(),
                          'log': (folder / 'partie.log').relative_to(output).as_posix()})
            row['priorLauf'] = state
            with file.open('a') as f:
                f.write(json.dumps(row, separators=(',', ':')) + '\n'); f.flush(); os.fsync(f.fileno())
            print(f'{name} Nr. {nr}: {state["status"]}, {state["dauerMs"]/1000:.1f} s', flush=True)
            bad |= state['status'] not in ['ok', 'gegner-absturz']
    return 1 if bad else 0


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--quellen', action='store_true')
    p.add_argument('--art', choices=['kontrolle'] + [o + '-' + a for o in ['g', 'f'] for a in ['A', 'H', 'R']])
    p.add_argument('--aus', type=Path)
    p.add_argument('--fortsetzen', action='store_true')
    a = p.parse_args()
    if a.quellen:
        print(json.dumps(quellen()))
    elif a.art and a.aus:
        sys.exit(package(a.art, a.aus, a.fortsetzen))
    else:
        p.error('--art und --aus benötigt')
