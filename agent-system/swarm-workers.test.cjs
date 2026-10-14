'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {run,extract}=require('./swarm-workers.cjs');
test('SKIM extracts auth, SDK, sandbox indicators',()=>{
 const x=extract('OAuth2 API key SDK webhook sandbox');
 assert.ok(x.auth.includes('oauth2'));
 assert.ok(x.auth.includes('api key'));
 assert.ok(x.software.includes('sdk'));
 assert.ok(x.software.includes('sandbox'));
});
test('parallel research saves evidence as JSON without credentials',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'jarvis-skim-'));
 try {
  const report=await run({
   providers:[{id:'test-provider',sector:'banking',url:'https://example.org/docs'}],
   concurrency:2,outputDir:dir,
   fetcher:async()=>({ok:true,text:async()=>'<p>OAuth2 SDK sandbox</p>'})
  });
  assert.equal(report.jobs.length,1);
  assert.equal(report.jobs[0].status,'completed');
  assert.equal(report.jobs[0].verifiedIntegration,false);
  assert.equal(report.jobs[0].credentials,'not-collected');
  const saved=JSON.parse(await fs.readFile(path.join(dir,'research.json'),'utf8'));
  assert.equal(saved.jobs[0].source,'https://example.org/docs');
 } finally {await fs.rm(dir,{recursive:true,force:true});}
});
test('invalid concurrency is rejected',async()=>{await assert.rejects(run({concurrency:0}),/Invalid concurrency/);});
