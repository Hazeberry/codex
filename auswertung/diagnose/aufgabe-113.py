#!/usr/bin/env python3
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
"""Begrenzte Einzelfall-Diagnose; Messungen ausschließlich in GitHub Actions."""
import hashlib
import json
import os
from pathlib import Path
import queue
import re
import subprocess
import sys
import threading

ROOT = Path(__file__).resolve().parents[2]
INPUT = ROOT / 'docs/daten/aufgabe-113'
COLS = 'ABCDEFGHJKLMNOPQRST'


def moves():
    text = (INPUT / 'partie.sgf').read_text()
    assert 'SZ[19]' in text and 'KM[7.5]' in text and 'RU[Chinese]' in text
    result = [(c, COLS[ord(p[0])-97] + str(19-(ord(p[1])-97)) if p else 'pass')
              for c, p in re.findall(r';([BW])\[([a-s]{2}|)\]', text)]
    assert len(result) == 113
    assert all(c == ('B' if i % 2 == 0 else 'W') for i, (c, _) in enumerate(result))
    assert result[41] == ('W', 'P13')
    return result


class GTP:
    def __init__(self, args, out, name):
        self.err = open(out / (name + '.stderr'), 'w')
        self.log = open(out / (name + '.gtp.jsonl'), 'w')
        self.p = subprocess.Popen(args, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                  stderr=self.err, text=True, bufsize=1, cwd=ROOT)
        self.q = queue.Queue()
        def reader():
            try:
                for line in self.p.stdout:
                    self.q.put(line)
            finally:
                self.q.put(None)
        threading.Thread(target=reader, daemon=True).start()

    def ask(self, command):
        self.log.write(json.dumps({'command': command}) + '\n'); self.log.flush()
        self.p.stdin.write(command + '\n'); self.p.stdin.flush()
        lines = []
        while True:
            line = self.q.get(timeout=120)
            if line is None:
                raise RuntimeError('GTP-Prozess beendet: ' + command)
            if not line.strip() and lines:
                break
            if line.strip():
                lines.append(line.rstrip())
        response = '\n'.join(lines)
        self.log.write(json.dumps({'response': response}) + '\n'); self.log.flush()
        if not response.startswith('='):
            raise RuntimeError(response)
        return response[1:].strip()

    def close(self):
        self.p.terminate()
        try:
            self.p.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.p.kill(); self.p.wait()
        self.err.close(); self.log.close()


def gnugo(level, seed, out, name):
    return GTP(['/usr/games/gnugo', '--mode', 'gtp', '--chinese-rules',
                '--level', str(level), '--seed', str(seed), '--never-resign'], out, name)


def setup(g, history):
    g.ask('boardsize 19'); g.ask('clear_board'); g.ask('komi 7.5')
    for c, m in history:
        g.ask(f'play {c} {m}')


def board(g):
    b = [0] * 361
    for c, value in [('B', 1), ('W', 2)]:
        for v in g.ask('list_stones ' + c).split():
            b[(19-int(v[1:])) * 19 + COLS.index(v[0].upper())] = value
    return b


def score(value):
    if value.strip() == '0':
        return 0.0
    m = re.fullmatch(r'([BW])\+([0-9.]+)', value.strip())
    if not m:
        raise ValueError('Endstand unlesbar: ' + value)
    return float(m[2]) * (1 if m[1] == 'W' else -1)


def write(out, name, data):
    (out / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def diagnose(out, history, ref):
    rows = []
    for level in [1, 10]:
        g = gnugo(level, 611, out, 'bewertung-' + str(level))
        try:
            setup(g, history)
            assert board(g) == ref['board'], 'SGF und Bericht widersprechen sich'
            for n in [79, 85, 89, 91, 93, 95, 97, 99, 101, 103, 113]:
                setup(g, history[:n])
                before = g.ask('estimate_score')
                candidate = g.ask('reg_genmove W')
                assert candidate.lower() != 'resign'
                actual = history[n][1] if n < len(history) else None
                alternatives = {}
                for label, move in [('archiv', actual), ('vorschlag', candidate)]:
                    if move is not None:
                        setup(g, history[:n]); g.ask('play W ' + move)
                        alternatives[label] = {'move': move, 'estimate': g.ask('estimate_score')}
                rows.append({'level': level, 'nachZug': n, 'estimate': before,
                             'alternativen': alternatives})
                write(out, 'bewertungen.json', rows)
        finally:
            g.close()
    assert len(rows) == 22
    return {'gueltig': True, 'stellungen': len(rows), 'sgfBerichtGleich': True}


def continuation(out, history, ref, mode, seed):
    black = gnugo(1, seed, out, 'schwarz')
    params = dict(ref['params'])
    params.update(resignEnabled=0, adaptiveBudgetEnabled=0, mctsFixedSims=int(mode) if mode != 'gnu10' else 120)
    white = None
    try:
        white = gnugo(10, seed, out, 'weiss') if mode == 'gnu10' else GTP(
            ['node', 'gtp-ki.js', '--html', 'index.html', '--ki',
             ','.join(f'{k}={v}' for k, v in params.items())], out, 'weiss')
        setup(black, history); setup(white, history)
        assert board(black) == ref['board'] == board(white), 'Startstellung falsch'
        if mode != 'gnu10':
            white.ask('set_random_seed ' + str(seed))
        passes = 0
        generated = []
        for i in range(600):
            color = 'W' if i % 2 == 0 else 'B'
            active, other = (white, black) if color == 'W' else (black, white)
            move = active.ask('genmove ' + color).upper()
            if move == 'RESIGN':
                raise RuntimeError('Aufgabe trotz Aufgabe aus')
            other.ask(f'play {color} {move}')
            generated.append({'zug': 114 + i, 'farbe': color, 'zugGtp': move})
            write(out, 'fortsetzung.json', generated)
            passes = passes + 1 if move == 'PASS' else 0
            if passes == 2:
                break
        if passes != 2:
            raise RuntimeError('600 weitere Züge ohne zwei Pässe: kein Urteil')
        assert board(black) == board(white), 'Schlussbretter verschieden'
        raw = black.ask('final_score')
        return {'gueltig': True, 'modus': mode, 'seed': seed, 'weitereZuege': len(generated),
                'ende': 'zwei Paesse', 'endstand': raw, 'weissPunkte': score(raw),
                'parameter': params if mode != 'gnu10' else None, 'board': board(black)}
    finally:
        black.close()
        if white:
            white.close()


def main():
    mode, outarg = sys.argv[1:3]
    out = Path(outarg); out.mkdir(parents=True, exist_ok=True)
    history = moves(); ref = json.loads((INPUT / 'referenz.json').read_text())
    assert ref['mc'] == 113 and len(ref['board']) == 361
    meta = {'quellenSha': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
            'eingabenSha256': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in INPUT.iterdir() if p.is_file()},
            'modus': mode, 'gnugo': subprocess.check_output(['/usr/games/gnugo', '--version'], text=True).splitlines()[0]}
    write(out, 'herkunft.json', meta)
    try:
        result = diagnose(out, history, ref) if mode == 'diagnose' else continuation(out, history, ref, mode, int(sys.argv[3]))
        write(out, 'ergebnis.json', result)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        write(out, 'ergebnis.json', {'gueltig': False, 'urteil': 'KEIN URTEIL', 'grund': str(e)})
        raise


if __name__ == '__main__':
    main()
