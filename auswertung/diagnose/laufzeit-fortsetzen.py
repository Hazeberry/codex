#!/usr/bin/env python3
# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
"""Nur abgeschlossene, passende Diagnosefälle übernehmen; keine neuen Reproduktionen."""
import hashlib
import ast
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys


def resume(previous, target, run, get_source):
    if not re.fullmatch(r'[1-9][0-9]*', run):
        raise ValueError('Ungültige Vorlaufnummer')
    old_sha = (previous / 'diagnose-plan/quellen-sha.txt').read_text().strip()
    if not re.fullmatch(r'[0-9a-f]{40}', old_sha):
        raise ValueError('Ungültige Quellen-SHA des Vorlaufs')
    source = Path('auswertung/diagnose/laufzeit-absturz.py')
    old_source = get_source(old_sha, source.as_posix())
    current_source = source.read_bytes()
    def replay_code(data):
        tree = ast.parse(data)
        # Der Bericht läuft erst nach den Reproduktionen. Sein Text und die
        # Behandlung der untersuchten Hypothese dürfen berichtigt werden;
        # sämtliche übrigen Funktionen, Konstanten und Aufrufe müssen gleich sein.
        tree.body = [node for node in tree.body
                     if not (isinstance(node, ast.FunctionDef) and node.name == 'report')]
        return ast.dump(tree, include_attributes=False).encode()
    old_replay = replay_code(old_source)
    if old_replay != replay_code(current_source):
        raise ValueError('Reproduktionscode unterscheidet sich vom Vorlauf')
    old_plan = json.loads((previous / 'diagnose-plan/plan.json').read_text())
    plan = json.loads((target / 'plan.json').read_text())
    if old_plan != plan:
        raise ValueError('Historische Quelle oder ausgewählte Archivfälle unterscheiden sich')
    copied, missing = [], []
    for case in plan['faelle']:
        folder = previous / ('diagnose-' + case['id'])
        result_file = folder / 'ergebnis.json'
        if not result_file.exists():
            missing.append(dict(id=case['id'], gegner=case['gegner']))
            continue
        result = json.loads(result_file.read_text())
        if not result.get('reproduziert'):
            missing.append(dict(id=case['id'], gegner=case['gegner']))
            continue
        if json.loads((folder / 'fall.json').read_text()) != case:
            raise ValueError('Fall-Metadaten weichen ab: ' + case['id'])
        if not (folder / 'trace.jsonl').is_file() or not (folder / 'roh.jsonl').is_file():
            raise ValueError('Pflichtrohdaten fehlen: ' + case['id'])
        shutil.copytree(folder, target / case['id'])
        copied.append(case['id'])
    if not copied or not missing:
        raise ValueError('Fortsetzung erwartet bestandene und noch fehlende Fälle')
    provenance = dict(vorlauf=run, quellenSha=old_sha, diagnoseSha256=hashlib.sha256(old_source).hexdigest(),
                      diagnoseAktuellSha256=hashlib.sha256(current_source).hexdigest(),
                      reproduktionAstSha256=hashlib.sha256(old_replay).hexdigest(),
                      uebernommen=copied, neu=[v['id'] for v in missing])
    (target / 'fortsetzung.json').write_text(json.dumps(provenance, indent=2) + '\n')
    return {'include': missing}


if __name__ == '__main__':
    get_source = lambda sha, path: subprocess.check_output(['git', 'show', sha + ':' + path])
    print(json.dumps(resume(Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3], get_source)))
