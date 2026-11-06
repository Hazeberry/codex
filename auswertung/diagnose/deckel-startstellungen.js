// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const D=require('./death-transfer');
const ROOT=path.resolve(__dirname,'../..'),INPUT=path.join(ROOT,'docs/daten/death-transfer/eingaben.json');
const CASES={partie113:[95,113],partie127:[111,127]};
function prepare(){
 const E=D.load(false);D.validate(E);
 const data=JSON.parse(fs.readFileSync(INPUT,'utf8')),starts=[];
 for(const [game,points] of Object.entries(CASES))for(const mc of points)for(const mirror of [false,true]){
  const p=data.find(p=>p.id===game),r=D.replay(E,p,mc,mirror);
  starts.push({id:`${game}-${mc}-${mirror?'S':'W'}`,game,mc,mirror,color:mirror?1:2,board:[...r.board],captures:r.captures,params:p.params,
   history:p.moves.slice(0,mc).map(m=>({color:mirror?3-m.color:m.color,idx:m.idx}))});
 }
 const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
 return {sourceSha:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),inputSha256:hash(INPUT),engineSha256:hash(path.join(ROOT,'index.html')),starts};
}
module.exports={CASES,prepare};
if(require.main===module){try{console.log(JSON.stringify(prepare()));}catch(e){console.error(e.stack);process.exitCode=1;}}
