#!/usr/bin/env python3
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
"""Eine ausgespielte PWA-Vergleichspartie validieren und als SGF exportieren."""
import json
from pathlib import Path
import re
import sys


def export(folder):
    rows = [json.loads(s) for s in (folder / 'partie.jsonl').read_text().splitlines() if s.strip()]
    assert len(rows) == 1, 'Genau eine Partie erforderlich'
    p = rows[0]
    assert not p.get('abgebrochen') and not p['aufgabe'], 'Abbruch/Aufgabe: kein Urteil'
    assert p['zuegeAnzahl'] == len(p['zuege']) < 600, 'Zuglimit/unvollständige Partie'
    assert p['zuege'][-2:] == ['pass', 'pass'], 'Keine zwei Schluss-Pässe'
    assert p['wirFarbe'] == 'W' and p['beginnt'] == 'S' and p['vorgabe'] == 0 and p['komi'] == 7.5
    opponent = {k: float(v) for k, v in (pair.split('=') for pair in p['gegner']['ki'].split(','))}
    assert p['ki']['mctsFixedSims'] == opponent['mctsFixedSims'] == 120
    assert p['ki']['resignEnabled'] == opponent['resignEnabled'] == 0
    assert p['gegner']['sha256'] == '9100c565458b84bac71d8de308e8c064b53de37269bf725e7696ba30a838e685'
    assert re.fullmatch(r'[BW]\+[0-9.]+|0', p['gnugoStand']), 'Endstand unlesbar'
    assert p['neustarts'] == 0, 'Schiedsrichter-Neustart: kein Urteil'
    cols = 'ABCDEFGHJKLMNOPQRST'
    nodes = []
    for i, move in enumerate(p['zuege']):
        if move == 'pass':
            sgf = ''
        else:
            assert re.fullmatch(r'[A-HJ-T](?:[1-9]|1[0-9])', move)
            sgf = chr(97 + cols.index(move[0])) + chr(97 + 19 - int(move[1:]))
        nodes.append(';' + ('B' if i % 2 == 0 else 'W') + '[' + sgf + ']')
    (folder / 'partie.sgf').write_text('(;GM[1]FF[4]CA[UTF-8]SZ[19]KM[7.5]RU[Chinese]'
        'PB[PWA Archiv]PW[Aktuelle Engine]RE[' + p['gnugoStand'] + ']\n'
        + ''.join(nodes) + ')\n')
    winner = 'aktuelle Engine (Weiß)' if p['gewonnen'] else 'PWA (Schwarz)'
    report = ('# Einzelpartie gegen die PWA\n\nGültig. Gewinner: ' + winner
        + '. Endstand durch GNU Go 1: **' + p['gnugoStand'] + '**.\n\n'
        + str(p['zuegeAnzahl']) + ' Züge, Ende durch zwei Pässe. Beide Seiten 120 feste '
        'Simulationen pro Zug, Aufgabe aus, keine Vorgabe, Komi 7,5. Seed-Basis 613; '
        'tatsächlicher Engine-Seed ' + str(p['seed']) + '.\n\n'
        'Eine Partie ist keine Spielstärkemessung. Gegner ist die archivierte PWA-Fassung, '
        'keine live abgerufene Installation. Rohdaten und SGF liegen daneben.\n')
    (folder / 'bericht.md').write_text(report)
    print(report)


if __name__ == '__main__':
    export(Path(sys.argv[1]))
