'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {orchestrate}=require('./ai-orchestrator.cjs');
test('AI research and independent verification execute per global job',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'jarvis-ai-'));
 const calls=[];
 try{
  const report=await orchestrate({providers:[
   {id:'lab',sector:'laboratory-admin',region:'global',url:'https://example.org/lab'},
   {id:'bank',sector:'banking',region:'global',url:'https://example.org/bank'}],
   outputDir:dir,concurrency:2,
   fetcher:async()=>({ok:true,text:async()=>'<main>OAuth2 REST API; access requires approval</main>'}),
   modelCall:async args=>{calls.push(args);return JSON.stringify({supported:['OAuth2'],gaps:['approval required']})}
  });
  assert.equal(report.jobs.length,2);
  assert.equal(report.jobs.filter(x=>x.status==='completed').length,2);
  assert.equal(calls.length,4);
  assert.ok(calls.some(x=>x.instructions.includes('independent verification')));
  assert.ok(report.jobs.every(x=>x.verifiedIntegration===false));
  const saved=JSON.parse(await fs.readFile(path.join(dir,'ai-research.json'),'utf8'));
  assert.equal(saved.jobs.length,2);
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});
test('rejects invalid concurrency',async()=>{await assert.rejects(orchestrate({concurrency:0}),/Invalid concurrency/)});
