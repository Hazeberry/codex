#!/usr/bin/env python3
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
"""Liest aus Archivpartien nur Schlüssel und Zuglisten für den Überlappungsabgleich."""
import concurrent.futures
import gzip
import hashlib
import io
import json
import re
import subprocess
import zipfile
from pathlib import Path

COLS = 'ABCDEFGHJKLMNOPQRST'
SEED = 6419
ANZAHL = 400


def fingerprint(moves):
    return hashlib.sha256(' '.join(m.upper() for m in moves).encode('ascii')).hexdigest()


def scan(data, hashes):
    if isinstance(data, list):
        for obj in data:
            scan(obj, hashes)
    elif isinstance(data, dict):
        for key in ('seed', 'versuchsseed', 'partieSeed'):
            value = data.get(key)
            if isinstance(value, int) and (value == SEED or SEED*100000 < value <= SEED*100000+ANZAHL):
                raise ValueError(f'Archiv-Seed belegt: {value}')
        moves = data.get('zuege')
        if isinstance(moves, list) and moves and all(isinstance(m, str) and re.fullmatch(r"(?:[A-HJ-T](?:[1-9]|1[0-9])|pass)", m, re.I) for m in moves):
            hashes.add(fingerprint(moves))
        for key, value in data.items():
            if key not in ('zuege', 'ereignisse', 'kinder') and isinstance(value, (list, dict)):
                scan(value, hashes)


def member(name, stream, hashes):
    if name.endswith('.gz'):
        with gzip.GzipFile(fileobj=stream) as raw:
            member(name[:-3], raw, hashes)
    elif name.endswith('.jsonl'):
        for line in stream:
            if line.strip():
                scan(json.loads(line), hashes)
    elif name.endswith('.json'):
        scan(json.load(stream), hashes)
    elif name.endswith('.sgf'):
        moves = re.findall(rb';[BW]\[([a-s]{2}|)\]', stream.read())
        if moves:
            hashes.add(fingerprint([COLS[m[0]-97] + str(19-(m[1]-97)) if m else 'pass' for m in moves]))


def packet(z, hashes):
    for name in z.namelist():
        if '/einzeln/' in name or name.endswith(('.gtp.jsonl', 'protokoll.jsonl')):
            continue
        if name.endswith(('.json', '.jsonl', '.jsonl.gz', '.sgf')):
            with z.open(name) as src:
                member(name, src, hashes)


def old_packet(item):
    binary = subprocess.check_output(['gh','api',f"repos/Hazeberry/codex/actions/artifacts/{item['id']}/zip"])
    assert 'sha256:'+hashlib.sha256(binary).hexdigest() == item['digest']
    hashes = set()
    with zipfile.ZipFile(io.BytesIO(binary)) as z:
        packet(z, hashes)
    return hashes


def inventory():
    hashes = set()
    for f in sorted(Path('docs/daten').rglob('*')):
        if f.suffix == '.zip':
            with zipfile.ZipFile(f) as z:
                packet(z, hashes)
        elif f.name.endswith(('.json','.jsonl','.jsonl.gz','.sgf')):
            with f.open('rb') as src:
                member(f.name, src, hashes)
    # Eingabestellungen können Präfixe der archivierten Handpartien sein.
    for game in json.loads(Path('docs/daten/death-transfer/eingaben.json').read_text()):
        moves = [COLS[m['idx']%19]+str(19-m['idx']//19) if m['idx'] >= 0 else 'pass' for m in game['moves']]
        hashes.add(fingerprint(moves))
        hashes.update(fingerprint(moves[:n]) for n in game["points"])
    pages = json.loads(subprocess.check_output(['gh','api','--paginate','--slurp',
        'repos/Hazeberry/codex/actions/runs/42279288660/artifacts?per_page=100']))
    packets = [a for page in pages for a in page['artifacts'] if a['name'].startswith('prior-haupt-paket-')]
    assert len({a['name'] for a in packets}) == len(packets) == 134
    assert not any(a['expired'] for a in packets)
    with concurrent.futures.ThreadPoolExecutor(4) as pool:
        for seen in pool.map(old_packet, packets):
            hashes.update(seen)
    Path('archiv.json').write_text(json.dumps(sorted(hashes)))


if __name__ == '__main__':
    inventory()
