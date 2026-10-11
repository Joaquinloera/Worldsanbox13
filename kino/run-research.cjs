'use strict';
const fs=require('node:fs'),path=require('node:path');
const {buildSwarmBatch}=require('./swarm-runner.cjs');
const input=JSON.parse(fs.readFileSync(path.join(__dirname,'provider-research-20261011.json'),'utf8'));
const records=input.providerRecords.map(x=>({...x,division:x.division}));
const batch=buildSwarmBatch(records);
process.stdout.write(JSON.stringify(batch,null,2)+'\n');
