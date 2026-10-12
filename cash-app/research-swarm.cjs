'use strict';
const fs=require('node:fs/promises');
const DIVISIONS=[
['CYBERCOM #88',['https://developers.cash.app/','https://docs.stripe.com/']],
['SOUTHCOM #29.999.00',['https://www.bcb.gov.br/','https://www.banxico.org.mx/']],
['CENTCOM #1111',['https://www.npci.org.in/','https://www.ndb.int/']],
['AGENT #55',['https://www.cips.com.cn/','https://www.icbc.com.cn/']],
['AGENT #5505',['https://developers.cash.app/','https://developer.paypal.com/']],
['AGENT #5515',['https://docs.github.com/','https://docs.netlify.com/']]
];
async function worker([name,urls],fetcher=fetch){
 const checks=await Promise.allSettled(urls.map(async url=>{
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
 try{const res=await fetcher(url,{method:'GET',redirect:'follow',signal:controller.signal});return {url,status:res.status,reachable:res.ok};}
 finally{clearTimeout(timer);}
 }));
 return {agent:name,checks:checks.map((r,i)=>r.status==='fulfilled'?r.value:{url:urls[i],error:String(r.reason).slice(0,160)})};
}
async function run(fetcher=fetch){const settled=await Promise.allSettled(DIVISIONS.map(x=>worker(x,fetcher)));return {at:new Date().toISOString(),mode:'public-docs-reachability',paymentExecution:false,agents:settled.map((x,i)=>x.status==='fulfilled'?x.value:{agent:DIVISIONS[i][0],error:String(x.reason)})};}
if(require.main===module){run().then(async x=>{await fs.mkdir('/tmp/kino',{recursive:true});await fs.writeFile('/tmp/kino/latest.json',JSON.stringify(x,null,2));console.log(JSON.stringify(x));}).catch(e=>{console.error(e);process.exitCode=1});}
module.exports={DIVISIONS,worker,run};
