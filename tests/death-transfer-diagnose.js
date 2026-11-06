// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),os=require('os');
const D=require('../auswertung/diagnose/death-transfer');
const {test,pruefe,laufeTests}=require('./rahmen');
test('Archivstellungen und gespiegelte Farbpaarung vollständig',()=>{
 pruefe(D.validate(D.load(false)),'Alle drei Originalverläufe passen');
 const p=D.plan();assert.equal(p.length,32);assert.equal(new Set(p.map(t=>t.id)).size,32);
 for(const t of p)assert(p.some(u=>u.game===t.game&&u.mc===t.mc&&u.sims===t.sims&&u.mirror!==t.mirror));
});
test('Messanker brechen bei verändertem Quelltext ab',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.throws(()=>D.source(html.replace('        v -= _dt;','        v = v - _dt;'),true),/Messanker/);
});
test('Transfer und Gefangene werden getrennt und vorzeichenrichtig gebucht',()=>{
 const E=D.load(true),b=new Uint8Array(361).fill(2);for(let i=0;i<6;i++)b[i]=1;b[6]=b[19]=0;
 Object.assign(E.PARAMS,{captureWeight:20,captureCap:0,deathTransfer:1,deathDiscount:0,deathDiscountSize:6,bensonEval:0,gebietGewicht:0,raumGewicht:0});
 E.evaluateBoard(b,1,{1:2,2:22});const row=globalThis.__leaves.at(-1);
 assert.equal(row.capture,-400);assert.equal(row.transfer,-60+3530);assert.equal(row.raw,row.capture+row.transfer+row.rest);
 E.evaluateBoard(Uint8Array.from(b,x=>x?3-x:0),2,{1:22,2:2});const mirrored=globalThis.__leaves.at(-1);assert.deepStrictEqual(mirrored,row);
});
test('Eine kurze Einzelstellung bleibt mit Messung bitgleich, Q ist rekonstruierbar',()=>{
 const c={game:'partie113',mc:95,mirror:false,sims:4,dose:1,seed:741};
 const a=D.child({...c,measure:false}),b=D.child({...c,measure:true});
 assert.deepStrictEqual(a.fingerprint,b.fingerprint);assert.equal(b.leaves.length,4);
});
test('Vollständiger Bericht und widersprüchliche Quellen werden erkannt',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dt-report-'));
 try{
  for(const task of D.plan()){
   const sub=path.join(dir,task.id);fs.mkdirSync(sub);const sha='a'.repeat(40);
   fs.writeFileSync(path.join(sub,'herkunft.json'),JSON.stringify({sha,inputSha256:'input',engineSha256:'engine'}));
   fs.writeFileSync(path.join(sub,'gueltig.json'),JSON.stringify({gueltig:true,queries:6,task,sha}));
   const rows=[];for(const seed of [741,742])for(const dose of [0,.5,1])rows.push({config:{...task,seed,dose,measure:true},rootEvaluation:{raw:0},fingerprint:{q:0,move:{x:0,y:0}},leaves:Array.from({length:task.sims},()=>({child:0,raw:0,capture:-20,transfer:0,rest:20,value:0}))});
   fs.writeFileSync(path.join(sub,'queries.jsonl'),rows.map(x=>JSON.stringify(x)).join('\n'));
  }
  D.report(dir);const report=JSON.parse(fs.readFileSync(path.join(dir,'bericht.json')));assert.equal(report.queries,192);assert.equal(report.paare.length,64);
  const sub=path.join(dir,D.plan()[1].id),meta=JSON.parse(fs.readFileSync(path.join(sub,'herkunft.json')));meta.engineSha256='anders';fs.writeFileSync(path.join(sub,'herkunft.json'),JSON.stringify(meta));assert.throws(()=>D.report(dir),/Gemischte Quellen/);
 }finally{fs.rmSync(dir,{recursive:true});}
});
test('Fehlendes Pflichtpaket liefert kein Urteil',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dt-test-'));try{assert.throws(()=>D.report(dir));}finally{fs.rmSync(dir,{recursive:true});}
});
laufeTests('deathTransfer-Diagnose').then(ok=>{process.exitCode=ok?0:1;});
