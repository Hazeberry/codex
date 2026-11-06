// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
'use strict';
/* Unabhängige Prüfung aufgezeichneter Zahlen; keine Engine und keine Suche. */
const ARME = ['A', 'H', 'R'];
const SOURCE_FILES = ['index.html', 'gnugo-duell.js', 'auswertung/lebensurteil.js',
  'auswertung/prior-ohne-orakel/regel.js', 'auswertung/prior-ohne-orakel/bericht.js',
  'auswertung/prior-ohne-orakel/paket.py', '.github/workflows/prior-ohne-orakel-probe.yml',
  'auswertung/prior-ohne-orakel/vergleich.js', 'auswertung/prior-ohne-orakel/vorpruefung.js',
  'auswertung/diagnose/wurzel-replay.js', '.github/workflows/prior-ohne-orakel-vergleich.yml',
  'auswertung/kandidaten-orakel/haupt-bericht.js', 'auswertung/messung-zusatz.js', 'auswertung/fuego/bauen.sh'];
function seed(o) {
  let h = 2166136261;
  for (const c of Buffer.from(`prior-ohne-orakel-v1|${o.seed}|${o.gegner}|${o.nr}|${o.mc}`, 'ascii')) h = Math.imul(h ^ c, 16777619) >>> 0;
  return h;
}
function zufall(s) {
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ s >>> 15, 1 | s);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function index(s, n) {
  if (!Number.isInteger(n) || n < 1) throw new Error('leere Zufallsauswahl');
  const rng = zufall(s), grenze = Math.floor(4294967296 / n) * n;
  let u, verworfen = 0;
  do { u = Math.floor(rng() * 4294967296); if (u >= grenze) verworfen++; } while (u >= grenze);
  return {index: u % n, verworfen};
}
function pruefe(e, o) {
  const f = [];
  if (!o || !ARME.includes(o.arm) || !['g', 'f'].includes(o.gegner)
      || !Number.isSafeInteger(o.seed) || o.seed < 0 || !Number.isSafeInteger(o.nr) || o.nr < 1)
    return ['ungültiger Prüfkontext'];
  if (!e || typeof e !== 'object') return ['Ereignis fehlt'];
  for (const k of ['arm', 'seed', 'gegner', 'nr']) if (e[k] !== o[k]) f.push(`Kontext ${k} stimmt nicht`);
  if (e.version !== 1 || !Number.isSafeInteger(e.mc) || e.mc < 0 || !Number.isSafeInteger(e.hash)
      || !['S', 'W'].includes(e.farbe) || !Number.isInteger(e.gespielt) || e.gespielt < -2 || e.gespielt > 360)
    f.push('ungültige Ereignis-Metadaten');
  for (const k of ['fenster', 'suche', 'neu', 'wieder', 'gelegenheit', 'angehoben']) if (typeof e[k] !== 'boolean') f.push(`${k} fehlt`);
  if (e.fenster !== (e.mc >= 80)) f.push('Eingriffsfenster stimmt nicht');
  if (!Array.isArray(e.fehler) || e.fehler.length || e.grund === 'fehler') f.push('Engine meldet Protokollfehler');
  if (e.kinder === null) {
    if (e.suche || e.neu || e.wieder || e.gelegenheit || e.angehoben || e.auswahl !== null || e.ziel !== null
        || e.rSeed !== null || e.verworfen !== 0 || e.summe !== null
        || !['keine-suche', 'pass-vor-suche'].includes(e.grund) || (e.grund === 'pass-vor-suche' && e.gespielt !== -1))
      f.push('ungültiges Ereignis ohne Suche');
    return f;
  }
  if (!Array.isArray(e.kinder)) return [...f, 'Kinderliste fehlt'];
  const K = e.kinder;
  if (K.some(k => !k || typeof k !== 'object')) return [...f, 'ungültiger Kindeintrag'];
  if (new Set(K.map(k => k.idx)).size !== K.length || K.some(k => !Number.isInteger(k.idx) || k.idx < 0 || k.idx > 360)) f.push('ungültiger Kinderbestand');
  if (!e.suche || (!e.neu && !e.wieder)) f.push('Kinder ohne Wurzelbildung oder Baumübernahme');
  if (K.some(k => !Number.isFinite(k.pVor) || k.pVor < 0 || !Number.isFinite(k.pNach) || k.pNach < 0
                || !Number.isInteger(k.n) || k.n < 0 || !Number.isFinite(k.w))) return [...f, 'Priors oder Besuche ungültig'];
  const P = K.map(k => k.pVor), Q = K.map(k => k.pNach), summe = a => a.reduce((s, x) => s + x, 0);
  if ((K.length && (Math.abs(summe(P) - 1) > 1e-9 || Math.abs(summe(Q) - 1) > 1e-9))
      || !Number.isFinite(e.summe) || Math.abs(summe(Q) - e.summe) > 1e-9) f.push('Prior-Summe stimmt nicht');
  let ziel = null, auswahl = null, gelegenheit = false, rSeed = null, verworfen = 0, grund;
  if (!e.neu) grund = 'wurzel-uebernommen';
  else if (e.mc < 80) grund = 'vor-zug81';
  else if (K.length < 2) grund = 'weniger-als-zwei';
  else {
    if (K.some(k => !Number.isFinite(k.wert))) return [...f, 'Auswahlwerte fehlen oder sind nicht endlich'];
    const best = K.reduce((a, k) => k.wert > a.wert || (k.wert === a.wert && k.idx < a.idx) ? k : a);
    auswahl = best.idx;
    const max = Math.max(...P);
    if (best.pVor >= max) grund = 'auswahl-schon-maximal';
    else {
      gelegenheit = true; grund = 'gelegenheit';
      if (o.arm === 'H') ziel = best.idx;
      if (o.arm === 'R') {
        rSeed = seed({...o, mc: e.mc});
        const moeglich = K.filter(k => k.pVor < max).sort((a, b) => a.idx - b.idx);
        const z = index(rSeed, moeglich.length); ziel = moeglich[z.index].idx; verworfen = z.verworfen;
      }
    }
  }
  if ((!e.neu || e.mc < 80 || K.length < 2) && K.some(k => k.wert !== null)) f.push('unerlaubte zusätzliche Bewertung');
  if (e.grund !== grund || e.auswahl !== auswahl || e.gelegenheit !== gelegenheit
      || e.ziel !== ziel || e.angehoben !== (ziel !== null) || e.rSeed !== rSeed || e.verworfen !== verworfen)
    f.push('Auswahl oder Eingriffsart stimmt nicht');
  const erwartet = P.slice();
  if (ziel !== null) {
    const c = K.findIndex(k => k.idx === ziel);
    erwartet[c] = Math.max(...P.filter((_, i) => i !== c));
    const s = summe(erwartet); for (let i = 0; i < erwartet.length; i++) erwartet[i] /= s;
  }
  if (Q.some((q, i) => !Object.is(q, erwartet[i]))) f.push('endgültige Priors entsprechen nicht der Anhebung');
  return f;
}
module.exports = {ARME, SOURCE_FILES, seed, index, pruefe};
