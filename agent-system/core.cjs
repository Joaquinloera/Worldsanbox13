'use strict';
const roster=require('./roster.json');
const states=['queued','assigned','running','completed','failed'];
function validateRoster(r=roster){if(r.capacity!==30||r.agents.length!==30||new Set(r.agents.map(a=>a.id)).size!==30||r.coordinator!=='281102')throw Error('Invalid 30-agent roster');return true;}
function createJob({id,agentId,task}){validateRoster();if(!/^[a-zA-Z0-9_-]{8,100}$/.test(id||''))throw Error('Invalid job id');if(!roster.agents.some(a=>a.id===agentId&&a.enabled))throw Error('Agent not assigned');if(typeof task!=='string'||task.length<8||task.length>2000)throw Error('Invalid task');return {id,agentId,task,status:'queued',history:['queued']};}
function transition(job,next){if(!states.includes(next))throw Error('Unknown state');const allowed={queued:['assigned','failed'],assigned:['running','failed'],running:['completed','failed'],completed:[],failed:[]};if(!allowed[job.status]?.includes(next))throw Error('Invalid transition');return {...job,status:next,history:[...job.history,next]};}
module.exports={roster,validateRoster,createJob,transition};
