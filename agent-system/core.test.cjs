'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {roster,validateRoster,createJob,transition}=require('./core.cjs');
test('30 unique agent slots',()=>{assert.equal(validateRoster(),true);assert.equal(new Set(roster.agents.map(x=>x.id)).size,30)});
test('correct command assignments',()=>{for(const id of ['281102','88','1111','2222','55','5505','5515'])assert.ok(roster.agents.some(a=>a.id===id&&a.enabled))});
test('job state transitions',()=>{const j=createJob({id:'job-00001',agentId:'2222',task:'Research provider API'});assert.equal(transition(transition(j,'assigned'),'running').status,'running')});
test('reject unassigned executor',()=>assert.throws(()=>createJob({id:'job-00002',agentId:'reserve-08',task:'Execute unknown task'})));
test('reject skipping state',()=>assert.throws(()=>transition(createJob({id:'job-00003',agentId:'88',task:'Inspect API auth'}),'completed')));
