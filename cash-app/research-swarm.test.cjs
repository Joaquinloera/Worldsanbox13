'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {AGENTS,DIVISIONS,run}=require('./research-swarm.cjs');
test('30 unique checks, 10 per division',()=>{
 assert.equal(AGENTS.length,30);
 assert.equal(new Set(AGENTS.map(x=>x.id)).size,30);
 for(const division of ['CYBERCOM','SOUTHCOM','CENTCOM'])assert.equal(AGENTS.filter(x=>x.division===division).length,10);
 assert.equal(DIVISIONS.length,3);
});
test('all checks run and failures are isolated',async()=>{
 const result=await run(async url=>{if(url.includes('owasp.org'))throw Error('offline');return {ok:true,status:200};});
 assert.equal(result.executedChecks,30);
 assert.equal(result.summary.reachable,29);
 assert.equal(result.summary.failed,1);
 assert.equal(result.paymentExecution,false);
});
test('all offline checks produce errors without crashing',async()=>{
 const result=await run(async()=>{throw Error('offline')});
 assert.equal(result.summary.failed,30);
 assert.ok(result.agents.every(a=>a.state==='error'));
});

test('every agent has a unique official research target and division lead',()=>{
 for(const agent of AGENTS){assert.match(agent.url,/^https:\/\//);assert.ok(agent.task);assert.ok(agent.lead);assert.ok(['CYBERCOM','SOUTHCOM','CENTCOM'].includes(agent.division));}
});
