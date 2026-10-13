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

test('SKIM extracts authentication, API and same-host documentation signals',async()=>{
 const html='<title>Partner API</title><p>OAuth JWT REST API webhook SDK</p><a href="https://docs.github.com/en/rest">docs</a><a href="https://outside.example/">external</a>';
 const result=await run(async()=>({ok:true,status:200,text:async()=>html}));
 assert.equal(result.mode,'public-docs-skim');
 assert.equal(result.executedChecks,30);
 assert.equal(result.agents[0].skim.title,'Partner API');
 assert.ok(result.agents[0].skim.authSignals.includes('OAuth'));
 assert.ok(result.agents[0].skim.apiSignals.includes('webhook'));
 assert.ok(result.agents.every(a=>!a.skim.documentationLinks.includes('https://outside.example/')));
});
