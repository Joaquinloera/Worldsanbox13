'use strict';
const fs = require('node:fs/promises');
const GROUPS = {
  CYBERCOM: { lead: '#88', targets: [
    ['Cash App developer documentation','https://developers.cash.app/'],
    ['GitHub authentication','https://docs.github.com/en/authentication'],
    ['Supabase authentication','https://supabase.com/docs/guides/auth'],
    ['Supabase row level security','https://supabase.com/docs/guides/database/postgres/row-level-security'],
    ['Netlify security headers','https://docs.netlify.com/manage/routing/headers/'],
    ['Railway variables','https://docs.railway.com/guides/variables'],
    ['Stripe API authentication','https://docs.stripe.com/keys'],
    ['GitHub Actions security','https://docs.github.com/en/actions/security-for-github-actions'],
    ['OAuth specification','https://www.rfc-editor.org/rfc/rfc6749'],
    ['OWASP API security','https://owasp.org/API-Security/']
  ]},
  SOUTHCOM: { lead: '#2222', targets: [
    ['Cash App developers','https://developers.cash.app/'],
    ['Brazil central bank','https://www.bcb.gov.br/'],
    ['Mexico central bank','https://www.banxico.org.mx/'],
    ['US government','https://www.usa.gov/'],
    ['India NPCI','https://www.npci.org.in/'],
    ['BRICS New Development Bank','https://www.ndb.int/'],
    ['CIPS','https://www.cips.com.cn/'],
    ['ICBC','https://www.icbc.com.cn/'],
    ['PayPal developer documentation','https://developer.paypal.com/'],
    ['South African Reserve Bank','https://www.resbank.co.za/']
  ]},
  CENTCOM: { lead: '#1111', targets: [
    ['GitHub API','https://docs.github.com/en/rest'],
    ['Railway documentation','https://docs.railway.com/'],
    ['Supabase documentation','https://supabase.com/docs'],
    ['Netlify documentation','https://docs.netlify.com/'],
    ['Replit documentation','https://docs.replit.com/'],
    ['Lovable documentation','https://docs.lovable.dev/'],
    ['Node.js documentation','https://nodejs.org/docs/latest/api/'],
    ['GitHub Actions','https://docs.github.com/en/actions'],
    ['OpenTelemetry','https://opentelemetry.io/docs/'],
    ['Cloudflare developer documentation','https://developers.cloudflare.com/']
  ]}
};
const AGENTS = Object.entries(GROUPS).flatMap(([division,group]) => group.targets.map(([task,url],i)=>({
 id:`KINO-${division}-${String(i+1).padStart(2,'0')}`, division, lead:group.lead, task, url
})));
const DIVISIONS = Object.entries(GROUPS).map(([name,group])=>[name+' '+group.lead,group.targets.map(x=>x[1])]);

const MAX_DOCUMENT_BYTES = 262144;
const MAX_CONCURRENT_REQUESTS = 4;
const SECRET_QUERY_KEY = /token|key|secret|password|credential|session|signature|auth/i;
const ALLOWED_HOSTS = new Set(AGENTS.map(agent => new URL(agent.url).hostname));
function safeResearchUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password && !u.port && !u.hash &&
      ALLOWED_HOSTS.has(u.hostname) && ![...u.searchParams.keys()].some(k => SECRET_QUERY_KEY.test(k));
  } catch { return false; }
}
async function readBoundedHtml(response) {
  if (response.body && typeof response.body.getReader === 'function') {
    const reader = response.body.getReader();
    const parts = [];
    let bytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_DOCUMENT_BYTES) {
        await reader.cancel().catch(() => {});
        throw Error('DOCUMENT_OVERSIZE');
      }
      parts.push(Buffer.from(value));
    }
    return Buffer.concat(parts).toString('utf8');
  }
  if (typeof response.text !== 'function') return '';
  const html = await response.text();
  if (Buffer.byteLength(html, 'utf8') > MAX_DOCUMENT_BYTES) throw Error('DOCUMENT_OVERSIZE');
  return html;
}
async function limitedMap(items, fn, maxConcurrent = MAX_CONCURRENT_REQUESTS) {
  const result = new Array(items.length);
  let cursor = 0;
  async function worker() {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      try { result[i] = await fn(items[i], i); }
      catch (error) { result[i] = { state: 'error', reachable: false, error: String(error?.message || error).slice(0, 100) }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(items.length, maxConcurrent) }, worker));
  return result;
}

async function probe(agent,fetcher=fetch,timeoutMs=10000) {
 if(!safeResearchUrl(agent.url))return {...agent,reachable:false,state:'blocked',error:'UNAPPROVED_PUBLIC_SOURCE_URL'};
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try {
   const res=await fetcher(agent.url,{method:'GET',redirect:'follow',signal:controller.signal});
   let skim={title:null,authSignals:[],apiSignals:[],documentationLinks:[]};
   if(res.ok && typeof res.text==='function'){
     try{
       const html=await readBoundedHtml(res);
       const title=html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
       const authTerms=['OAuth','API key','JWT','Basic Auth','client credentials','bearer token','sandbox'];
       const apiTerms=['REST API','GraphQL','webhook','OpenAPI','Swagger','SDK','rate limit'];
       const links=[...html.matchAll(/href=["'](https:\/\/[^"'\s<>]+)["']/gi)].map(m=>m[1]);
       const host=new URL(agent.url).hostname;
       skim={title:title?title[1].replace(/&amp;/g,'&').trim():null,
         authSignals:authTerms.filter(term=>html.toLowerCase().includes(term.toLowerCase())),
         apiSignals:apiTerms.filter(term=>html.toLowerCase().includes(term.toLowerCase())),
         documentationLinks:[...new Set(links.filter(link=>{try{const u=new URL(link);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&u.hostname===host&&![...u.searchParams.keys()].some(k=>SECRET_QUERY_KEY.test(k))}catch{return false}}))].slice(0,12)};
     }catch(e){skim.extractionError=String(e.message||e).slice(0,120)}
   }
   return {...agent,status:res.status,reachable:res.ok,state:res.ok?'reachable':'http_error',skim};
 } catch(e) {
   return {...agent,reachable:false,state:'error',error:String(e.message||e).slice(0,160)};
 } finally {clearTimeout(timer);}
}
async function run(fetcher=fetch) {
 const results=await limitedMap(AGENTS,agent=>probe(agent,fetcher));
 return {at:new Date().toISOString(),mode:'public-docs-skim',paymentExecution:false,
  configuredAgents:AGENTS.length,executedChecks:results.length,
  summary:{reachable:results.filter(x=>x.reachable).length,failed:results.filter(x=>!x.reachable).length},
  agents:results};
}
async function worker([name,urls],fetcher=fetch){
 const checks=await limitedMap(urls,(url,i)=>probe({id:name+'-'+i,division:name,url,task:url},fetcher));
 return {agent:name,checks};
}
if(require.main===module)run().then(async result=>{
 await fs.mkdir('/tmp/kino',{recursive:true});
 await fs.writeFile('/tmp/kino/latest.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
}).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={GROUPS,AGENTS,DIVISIONS,probe,worker,run,safeResearchUrl,readBoundedHtml,MAX_DOCUMENT_BYTES,MAX_CONCURRENT_REQUESTS};
