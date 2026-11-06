#!/usr/bin/env python3
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
"""Gepaarte freie Fortsetzungen für captureCap 0/200, nur nach Go in Actions."""
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('aufgabe113', Path(__file__).with_name('aufgabe-113.py'))
G = importlib.util.module_from_spec(spec)
spec.loader.exec_module(G)
SEEDS = [761, 762]


def write(folder, name, data):
    (folder / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def plan(prepared):
    assert len(prepared['starts']) == 8
    assert len({s['id'] for s in prepared['starts']}) == 8
    return [dict(id=f"{s['id']}-{sims}-{seed}-{cap}", start=s['id'], sims=sims, seed=seed, cap=cap)
            for s in prepared['starts'] for sims in [120, 3000] for seed in SEEDS for cap in [0, 200]]


def to_gtp(index):
    return 'pass' if index < 0 else G.COLS[index % 19] + str(19-index // 19)


def history(start):
    return [('B' if m['color'] == 1 else 'W', to_gtp(m['idx'])) for m in start['history']]


def sgf(start, generated, end, config):
    nodes = []
    for color, move in history(start) + [(m['color'], m['move']) for m in generated]:
        if move.lower() == 'pass':
            pos = ''
        else:
            assert re.fullmatch(r'[A-HJ-T](?:[1-9]|1[0-9])', move)
            pos = chr(97+G.COLS.index(move[0])) + chr(97+19-int(move[1:]))
        nodes.append(f';{color}[{pos}]')
    player = 'B' if start['color'] == 1 else 'W'
    first = history(start)[0][0]
    engine_name = 'Engine captureCap ' + str(config['cap'])
    black = engine_name if player == 'B' else 'GNU Go 1'
    white = engine_name if player == 'W' else 'GNU Go 1'
    return (f'(;GM[1]FF[4]CA[UTF-8]SZ[19]KM[7.5]RU[Chinese]PL[{first}]RE[{end}]'
            f'PB[{black}]PW[{white}]C[Fortsetzung ab Zug {start["mc"]}; Seed {config["seed"]}; Simulationen {config["sims"]}]\n'
            + ''.join(nodes) + ')\n')


def parameters(start, config):
    params = dict(start['params'])
    params.update(captureCap=config['cap'], resignEnabled=0, adaptiveBudgetEnabled=0,
                  mctsFixedSims=config['sims'])
    assert params['deathTransfer'] == 1 and params['mctsRolloutDepth'] == 24
    return params


def play(start, config, out, engine_factory=None, gnugo_factory=None, limit=600):
    params = parameters(start, config)
    color = 'B' if start['color'] == 1 else 'W'
    opponent = 'W' if color == 'B' else 'B'
    gnu_factory = gnugo_factory or (lambda: G.gnugo(1, config['seed'], out, 'gegner'))
    engine_factory = engine_factory or (lambda: G.GTP(
        ['node', 'gtp-ki.js', '--html', 'index.html', '--ki',
         ','.join(f'{k}={v}' for k, v in params.items())], out, 'engine'))
    gnu = gnu_factory()
    engine = None
    try:
        engine = engine_factory()
        G.setup(gnu, history(start)); G.setup(engine, history(start))
        assert G.board(gnu) == start['board'] == G.board(engine), 'Startbretter abweichend'
        engine.ask('set_random_seed ' + str(config['seed']))
        generated, passes = [], 0
        for i in range(limit):
            moving = color if i % 2 == 0 else opponent
            active, other = (engine, gnu) if moving == color else (gnu, engine)
            move = active.ask('genmove ' + moving).upper()
            assert move != 'RESIGN', 'Aufgabe trotz Aufgabe aus'
            assert move == 'PASS' or re.fullmatch(r'[A-HJ-T](?:[1-9]|1[0-9])', move), 'Zug unlesbar'
            other.ask(f'play {moving} {move}')
            generated.append({'mc': start['mc'] + i + 1, 'color': moving, 'move': move})
            write(out, 'fortsetzung.json', generated)
            passes = passes + 1 if move == 'PASS' else 0
            if passes == 2:
                break
        assert passes == 2, 'Zugdeckel: kein Urteil'
        final = G.board(gnu)
        assert final == G.board(engine), 'Schlussbretter abweichend'
        end = gnu.ask('final_score')
        white_score = G.score(end)
        value = white_score if color == 'W' else -white_score
        (out / 'partie.sgf').write_text(sgf(start, generated, end, config))
        return {'gueltig': True, 'config': config, 'startMc': start['mc'], 'engineColor': color,
                'extraMoves': len(generated), 'end': end, 'enginePoints': value, 'won': value > 0,
                'endReason': 'two passes', 'board': final, 'parameters': params}
    finally:
        gnu.close()
        if engine:
            engine.close()


def run(prepared, id_, folder):
    config = next(c for c in plan(prepared) if c['id'] == id_)
    start = next(s for s in prepared['starts'] if s['id'] == config['start'])
    folder.mkdir(parents=True, exist_ok=True)
    actual = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    assert actual == prepared['sourceSha'], 'Gemischte Quellen'
    assert hashlib.sha256((ROOT / 'index.html').read_bytes()).hexdigest() == prepared['engineSha256']
    write(folder, 'herkunft.json', {k: prepared[k] for k in ['sourceSha', 'inputSha256', 'engineSha256']})
    write(folder, 'config.json', config)
    (folder / 'gnugo-version.txt').write_text(subprocess.check_output(['/usr/games/gnugo', '--version'], text=True))
    try:
        write(folder, 'ergebnis.json', play(start, config, folder))
    except Exception as e:
        write(folder, 'ergebnis.json', {'gueltig': False, 'urteil': 'KEIN URTEIL', 'grund': str(e)})
        raise


def report(prepared, folder):
    expected = plan(prepared)
    games = {}
    for config in expected:
        sub = folder / config['id']
        meta = json.loads((sub / 'herkunft.json').read_text())
        assert meta == {k: prepared[k] for k in ['sourceSha', 'inputSha256', 'engineSha256']}, 'Gemischte Quellen'
        result = json.loads((sub / 'ergebnis.json').read_text())
        assert result['gueltig'] and result['config'] == config and result['endReason'] == 'two passes'
        moves = json.loads((sub / 'fortsetzung.json').read_text())
        start = next(s for s in prepared['starts'] if s['id'] == config['start'])
        assert result['parameters'] == parameters(start, config), 'Falsche Parameter'
        assert len(moves) == result['extraMoves'] <= 600 and len(moves) >= 2
        assert moves[-2]['move'] == moves[-1]['move'] == 'PASS'
        expected_color = 'B' if start['color'] == 1 else 'W'
        for i, m in enumerate(moves):
            moving = expected_color if i % 2 == 0 else ('W' if expected_color == 'B' else 'B')
            assert m['mc'] == start['mc']+i+1 and m['color'] == moving, 'Zugnummer/Farbe falsch'
        assert result['engineColor'] == expected_color and result['startMc'] == start['mc']
        points = G.score(result['end']) * (1 if result['engineColor'] == 'W' else -1)
        assert points == result['enginePoints'] and result['won'] == (points > 0), 'Endstand inkonsistent'
        assert (sub / 'partie.sgf').read_text() == sgf(start, moves, result['end'], config)
        games[config['id']] = result
    pairs = []
    for a in expected:
        if a['cap'] != 0:
            continue
        b = next(c for c in expected if c['start'] == a['start'] and c['sims'] == a['sims'] and c['seed'] == a['seed'] and c['cap'] == 200)
        default, cap = games[a['id']], games[b['id']]
        pairs.append({'start': a['start'], 'sims': a['sims'], 'seed': a['seed'],
                      'defaultPoints': default['enginePoints'], 'capPoints': cap['enginePoints'],
                      'deltaCapMinusDefault': cap['enginePoints']-default['enginePoints'],
                      'defaultWon': default['won'], 'capWon': cap['won']})
    summary = {'gueltig': True, 'games': len(games), 'pairs': pairs}
    write(folder, 'bericht.json', summary)
    print(f'Gültig: {len(games)} vollständige Fortsetzungen, {len(pairs)} Paare. Diagnose an vier Ausgangsstellungen, kein allgemeines Spielstärkeurteil.')


def main():
    mode, prepared_file, *args = sys.argv[1:]
    prepared = json.loads(Path(prepared_file).read_text())
    if mode == 'plan':
        print(json.dumps({'include': plan(prepared)}))
    elif mode == 'run':
        run(prepared, args[0], Path(args[1]))
    elif mode == 'report':
        report(prepared, Path(args[0]))
    else:
        raise ValueError('Modus fehlt')


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print('KEIN URTEIL: ' + str(e), file=sys.stderr)
        raise
