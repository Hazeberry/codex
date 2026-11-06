// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
'use strict';
const assert=require('assert'),cp=require('child_process'),path=require('path');
const P=require('../auswertung/diagnose/deckel-startstellungen');
const {test,laufeTests}=require('./rahmen');
test('Acht geprüfte Startstellungen mit beiden Farben',()=>{
 const prepared=P.prepare();assert.equal(prepared.starts.length,8);
 for(const s of prepared.starts){assert.equal(s.history.length,s.mc);assert.equal(s.board.length,361);assert.equal(s.color,s.mirror?1:2);}
});
test('Fortsetzungswerkzeug: Plan, Paarung, GTP-Attrappen, Abbrüche und Farben',()=>{
 const p=cp.spawnSync('python3',[path.join(__dirname,'deckel-fortsetzungen.py')],{encoding:'utf8',timeout:10000});
 if(p.error)throw p.error;assert.equal(p.status,0,p.stdout+p.stderr);
});
laufeTests('Gefangenendeckel-Fortsetzungen: Aufbau').then(ok=>{process.exitCode=ok?0:1;});
