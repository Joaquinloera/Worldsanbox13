'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const {DIVISIONS,run}=require('./research-swarm.cjs');
test('six divisions run concurrently',async()=>{let calls=0;const r=await run(async()=>{calls++;return {status:200,ok:true}});assert.equal(r.agents.length,6);assert.equal(calls,12);assert.equal(r.paymentExecution,false);assert.ok(r.agents.every(a=>a.checks.every(c=>c.reachable)))});
test('individual failures are isolated',async()=>{const r=await run(async()=>{throw Error('offline')});assert.equal(r.agents.length,6);assert.ok(r.agents.every(a=>a.checks.every(c=>c.error)))});
