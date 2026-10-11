'use strict';
const {validateProvider,planResearch}=require('./provider-registry.cjs');
const DIVISIONS=Object.freeze({CYBERCOM:['identity','security','permissions'],SOUTHCOM:['payments','banking','cannabis'],CENTCOM:['development','infrastructure','ai']});
function assignDivision(provider){const s=String(provider.division||'').toUpperCase();if(!Object.hasOwn(DIVISIONS,s))throw new Error('Unknown division');return s;}
function buildSwarmBatch(providers,{runId='KINO-281102',maxTasks=30}={}){
 if(!Array.isArray(providers)||!Number.isInteger(maxTasks)||maxTasks<1||maxTasks>30)throw new Error('Invalid swarm batch');
 const seen=new Set();const tasks=[];
 for(const record of providers){const p=validateProvider(record);const division=assignDivision(p);const key=p.provider.toLowerCase();
 if(seen.has(key))throw new Error('Duplicate provider: '+p.provider);seen.add(key);
 if(tasks.length>=maxTasks)break;
 const agentId=division+'-'+String(tasks.filter(t=>t.division===division).length+1).padStart(2,'0');
 const task=planResearch(p,agentId);
 tasks.push({...task,division,runId,status:'QUEUED',evidenceStatus:'RESEARCH_ONLY',connectorStatus:'NOT_CONNECTED'});
 }
 return {runId,operation:'KINO-281102',mode:'PLANNED_NOT_EXECUTED',tasks};
}
function recordEvidence(task,evidence){
 if(task.status!=='QUEUED')throw new Error('Task not queued');
 if(!evidence||typeof evidence.url!=='string'||!evidence.url.startsWith('https://')||typeof evidence.summary!=='string'||!evidence.summary.trim())throw new Error('Evidence requires HTTPS URL and summary');
 return {...task,status:'RESEARCH_RECORDED',evidenceStatus:'SOURCE_ATTACHED',evidence:{url:evidence.url,summary:evidence.summary},connectorStatus:'NOT_CONNECTED'};
}
module.exports={DIVISIONS,assignDivision,buildSwarmBatch,recordEvidence};
