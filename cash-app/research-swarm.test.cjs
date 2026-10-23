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

test('only approved public HTTPS research URLs with non-secret parameters are accepted',()=>{
 const {safeResearchUrl}=require('./research-swarm.cjs');
 assert.equal(safeResearchUrl('https://docs.github.com/en/rest'),true);
 for(const bad of ['http://docs.github.com/en/rest','https://evil.example/docs','https://docs.github.com:8080/en/rest','https://person:pass@docs.github.com/en/rest','https://docs.github.com/en/rest?api_key=abc','https://docs.github.com/en/rest#token'])
  assert.equal(safeResearchUrl(bad),false,bad);
});
test('streaming response rejects oversized public documents and cancels reader',async()=>{
 const {readBoundedHtml,MAX_DOCUMENT_BYTES}=require('./research-swarm.cjs');
 let cancelled=false;
 const reader={read:async()=>({done:false,value:Buffer.alloc(MAX_DOCUMENT_BYTES+1)}),cancel:async()=>{cancelled=true}};
 await assert.rejects(readBoundedHtml({body:{getReader:()=>reader}}),/DOCUMENT_OVERSIZE/);
 assert.equal(cancelled,true);
});
test('SKIM omits source links containing credential-shaped query keys',async()=>{
 const {probe}=require('./research-swarm.cjs');
 const a=AGENTS.find(x=>x.url==='https://docs.github.com/en/authentication');
 const html='<title>API Docs</title><a href="https://docs.github.com/en/rest?token=secret">unsafe</a><a href="https://docs.github.com/en/rest">safe</a>';
 const out=await probe(a,async()=>({ok:true,status:200,text:async()=>html}));
 assert.deepEqual(out.skim.documentationLinks,['https://docs.github.com/en/rest']);
});
test('30 probe run executes at most four concurrent public requests',async()=>{
 const {MAX_CONCURRENT_REQUESTS}=require('./research-swarm.cjs');
 let active=0,peak=0;
 const r=await run(async()=>{
  active++;peak=Math.max(peak,active);
  await new Promise(resolve=>setTimeout(resolve,3));
  active--;
  return {ok:true,status:200,text:async()=>'<title>Safe</title>'};
 });
 assert.equal(r.executedChecks,30);
 assert.ok(peak<=MAX_CONCURRENT_REQUESTS,JSON.stringify({peak}));
 assert.ok(peak>1,'concurrent runner should use multiple worker slots');
});
