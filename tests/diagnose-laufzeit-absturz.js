// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
'use strict';
const {spawnSync} = require('child_process');
const path = require('path');
const r = spawnSync('python3', ['-c', String.raw`
import sys
sys.dont_write_bytecode = True
import importlib.util, tempfile, json, gzip, subprocess
from pathlib import Path
spec = importlib.util.spec_from_file_location('diag', 'auswertung/diagnose/laufzeit-absturz.py')
d = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    (root/'roh').mkdir()
    def write(name, data):
        with gzip.open(root/'roh'/name, 'wt') as f:
            for row in data: f.write(json.dumps(row)+'\n')
    for arm in ['A','N','P','S']:
        write('g-'+arm+'.jsonl.gz', [{'nr':127, 'abgebrochen':'signal SIGSEGV'}])
        write('f-'+arm+'.jsonl.gz', [
          {'nr':1,'zuegeAnzahl':100,'kandidatenOrakel':{'partieMs':2,'abfrageMs':1}},
          {'nr':2,'zuegeAnzahl':200,'kandidatenOrakel':{'partieMs':9,'abfrageMs':2}}])
    cases, overview = d.choose(root)
    assert len(cases)==6 and len(overview)==4
    assert [c['nr'] for c in cases if c['gegner']=='f']==[2,2]
    spec2 = importlib.util.spec_from_file_location('resume', 'auswertung/diagnose/laufzeit-fortsetzen.py')
    resume = importlib.util.module_from_spec(spec2); spec2.loader.exec_module(resume)
    previous, target = root/'previous', root/'target'
    (previous/'diagnose-plan').mkdir(parents=True); target.mkdir()
    plan = {'quelle':d.HIST,'faelle':cases,'fuegoMaxima':overview}
    (previous/'diagnose-plan/plan.json').write_text(json.dumps(plan))
    (previous/'diagnose-plan/quellen-sha.txt').write_text('a'*40)
    (target/'plan.json').write_text(json.dumps(plan))
    folder = previous/('diagnose-'+cases[1]['id']); folder.mkdir()
    (folder/'fall.json').write_text(json.dumps(cases[1]))
    (folder/'ergebnis.json').write_text(json.dumps({'reproduziert':True}))
    (folder/'trace.jsonl').write_text('{}\n'); (folder/'roh.jsonl').write_text('{}\n')
    src = Path('auswertung/diagnose/laufzeit-absturz.py').read_bytes()
    matrix = resume.resume(previous,target,'123',lambda sha,path:src)
    assert len(matrix['include'])==5
    assert cases[1]['id'] not in [c['id'] for c in matrix['include']]
    assert (target/cases[1]['id']/'trace.jsonl').exists()
    target2 = root/'target2'; target2.mkdir()
    (target2/'plan.json').write_text(json.dumps(plan))
    changed_report = src.replace(b'    all_ok = True', b'    all_ok = False')
    assert changed_report != src
    assert len(resume.resume(previous,target2,'123',lambda sha,path:changed_report)['include'])==5
    for run,getter in [('invalid',lambda sha,path:src),('123',lambda sha,path:b'anders')]:
        try: resume.resume(previous,target,run,getter)
        except ValueError: pass
        else: raise AssertionError('ungültiger Vorlauf akzeptiert')
    write('g-A.jsonl.gz', [{'nr':127, 'abgebrochen':'anderer Fehler'}])
    try: d.choose(root)
    except ValueError: pass
    else: raise AssertionError('fehlender SIGSEGV akzeptiert')
    source = Path('gnugo-duell.js').read_text()
    js = root/'diag.js'; js.write_text(d.instrument(source))
    subprocess.run(['node','--check',str(js)],check=True)
    try: d.instrument(source.replace('function gtpStarten', 'function andereFunktion'))
    except ValueError: pass
    else: raise AssertionError('nicht passende Quelle akzeptiert')
events = [
 {'type':'process','id':1,'name':'GNU Go','argumente':['--level','1'],'t':0},
 {'type':'request','id':1,'befehl':'play W D4','t':1},
 {'type':'response','id':1,'befehl':'play W D4','antwort':'','ms':2,'t':3},
 {'type':'request','id':1,'befehl':'genmove B','t':4},
 {'type':'response','id':1,'befehl':'genmove B','antwort':'Q16','ms':3,'t':7},
 {'type':'ai-end','mc':80,'ms':10,'prot':{'fall':'c'},'t':18},
 {'type':'request','id':1,'befehl':'genmove B','t':19},
 {'type':'exit','id':1,'sig':'SIGSEGV','t':20},
 {'type':'error','id':1,'befehl':'genmove B','ms':1,'t':21}]
s = d.trace_summary(events)
assert s['ersterAusloeserMc']==80
assert s['abstuerze'][0]['moves']==['play W D4','play B Q16']
assert s['abstuerze'][0]['befehl']=='genmove B'
assert s['zeiten']['GNU Go Stufe 1: genmove']['ms']==4
assert s['zeiten']['KI']['ms']==10
print('Diagnose: Auswahl, Archive, Instrumentierung, Zeit-/Absturzzuordnung und geprüfte Fortsetzung bestanden.')
`], {cwd: path.join(__dirname, '..'), encoding:'utf8'});
process.stdout.write(r.stdout || '');
process.stderr.write(r.stderr || '');
if (r.error) console.error(r.error.message);
process.exit(r.status === 0 ? 0 : 1);
