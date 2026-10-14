'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const DEFAULT_PROVIDERS=[
{id:'brazil-pix',sector:'banking',region:'BR',url:'https://www.bcb.gov.br/content/estabilidadefinanceira/pix/API-DICT.html'},
{id:'india-upi',sector:'banking',region:'IN',url:'https://www.npci.org.in/what-we-do/upi/product-overview'},
{id:'usa-plaid',sector:'banking',region:'US',url:'https://plaid.com/docs/'},
{id:'arizona-cannabis',sector:'dispensary',region:'US-AZ',url:'https://www.azdhs.gov/licensing/marijuana/'},
{id:'openai',sector:'ai',region:'global',url:'https://platform.openai.com/docs/'},
{id:'starlink',sector:'telecom',region:'global',url:'https://www.starlink.com/'},
{id:'ethereum',sector:'blockchain',region:'global',url:'https://ethereum.org/en/developers/docs/'},
{id:'us-laboratory',sector:'laboratory-admin',region:'US',url:'https://www.cdc.gov/lab-quality/'},
{id:'defense-public',sector:'defense-public',region:'US',url:'https://www.diu.mil/'},
{id:'restaurant-pos',sector:'restaurants',region:'global',url:'https://developer.squareup.com/docs'}];
function extract(text){const patterns={auth:/\b(oauth\s?2(?:\.0)?|api key|mutual tls|mTLS|bearer token|client credentials)\b/gi,software:/\b(SDK|OpenAPI|webhook|sandbox|REST API|GraphQL)\b/gi,blockchain:/\b(smart contract|digital asset|blockchain|wallet|custody)\b/gi};return Object.fromEntries(Object.entries(patterns).map(([k,re])=>[k,[...new Set((text.match(re)||[]).map(s=>s.toLowerCase()))]]));}
async function run({providers=DEFAULT_PROVIDERS,fetcher=globalThis.fetch,concurrency=3,outputDir='./swarm-results'}={}){
if(!Number.isInteger(concurrency)||concurrency<1||concurrency>8)throw Error('Invalid concurrency');
await fs.mkdir(outputDir,{recursive:true});const queue=[...providers],results=[];
async function worker(){while(queue.length){const p=queue.shift();if(!p)break;const start=new Date().toISOString();try{const u=new URL(p.url);if(u.protocol!=='https:')throw Error('HTTPS required');const response=await fetcher(u,{signal:AbortSignal.timeout(15000),redirect:'follow'});if(!response.ok)throw Error('HTTP '+response.status);const body=(await response.text()).slice(0,250000);const record={jobId:randomUUID(),provider:p,startedAt:start,finishedAt:new Date().toISOString(),status:'completed',skim:extract(body),source:p.url,verifiedIntegration:false,credentials:'not-collected'};results.push(record);}catch(e){results.push({jobId:randomUUID(),provider:p,startedAt:start,status:'failed',error:String(e.message).slice(0,250)});}}}
await Promise.all(Array.from({length:Math.min(concurrency,providers.length)},worker));
const report={schemaVersion:1,generatedAt:new Date().toISOString(),workers:Math.min(concurrency,providers.length),jobs:results};
await fs.writeFile(path.join(outputDir,'research.json'),JSON.stringify(report,null,2));return report;
}
if(require.main===module)run().then(r=>console.log(JSON.stringify({completed:r.jobs.filter(j=>j.status==='completed').length,failed:r.jobs.filter(j=>j.status==='failed').length}))).catch(e=>{console.error(e);process.exitCode=1});
module.exports={DEFAULT_PROVIDERS,extract,run};