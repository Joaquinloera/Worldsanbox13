'use strict';
const STATES = Object.freeze(['RESEARCHED','ACCESS_PENDING','SANDBOX_READY','TESTED','CONNECTED']);
const REQUIRED = ['provider','docsUrl','authMethod','evidenceUrl','state'];
function validateProvider(record) {
  if (!record || typeof record !== 'object') throw new TypeError('Provider record required');
  for (const key of REQUIRED) if (typeof record[key] !== 'string' || !record[key].trim()) throw new Error('Missing '+key);
  for (const key of ['docsUrl','evidenceUrl']) { const u=new URL(record[key]); if(u.protocol!=='https:') throw new Error('HTTPS required: '+key); }
  if (!STATES.includes(record.state)) throw new Error('Invalid state');
  const serialized=JSON.stringify(record);
  if (/sk_(?:test|live)_[A-Za-z0-9]{8,}|gh[pousr]_[A-Za-z0-9]{12,}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/.test(serialized)) throw new Error('Secret material prohibited');
  if (record.state==='CONNECTED' && (!record.probe || record.probe.success!==true || !record.probe.checkedAt)) throw new Error('CONNECTED requires verified probe');
  return Object.freeze({...record});
}
function planResearch(provider, agentId) {
  const p=validateProvider(provider);
  if(typeof agentId!=='string'||!agentId.trim()) throw new Error('Agent ID required');
  return {operation:'KINO-281102',agentId,provider:p.provider,stage:'SKIM',tasks:['AUTH','SCOPES','SDK','SANDBOX','WEBHOOKS','RATE_LIMITS','APPROVALS','EVIDENCE'],evidenceUrl:p.evidenceUrl,execution:'NOT_STARTED'};
}
module.exports={STATES,validateProvider,planResearch};
