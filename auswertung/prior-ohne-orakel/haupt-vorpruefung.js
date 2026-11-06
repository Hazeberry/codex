// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
'use strict';
const fs=require('fs'),crypto=require('crypto'),cp=require('child_process'),path=require('path');
const V=require('./vorpruefung');
const PROBE='6bfaa33d69822f13a049b5813d4b6c77b63b61a3';
const DEFAULT={captureCap:0,deathTransfer:1,mctsRolloutDepth:24,mctsValueScale:200,resignEnabled:1,mctsFixedSims:0,adaptiveBudgetEnabled:1,aiTimeBudget:1800,mctsTreeReuse:1};
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function pruefe(run,proof,hashes,facts,probe){
 const errors=V.pruefe(run,proof,hashes);
 if(!facts||facts.reference!==PROBE||!facts.blocks||!['shared-go-logic','worker-ai'].every(k=>facts.blocks[k]?.current===facts.blocks[k]?.reference&&/^[0-9a-f]{64}$/.test(facts.blocks[k]?.current||'')))errors.push('Engine weicht von technisch geprüfter Fassung ab');
 if(!facts?.params||Object.entries(DEFAULT).some(([k,v])=>facts.params[k]!==v))errors.push('Defaultparameter geändert');
 if(!probe||!probe.probe||!probe.gueltig||probe.nJe?.g!==8||probe.nJe?.f!==4||!Array.isArray(probe.pruefungen)||probe.pruefungen.length!==70||probe.pruefungen.some(p=>!p.ok)||probe.auswertung!==null)errors.push('gültige technische Probe fehlt');
 return errors;
}
function facts(){
 const html=fs.readFileSync('index.html','utf8'),old=cp.execFileSync('git',['show',`${PROBE}:index.html`],{encoding:'utf8'});
 const extract=(h,id)=>{const m=new RegExp(`<script id="${id}">([\\s\\S]*?)</script>`).exec(h);if(!m)throw Error('Engine-Block fehlt');return m[1];};
 const E=require('../../tests/rahmen').ladeKI({mitNetz:false});
 return {reference:PROBE,params:Object.fromEntries(Object.keys(DEFAULT).map(k=>[k,E.PARAMS[k]])),blocks:Object.fromEntries(['shared-go-logic','worker-ai'].map(k=>[k,{current:hash(extract(html,k)),reference:hash(extract(old,k))}]))};
}
function kontrolle(dir,archiv='docs/daten/leeres-brett/lauf1/g-D.jsonl.gz'){
 const zlib=require('zlib'),raw=fs.readFileSync(archiv),text=(archiv.endsWith('.gz')?zlib.gunzipSync(raw):raw).toString('utf8');
 const reference=text.trim().split('\n').map(JSON.parse).filter(r=>r.nr>=1&&r.nr<=4);
 const current=fs.readFileSync(path.join(dir,'kontrolle.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
 if(reference.length!==4||current.length!==4||new Set(current.map(r=>r.nr)).size!==4)throw Error('Archivkontrolle unvollständig');
 for(const a of reference){const b=current.find(r=>r.nr===a.nr);if(!b||b.priorLauf?.status!=='ok'||b.priorLauf.timeout||b.priorLauf.code!==0||b.endstand!==a.endstand||JSON.stringify(b.zuege)!==JSON.stringify(a.zuege))throw Error('Archivkontrolle nicht gleich');}
 return {gueltig:true,partien:4};
}
module.exports={pruefe,facts,kontrolle,DEFAULT,PROBE};
if(require.main===module){
 try{
  const [runFile,proofFile,out]=process.argv.slice(2);
  if(runFile==='--kontrolle'){console.log(JSON.stringify(kontrolle(proofFile)));}else{
  const run=JSON.parse(fs.readFileSync(runFile)),proof=JSON.parse(fs.readFileSync(proofFile));
  const hashes=Object.fromEntries(['index.html','auswertung/prior-ohne-orakel/vergleich.js','auswertung/diagnose/wurzel-replay.js'].map(f=>[f,hash(fs.readFileSync(f))]));
  const f=facts(),probe=JSON.parse(fs.readFileSync('docs/daten/prior-anhebung-ohne-orakel/probe-42164396423/pruefung.json'));
  const errors=pruefe(run,proof,hashes,f,probe);if(errors.length)throw Error('KEIN URTEIL: '+errors.join('; '));
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,JSON.stringify({gueltig:true,run:run.id,proof,facts:f,probeRun:42164396423},null,2)+'\n');
  }
 }catch(e){console.error(e.stack);process.exitCode=1;}
}
