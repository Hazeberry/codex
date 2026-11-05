#!/usr/bin/env python3
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
"""Begrenzte Diagnose des Vierarm-Archivs; Reproduktionen nur in Actions."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

BASE = Path('docs/daten/kandidaten-orakel/vierarm-lauf1')
HIST = '8740574aa6f3d572b1d234d58202008d71404fb2'


def save(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def rows(path):
    with gzip.open(path, 'rt') as stream:
        return [json.loads(line) for line in stream if line.strip()]


def choose(root=BASE):
    selected = []
    overview = []
    for arm in ['A', 'N', 'P', 'S']:
        path = root / 'roh' / f'g-{arm}.jsonl.gz'
        hits = [r for r in rows(path) if r['nr'] == 127]
        if len(hits) != 1 or 'SIGSEGV' not in hits[0].get('abgebrochen', ''):
            raise ValueError(f'GNU Go {arm}: erwarteter Archivabbruch fehlt')
        selected.append(dict(id=f'g-{arm}-127', gegner='g', arm=arm, nr=127,
                             seed=234, archiv=hits[0]))
    for arm in ['A', 'N', 'P', 'S']:
        data = rows(root / 'roh' / f'f-{arm}.jsonl.gz')
        valid = [r for r in data if not r.get('abgebrochen')]
        if not valid or any(not isinstance(r.get('kandidatenOrakel', {}).get('partieMs'), (float, int))
                            for r in valid):
            raise ValueError(f'Fuego {arm}: Laufzeiten fehlen')
        slow = max(valid, key=lambda r: r['kandidatenOrakel']['partieMs'])
        overview.append(dict(arm=arm, n=len(valid), maximumMs=slow['kandidatenOrakel']['partieMs'],
                             nummer=slow['nr'], zuege=slow['zuegeAnzahl'],
                             orakelMs=slow['kandidatenOrakel']['abfrageMs']))
        if arm in ['P', 'S']:
            selected.append(dict(id=f'f-{arm}-{slow["nr"]}', gegner='f', arm=arm,
                                 nr=slow['nr'], seed=235, archiv=slow))
    return selected, overview


def instrument(source):
    """Nur Diagnosekopie des historischen Harness; jede Ersetzungsstelle muss eindeutig sein."""
    def replace(old, new):
        nonlocal source
        if source.count(old) != 1:
            raise ValueError('Instrumentierung nicht eindeutig: ' + old[:70])
        source = source.replace(old, new)
    replace('function gtpStarten(programm, argumente, name) {', '''
let __diagId = 0;
function __diag(data) {
  fs.appendFileSync(process.env.DIAG_TRACE, JSON.stringify({t: Number(process.hrtime.bigint()) / 1e6, ...data}) + '\\n');
}
function gtpStarten(programm, argumente, name) {
  const diagId = ++__diagId;
  __diag({type:'process', id:diagId, name, programm, argumente});''')
    replace("p.on('exit', (code, sig) => {", "p.on('exit', (code, sig) => {\n    __diag({type:'exit', id:diagId, code, sig, stderr});")
    replace('const frage = befehl => new Promise((ok, fehler) => {',
            'const frageRoh = befehl => new Promise((ok, fehler) => {')
    replace("return {frage, ende: () => { try { p.stdin.write('quit\\n'); } catch (e) {} p.kill(); }};", '''
  const frage = async befehl => {
    const t = Number(process.hrtime.bigint()) / 1e6;
    __diag({type:'request', id:diagId, befehl});
    try {
      const antwort = await frageRoh(befehl);
      __diag({type:'response', id:diagId, befehl, antwort, ms:Number(process.hrtime.bigint()) / 1e6-t});
      return antwort;
    } catch (e) {
      __diag({type:'error', id:diagId, befehl, fehler:e.message, ms:Number(process.hrtime.bigint()) / 1e6-t});
      throw e;
    }
  };
  return {frage, ende: () => { try { p.stdin.write('quit\\n'); } catch (e) {} p.kill(); }};''')
    call = "const r = E.getAIMove(board, f, Array.from(hist), {...caps}, mc, 'hard', 1, ko, last, extra);"
    replace(call, '''const __t = Number(process.hrtime.bigint()) / 1e6, __cpu = process.cpuUsage();
        __diag({type:'ai-start', mc, zuege:zuege.slice(), board:Array.from(board)});
        ''' + call + '''
        const __used = process.cpuUsage(__cpu);
        __diag({type:'ai-end', mc, ms:Number(process.hrtime.bigint()) / 1e6-__t,
          cpuMs:(__used.user+__used.system)/1000, r,
          prot:E.kandidatenProtokoll ? E.kandidatenProtokoll() : null});''')
    return source


def trace_summary(events):
    processes = {e['id']: e for e in events if e['type'] == 'process'}
    times = {}
    for e in events:
        if e['type'] == 'ai-end':
            key = 'KI'
        elif e['type'] in ['response', 'error']:
            p = processes[e['id']]
            role = p['name']
            if role == 'GNU Go':
                role += ' Stufe ' + p['argumente'][p['argumente'].index('--level') + 1]
            key = role + ': ' + e['befehl'].split()[0]
        else:
            continue
        v = times.setdefault(key, dict(n=0, ms=0, maxMs=0))
        v['n'] += 1
        v['ms'] += e['ms']
        v['maxMs'] = max(v['maxMs'], e['ms'])
    first = next((e['mc'] for e in events if e['type'] == 'ai-end'
                  and (e.get('prot') or {}).get('fall') in ['c', 'd', 'd1']), None)
    crashes = []
    for e in events:
        if e['type'] != 'exit' or e.get('sig') != 'SIGSEGV':
            continue
        p = processes[e['id']]
        prior = [v for v in events if v.get('id') == e['id'] and v['t'] <= e['t']]
        commands = [v['befehl'] for v in prior if v['type'] == 'request']
        moves = []
        for v in prior:
            if v['type'] != 'response':
                continue
            if v['befehl'].startswith('play '):
                moves.append(v['befehl'])
            elif v['befehl'].startswith('genmove '):
                moves.append('play ' + v['befehl'].split()[1] + ' ' + v['antwort'])
        crashes.append(dict(process=p, befehl=commands[-1] if commands else None,
                            moves=moves, commands=commands, ersterAusloeserMc=first))
    return dict(zeiten=times, abstuerze=crashes, ersterAusloeserMc=first)


def run_bounded(args, cwd, log, env=None, seconds=1800, stdin=None):
    with open(log, 'w') as output:
        p = subprocess.Popen(args, cwd=cwd, env=env, stdout=output, stderr=subprocess.STDOUT,
                             stdin=subprocess.PIPE if stdin is not None else subprocess.DEVNULL,
                             text=True, start_new_session=True)
        try:
            p.communicate(stdin, timeout=seconds)
            return dict(code=p.returncode, timeout=False)
        except subprocess.TimeoutExpired:
            os.killpg(p.pid, signal.SIGKILL)
            p.communicate()
            return dict(code=p.returncode, timeout=True)


def replay(case, out):
    out = out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    save(out / 'fall.json', case)
    historic = Path('historisch').resolve()
    meta_path = BASE / 'meta' / f'{case["gegner"]}-{case["arm"]}-{((case["nr"]-1)//(30 if case["gegner"]=="g" else 20))*(30 if case["gegner"]=="g" else 20)+1}.jsonl.meta.json'
    meta = json.loads(meta_path.read_text())
    for path in ['index.html', 'gnugo-duell.js', 'auswertung/lebensurteil.js']:
        if hashlib.sha256((historic / path).read_bytes()).hexdigest() != meta['quellen'][path]:
            raise ValueError('Historischer Hash passt nicht: ' + path)
    harness = historic / 'gnugo-duell-diagnose.js'
    harness.write_text(instrument((historic / 'gnugo-duell.js').read_text()))
    env = dict(os.environ, DIAG_TRACE=str(out / 'trace.jsonl'))
    args = ['node', harness.name, '--partien', '1', '--von', str(case['nr']),
            '--seed', str(case['seed']), '--stufe', '1', '--vorgabe', '0',
            '--maxzuege', '600', '--schaetzung', '40,80,120,200', '--gnugo-aufgabe', '0',
            '--ki', 'mctsFixedSims=120,resignEnabled=0', '--kandidaten-orakel', case['arm'],
            '--kandidaten-ab', '80', '--roh', str(out / 'roh.jsonl')]
    if case['gegner'] == 'f':
        args += ['--gegner', 'fuego', '--fuego', str(Path('fuego-bin/fuego').resolve()), '--fuego-spiele', '100']
    begin = time.monotonic()
    result = run_bounded(args, historic, out / 'partie.log', env,
                         seconds=600 if case['gegner'] == 'g' else 1800)
    result['wandMs'] = (time.monotonic() - begin) * 1000
    events = [json.loads(l) for l in (out / 'trace.jsonl').read_text().splitlines()]
    result.update(trace_summary(events))
    raw = out / 'roh.jsonl'
    result['roh'] = json.loads(raw.read_text().splitlines()[0]) if raw.exists() and raw.stat().st_size else None
    archive = case['archiv']
    if case['gegner'] == 'f':
        result['reproduziert'] = bool(result['roh'] and not result['timeout'] and result['code'] == 0
                                      and result['roh'].get('zuege') == archive['zuege']
                                      and result['roh'].get('endstand') == archive['endstand'])
    else:
        result['reproduziert'] = bool(not result['timeout'] and result['code'] == 0 and result['abstuerze']
                                      and 'SIGSEGV' in (result['roh'] or {}).get('abgebrochen', ''))
    if case['id'] == 'g-A-127' and result['abstuerze']:
        crash = result['abstuerze'][0]
        # Ursprüngliche GTP-Kommandos, einschließlich vorheriger genmove-Abfragen: RNG-Verlauf erhalten.
        (out / 'repro.gtp').write_text('\n'.join(crash['commands']) + '\n')
        result['gdb'] = run_bounded(['gdb', '-batch', '-ex', 'run', '-ex', 'bt', '--args',
                                     crash['process']['programm'], *crash['process']['argumente']],
                                    historic, out / 'gdb.log', seconds=120,
                                    stdin='\n'.join(crash['commands']) + '\n')
    save(out / 'ergebnis.json', result)
    if not result['reproduziert']:
        raise ValueError('KEIN URTEIL: Reproduktion fehlgeschlagen; Teilprotokolle gesichert')


def report(root):
    plan = json.loads((root / 'plan.json').read_text())
    lines = ['# Diagnose Laufzeit und Absturz', '', 'Historischer Stand: `' + HIST + '`.',
             '', 'Diagnostischer Lauf; keine neue Messung der Spielstärke.', '']
    all_ok = True
    crashes = []
    for case in plan['faelle']:
        path = root / case['id'] / 'ergebnis.json'
        if not path.exists():
            all_ok = False
            lines += [f'## {case["id"]}', '', 'KEIN URTEIL: Ergebnis fehlt.', '']
            continue
        r = json.loads(path.read_text())
        all_ok &= r['reproduziert']
        lines += [f'## {case["id"]}', '',
                  f'Reproduktion: {r["reproduziert"]}; neue Dauer {r["wandMs"]/1000:.1f} s.', '']
        if case['gegner'] == 'f':
            a = case['archiv']
            lines += [f'Archiv: {a["kandidatenOrakel"]["partieMs"]/1000:.1f} s, {a["zuegeAnzahl"]} Züge.',
                      'Zugfolge und Endstand werden exakt gegen das Archiv geprüft.', '']
        lines += ['| Komponente | Abfragen | Summe s | Maximum s |', '|---|---:|---:|---:|']
        for name, v in sorted(r['zeiten'].items(), key=lambda kv: -kv[1]['ms']):
            lines.append(f'| {name} | {v["n"]} | {v["ms"]/1000:.3f} | {v["maxMs"]/1000:.3f} |')
        lines += ['']
        if case['gegner'] == 'g':
            c = r['abstuerze'][0] if r['abstuerze'] else None
            crashes.append(c)
            if c:
                lines += [f'Erster SIGSEGV nach {len(c["moves"])} Zügen bei `{c["befehl"]}`; '
                          f'erster Auslöser mc={r["ersterAusloeserMc"]}.', '']
    if len(crashes) == 4 and all(crashes):
        common = all(c['moves'] == crashes[0]['moves'] for c in crashes)
        before = all(c['ersterAusloeserMc'] is None or len(c['moves']) <= c['ersterAusloeserMc'] for c in crashes)
        lines += ['## Gemeinsame Absturzstellung', '',
                  f'Alle vier reproduzierten Zugfolgen bis zum ersten SIGSEGV gleich: {common}.',
                  f'Kein vorheriger Auslöser c/d/d1 in jedem Arm: {before}.',
                  'Das identifiziert die erreichte Stellung und die zeitliche Lage zum Eingriff; '
                  'es erklärt noch keinen Fehler im GNU-Go-Quellcode.', '']
        all_ok &= common
    lines += ['## Grenzen', '',
              'Zeitanteile stammen aus instrumentierten Wiederholungen auf anderen Runnern. '
              'Die historischen Archive enthalten keine vollständige Zeitzerlegung; '
              'gleiche Gesamtsekunden werden nicht vorausgesetzt. '
              'Nicht identische Zugfolgen erlauben keine Erklärung der historischen langsamen Partie.',
              'GNU-Go-Verwandtschaft und Nutzen einer internen Prior-Auswahl werden hier nicht getestet.', '',
              '**GÜLTIG**' if all_ok else '**KEIN URTEIL**: Mindestens eine Pflicht-Reproduktion fehlt oder weicht ab.']
    (root / 'bericht.md').write_text('\n'.join(lines) + '\n')
    return all_ok


def main():
    mode = sys.argv[1]
    out = Path(sys.argv[2])
    if mode == 'plan':
        out.mkdir(parents=True, exist_ok=True)
        cases, overview = choose()
        save(out / 'plan.json', dict(quelle=HIST, faelle=cases, fuegoMaxima=overview))
        print(json.dumps({'include': [{'id': c['id'], 'gegner': c['gegner']} for c in cases]}))
    elif mode == 'replay':
        if os.environ.get('GITHUB_ACTIONS') != 'true':
            raise ValueError('Reproduktionen ausschließlich in GitHub Actions')
        cases = json.loads((out / 'plan.json').read_text())['faelle']
        case = next(c for c in cases if c['id'] == sys.argv[3])
        replay(case, out / case['id'])
    elif mode == 'report':
        sys.exit(0 if report(out) else 1)
    else:
        raise ValueError('Unbekannter Modus')


if __name__ == '__main__':
    main()
