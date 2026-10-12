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
async function probe(agent,fetcher=fetch,timeoutMs=10000) {
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try {
   const res=await fetcher(agent.url,{method:'GET',redirect:'follow',signal:controller.signal});
   return {...agent,status:res.status,reachable:res.ok,state:res.ok?'reachable':'http_error'};
 } catch(e) {
   return {...agent,reachable:false,state:'error',error:String(e.message||e).slice(0,160)};
 } finally {clearTimeout(timer);}
}
async function run(fetcher=fetch) {
 const settled=await Promise.allSettled(AGENTS.map(agent=>probe(agent,fetcher)));
 const results=settled.map((r,i)=>r.status==='fulfilled'?r.value:{...AGENTS[i],state:'error',reachable:false,error:String(r.reason)});
 return {at:new Date().toISOString(),mode:'public-docs-reachability',paymentExecution:false,
  configuredAgents:AGENTS.length,executedChecks:results.length,
  summary:{reachable:results.filter(x=>x.reachable).length,failed:results.filter(x=>!x.reachable).length},
  agents:results};
}
async function worker([name,urls],fetcher=fetch){
 const checks=await Promise.all(urls.map((url,i)=>probe({id:name+'-'+i,division:name,url,task:url},fetcher)));
 return {agent:name,checks};
}
if(require.main===module)run().then(async result=>{
 await fs.mkdir('/tmp/kino',{recursive:true});
 await fs.writeFile('/tmp/kino/latest.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
}).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={GROUPS,AGENTS,DIVISIONS,probe,worker,run};
