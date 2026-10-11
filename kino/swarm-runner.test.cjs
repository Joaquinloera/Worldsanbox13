'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {buildSwarmBatch,recordEvidence}=require('./swarm-runner.cjs');
const p={provider:'GitHub Apps',docsUrl:'https://docs.github.com/en/apps',evidenceUrl:'https://docs.github.com/en/apps',authMethod:'installation token',state:'RESEARCHED',division:'CENTCOM'};
test('creates planned research tasks without execution claims',()=>{const r=buildSwarmBatch([p]);assert.equal(r.mode,'PLANNED_NOT_EXECUTED');assert.equal(r.tasks[0].status,'QUEUED');assert.equal(r.tasks[0].agentId,'CENTCOM-01');});
test('blocks duplicate provider tasks',()=>assert.throws(()=>buildSwarmBatch([p,p]),/Duplicate/));
test('rejects unassigned division',()=>assert.throws(()=>buildSwarmBatch([{...p,division:'OTHER'}]),/division/));
test('records sourced research without claiming connection',()=>{const t=buildSwarmBatch([p]).tasks[0];const done=recordEvidence(t,{url:p.evidenceUrl,summary:'Official documentation checked'});assert.equal(done.status,'RESEARCH_RECORDED');assert.equal(done.connectorStatus,'NOT_CONNECTED');});
test('rejects evidence without source URL',()=>assert.throws(()=>recordEvidence(buildSwarmBatch([p]).tasks[0],{url:'http://invalid',summary:'bad'}),/HTTPS/));
