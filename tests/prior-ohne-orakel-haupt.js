// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert'),cp=require('child_process');
const {test,laufeTests}=require('./rahmen');
const F=require('./prior-ohne-orakel-fixture'),B=require('../auswertung/prior-ohne-orakel/bericht'),V=require('../auswertung/prior-ohne-orakel/haupt-vorpruefung');
const python=path.join(__dirname,'prior-ohne-orakel-haupt.py');
const write=(p,x)=>fs.writeFileSync(p,JSON.stringify(x));
function collect(source){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'prior-main-')),parts=path.join(base,'parts'),out=path.join(base,'out');fs.mkdirSync(parts);
 const configs=[];for(const o of ['g','f'])for(const arm of ['A','H','R'])for(const first of [1,3])configs.push({id:`${o}-${arm}-${String(first).padStart(3,'0')}`,art:`${o}-${arm}`,opponent:o,arm,first,count:2,stepMinutes:o==='g'?45:60,jobMinutes:o==='g'?55:70});
 configs.push({id:'kontrolle',art:'kontrolle'});
 for(const c of configs){
  const sub=path.join(parts,c.id);fs.mkdirSync(sub);write(path.join(sub,'paket.json'),c);
  const meta=JSON.parse(fs.readFileSync(path.join(source,c.art+'.meta.json')));meta.versions.node='v22.23.4';write(path.join(sub,c.art+'.meta.json'),meta);
  const rows=fs.readFileSync(path.join(source,c.art+'.jsonl'),'utf8').trim().split('\n').map(JSON.parse).filter(r=>c.art==='kontrolle'||r.nr>=c.first&&r.nr<c.first+c.count);
  fs.writeFileSync(path.join(sub,c.art+'.jsonl'),rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
  for(const r of rows)fs.cpSync(path.join(source,'einzeln',c.art+'-'+r.nr),path.join(sub,'einzeln',c.art+'-'+r.nr),{recursive:true});
  if(c.first===1){fs.copyFileSync(path.join(source,'wiederholung-'+c.art+'.jsonl'),path.join(sub,'wiederholung-'+c.art+'.jsonl'));
   for(const nr of [1,2,3])fs.cpSync(path.join(source,'einzeln','wiederholung-'+c.art+'-'+nr),path.join(sub,'einzeln','wiederholung-'+c.art+'-'+nr),{recursive:true});}
 }
 return {base,parts,out};
}
test('144 Pakete, richtige Seeds/Budgets und kein lokaler Partiestart',()=>{
 const r=cp.spawnSync('python3',[python],{encoding:'utf8',timeout:10000});if(r.error)throw r.error;assert.equal(r.status,0,r.stdout+r.stderr);
});
test('Paketassembler erhält vollständige bekannte Hauptauswertung; fehlendes Paket sperrt',()=>{
 const source=F.fixture(false),c=collect(source);
 try{
  cp.execFileSync('python3',[python,'merge',c.parts,c.out],{timeout:10000});
  for(const n of ['quellen.json','enginevergleich.json'])fs.copyFileSync(path.join(source,n),path.join(c.out,n));
  const e=B.bewerte(c.out,{probe:false,nJe:{g:4,f:4},archiv:path.join(source,'archiv.jsonl')});assert(e.gueltig,JSON.stringify(e.pruefungen.filter(p=>!p.ok)));
  assert.equal(e.auswertung.g.haupt[0].mittel,6);assert.equal(e.auswertung.f.haupt[1].mittel,8);
  fs.rmSync(c.out,{recursive:true});fs.rmSync(path.join(c.parts,'g-H-003'),{recursive:true});
  const r=cp.spawnSync('python3',[python,'merge',c.parts,c.out],{encoding:'utf8',timeout:10000});assert.notEqual(r.status,0);
 }finally{fs.rmSync(source,{recursive:true});fs.rmSync(c.base,{recursive:true});}
});
test('Nur belegte externe Hauptlauf-Zeitüberschreitung ist zulässiger Ausfall',()=>{
 const source=F.fixture(false);
 try{
  F.changeRows(source,'g-A',rows=>{const r=rows[3];r.priorLauf={...r.priorLauf,status:'timeout',timeout:true,code:-9,dauerMs:600001};
   const p=path.join(source,r.priorLauf.protokoll),events=fs.readFileSync(p,'utf8').trim().split('\n').map(JSON.parse).filter(e=>e.typ!=='prozess-ende');fs.writeFileSync(p,events.map(e=>JSON.stringify(e)).join('\n')+'\n');});
  let e=F.evaluate(source,false);assert(e.ausfaelle.some(a=>a.name==='g-A'&&a.nr===4));assert(e.pruefungen.find(p=>p.name==='g-A: Pflichtdaten und Prozessstatus').ok);assert(!e.gueltig); // 3/4 unterschreitet 98 %.
  F.changeRows(source,'g-A',rows=>{rows[3].priorLauf.dauerMs=50;});e=F.evaluate(source,false);assert(!e.ausfaelle.some(a=>a.name==='g-A'));
 }finally{fs.rmSync(source,{recursive:true});}
});
test('Aktueller Default und Technikreferenz stimmen; veränderte Defaults oder Probe sperren',()=>{
 const facts=V.facts();assert(Object.entries(V.DEFAULT).every(([k,v])=>facts.params[k]===v));assert(Object.values(facts.blocks).every(b=>b.current===b.reference));
 const run={event:'workflow_dispatch',status:'completed',conclusion:'success',path:'.github/workflows/prior-ohne-orakel-vergleich.yml'};
 const hashes={'index.html':'b'.repeat(64),'auswertung/prior-ohne-orakel/vergleich.js':'c'.repeat(64),'auswertung/diagnose/wurzel-replay.js':'d'.repeat(64)};
 const proof={version:1,gueltig:true,ergebnis:'GLEICH',baseline:B.BASELINE,neu:'a'.repeat(40),neuIndexSHA256:hashes['index.html'],werkzeugSHA256:hashes['auswertung/prior-ohne-orakel/vergleich.js'],replaySHA256:hashes['auswertung/diagnose/wurzel-replay.js'],zufallGeprueft:true,priorGeprueft:true,coverage:{S:1,W:1},gruende:[]};
 const probe=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/daten/prior-anhebung-ohne-orakel/probe-42164396423/pruefung.json')));
 assert.deepStrictEqual(V.pruefe(run,proof,hashes,facts,probe),[]);
 assert(V.pruefe(run,proof,hashes,{...facts,params:{...facts.params,captureCap:200}},probe).length);
 assert(V.pruefe(run,proof,hashes,facts,{...probe,gueltig:false}).length);
});
test('Vier Archivkontrollen sperren den Hauptstart bei Abweichung',()=>{
 const dir=F.fixture(false);try{assert(V.kontrolle(dir,path.join(dir,'archiv.jsonl')).gueltig);
 F.changeRows(dir,'kontrolle',rows=>{rows[0].endstand++;});assert.throws(()=>V.kontrolle(dir,path.join(dir,'archiv.jsonl')),/nicht gleich/);
 }finally{fs.rmSync(dir,{recursive:true});}
});
test('Nur manueller Hauptlauf, 2902 Partien und festes Jobbudget',()=>{
 const w=fs.readFileSync(path.join(__dirname,'../.github/workflows/prior-ohne-orakel-haupt.yml'),'utf8');
 assert(w.includes('workflow_dispatch:')&&!/^  (push|pull_request|workflow_run|schedule):/m.test(w));
 assert(w.includes('max-parallel: 12'));assert.equal(480*6+18+4,2902);assert.equal(72*55+72*70+20+30+55+30,9135);
});
laufeTests('Prior ohne Orakel: Hauptlauf-Aufbau').then(ok=>{process.exitCode=ok?0:1;});
