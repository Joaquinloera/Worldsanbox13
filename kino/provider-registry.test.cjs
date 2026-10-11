'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {validateProvider,planResearch}=require('./provider-registry.cjs');
const example={provider:'GitHub App',docsUrl:'https://docs.github.com/en/apps',authMethod:'installation token',evidenceUrl:'https://docs.github.com/en/apps',state:'RESEARCHED'};
test('research record is accepted',()=>assert.equal(validateProvider(example).state,'RESEARCHED'));
test('live state cannot be invented',()=>assert.throws(()=>validateProvider({...example,state:'CONNECTED'}),/verified probe/));
test('rejects secret keys',()=>assert.throws(()=>validateProvider({...example,token:'sk_live_abcdefghijk'}),/Secret/));
test('rejects non-HTTPS evidence',()=>assert.throws(()=>validateProvider({...example,evidenceUrl:'http://example.com'}),/HTTPS/));
test('research task explicitly not executed',()=>assert.equal(planResearch(example,'CENTCOM-01').execution,'NOT_STARTED'));
