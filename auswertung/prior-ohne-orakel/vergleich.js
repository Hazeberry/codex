// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const R = require('../diagnose/wurzel-replay'), Regel = require('./regel');
const {BASELINE} = require('./bericht');
const ARCH = 'docs/daten/leeres-brett/lauf1/g-D.jsonl.gz';
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function dump(html, variante, nr, sha) {
  if (!['alt', 'neu', 'A'].includes(variante) || ![1, 2].includes(nr) || !/^[0-9a-f]{40}$/.test(sha)) throw new Error('ungültiger Vergleichskontext');
  const row = R.lies(ARCH).find(r => r.nr === nr), E = R.ladeEngine(html);
  if (!row) throw new Error('Archivpartie fehlt');
  const replay = R.replay(E, row, {bis: 130, zaehleZufall: true,
    extra: variante === 'A' ? () => ({priorOhneOrakel: {arm: 'A', seed: 222, gegner: 'g', nr}}) : undefined});
  return {version: 1, variante, nr, sha, indexSHA256: hash(html), werkzeugSHA256: hash(__filename),
    replaySHA256: hash(path.join(__dirname, '../diagnose/wurzel-replay.js')), archivSHA256: hash(ARCH), replay};
}
function vergleiche(dumps) {
  const gruende = [], coverage = {S: 0, W: 0}; let stellen = 0;
  const get = (v, nr) => dumps.find(d => d?.variante === v && d?.nr === nr);
  if (dumps.length !== 6 || new Set(dumps.map(d => d?.variante + '/' + d?.nr)).size !== 6) gruende.push('sechs eindeutige Dumps fehlen');
  for (const field of ['werkzeugSHA256', 'replaySHA256', 'archivSHA256'])
    if (!dumps.length || dumps.some(d => !/^[0-9a-f]{64}$/.test(d?.[field] || '') || d[field] !== dumps[0][field])) gruende.push(field + ' uneinheitlich');
  for (const nr of [1, 2]) {
    const alt = get('alt', nr), neu = get('neu', nr), a = get('A', nr);
    if (!alt || !neu || !a || alt.sha !== BASELINE || !/^[0-9a-f]{40}$/.test(neu.sha || '') || neu.sha !== a.sha
        || !/^[0-9a-f]{64}$/.test(neu.indexSHA256 || '') || neu.indexSHA256 !== a.indexSHA256) { gruende.push('Stände fehlen oder weichen ab, Nr. ' + nr); continue; }
    if ([alt, neu, a].some(d => !d.replay || d.replay.abweichung || !Array.isArray(d.replay.zuege) || !d.replay.zuege.length)) { gruende.push('Archivabweichung oder leeres Replay, Nr. ' + nr); continue; }
    const fields = z => [z.mc, z.gewaehlt, z.kids, z.priors, z.statistik, z.zufall];
    if (neu.replay.zuege.length !== alt.replay.zuege.length || a.replay.zuege.length !== alt.replay.zuege.length) gruende.push('Abfragenzahl verschieden, Nr. ' + nr);
    for (let i = 0; i < alt.replay.zuege.length; i++) {
      const old = alt.replay.zuege[i], rows = [old, neu.replay.zuege[i], a.replay.zuege[i]];
      if (rows.some(z => !z)) { gruende.push('Abfrage fehlt, Nr. ' + nr); continue; }
      stellen++;
      for (const z of rows) {
        if (!Number.isSafeInteger(z.zufall) || z.zufall < 0) gruende.push('Zufallszähler fehlt');
        if (Array.isArray(z.kids) && (!Array.isArray(z.priors) || z.priors.length !== z.kids.length || z.priors.some(p => !Number.isFinite(p) || p < 0)
            || !Array.isArray(z.statistik) || z.statistik.length !== z.kids.length || z.statistik.some(k => !Array.isArray(k) || k.length !== 4 || !k.every(Number.isFinite)))) gruende.push('Priors oder Statistik fehlen');
        if (z.kids !== null && !Array.isArray(z.kids)) gruende.push('Kinder fehlen');
        if (z.kids === null && z.priors !== null) gruende.push('Priors ohne Kinder');
      }
      if (JSON.stringify(fields(rows[0])) !== JSON.stringify(fields(rows[1])) || JSON.stringify(fields(rows[0])) !== JSON.stringify(fields(rows[2]))) gruende.push(`Default/A verschieden: Nr. ${nr}, mc=${old.mc}`);
      const p = rows[2].prior;
      const errors = Regel.pruefe(p, {arm: 'A', seed: 222, nr, gegner: 'g'});
      if (p?.suche && !Array.isArray(rows[2].kids)) errors.push('gesuchte Wurzel nicht erfasst');
      if (errors.length) gruende.push(`A-Protokoll: Nr. ${nr}, mc=${old.mc}: ${errors.join('; ')}`);
      if (!errors.length && p?.neu && p.mc >= 80 && p.kinder?.length >= 2 && p.kinder.every(k => Number.isFinite(k.wert))) coverage[p.farbe]++;
    }
  }
  if (!coverage.S || !coverage.W) gruende.push('Auswahlprüfung ab Zug 81 nicht in beiden Farben abgedeckt');
  const neu = get('neu', 1);
  return {version: 1, gueltig: gruende.length === 0, ergebnis: gruende.length ? 'KEIN URTEIL' : 'GLEICH',
    baseline: BASELINE, neu: neu?.sha || null, neuIndexSHA256: neu?.indexSHA256 || null,
    werkzeugSHA256: dumps[0]?.werkzeugSHA256 || null, replaySHA256: dumps[0]?.replaySHA256 || null,
    zufallGeprueft: gruende.length === 0, priorGeprueft: gruende.length === 0,
    coverage, stellen, gruende};
}
module.exports = {dump, vergleiche};
if (require.main === module) {
  const args = process.argv.slice(2), get = k => args[args.indexOf(k) + 1];
  if (args.includes('--dump')) {
    if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('Archivvergleiche ausschließlich in Actions');
    fs.writeFileSync(get('--aus'), JSON.stringify(dump(get('--html'), get('--variante'), +get('--nr'), get('--sha'))) + '\n');
  } else if (args.includes('--vergleich')) {
    const dir = get('--vergleich'), ds = [], errors = [];
    for (const v of ['alt', 'neu', 'A']) for (const nr of [1, 2]) {
      try { ds.push(JSON.parse(fs.readFileSync(path.join(dir, v + '-' + nr + '.json'), 'utf8'))); }
      catch (e) { errors.push(e.message); }
    }
    const r = vergleiche(ds);
    if (errors.length) { r.gueltig = false; r.ergebnis = 'KEIN URTEIL'; r.gruende.push(...errors); }
    fs.writeFileSync(path.join(dir, 'pruefung.json'), JSON.stringify(r, null, 2) + '\n');
    const text = `# Engine-Vergleich Prior ohne Orakel\n\n**${r.ergebnis}**\n\nAlt: ${r.baseline}\n\nNeu: ${r.neu}\n\nAbfragen: ${r.stellen}; Auswahlstellen Schwarz/Weiß: ${r.coverage.S}/${r.coverage.W}.\n\n` + r.gruende.map(g => '- ' + g).join('\n') + '\n';
    fs.writeFileSync(path.join(dir, 'bericht.md'), text); process.stdout.write(text);
    process.exit(r.gueltig ? 0 : 1);
  } else { console.error('--dump oder --vergleich benötigt'); process.exit(2); }
}
