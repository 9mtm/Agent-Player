require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MemoryItemsController } = require('../src/memory-items.ts');
const { allowedRequest } = require('../src/session.ts');
const { allowed } = require('../scripts/application-server.cjs');
const { agentCardResponse } = require('../src/agent-card-contract.js');
const item = n => ({ id: `00000000-0000-4000-8000-${n.toString(16).padStart(12,'0')}`, type: 'fact', content: `Fictional memory ${n}`, createdAt: '2026-01-01T00:00:00.000Z', drawer: {kind:'owner'}, embedding: [1,2], userId:'private-owner' });

test('all 5003 memories load through the real request/response contracts without truncation', async () => {
 const rows=Array.from({length:5003},(_,i)=>item(i));let calls=0,progress=[];
 const c=new MemoryItemsController({request:async r=>{
  assert.ok(allowedRequest(r.method,r.path));assert.ok(allowed(r.method,r.path));
  if(r.path==='/api/memory/drawers')return {status:200,body:{drawers:[]}};
  if(r.path==='/api/agents')return {status:200,body:{agents:[]}};
  const offset=r.path.includes('?')?Number(r.path.split('cursor=')[1]):0;calls++;
  const body={memories:rows.slice(offset,offset+100),nextCursor:offset+100<rows.length?String(offset+100):null,total:rows.length};
  return {status:200,body:agentCardResponse(r.path,200,agentCardResponse(r.path,200,body))};
 }});c.subscribe(()=>progress.push(c.getSnapshot().loaded));await c.load();
 assert.equal(c.getSnapshot().phase,'ready');assert.equal(c.visible().length,5003);assert.equal(new Set(c.visible().map(m=>m.id)).size,5003);assert.equal(calls,51);assert.ok(progress.includes(100));assert.ok(!JSON.stringify(c.getSnapshot().items).includes('embedding'));assert.ok(!JSON.stringify(c.getSnapshot().items).includes('private-owner'));c.dispose();
});
test('overlap is deduplicated and a repeated cursor cannot loop forever or report partial success',async()=>{
 let n=0;const c=new MemoryItemsController({request:async r=>r.path==='/api/memory/drawers'?{status:200,body:{drawers:[]}}:r.path==='/api/agents'?{status:200,body:{agents:[]}}:{status:200,body:{memories:n++?[item(1),item(2)]:[item(1)],total:2,nextCursor:n===1?'next':null}}});await c.load();assert.equal(c.getSnapshot().items.length,2);c.dispose();
 const bad=new MemoryItemsController({request:async()=>({status:200,body:{memories:[item(1)],total:10,nextCursor:'repeat'}})});await bad.load();assert.equal(bad.getSnapshot().phase,'error');assert.equal(bad.getSnapshot().items.length,0);bad.dispose();
});
test('disposal stops pagination and malformed cursor requests stay blocked at both boundaries',async()=>{
 let release,calls=0;const c=new MemoryItemsController({request:()=>{calls++;return new Promise(r=>release=r)}});const loading=c.load();c.dispose();release({status:200,body:{memories:[item(1)],total:2,nextCursor:'next'}});await loading;assert.equal(calls,1);assert.equal(c.getSnapshot().items.length,0);
 for(const path of ['/api/memory/page?cursor=','/api/memory/page?cursor=abc&owner=other','/api/memory/page?cursor=%2F','/api/memory/page?limit=9999','/api/memory/page?cursor='+ 'a'.repeat(1025)]){assert.equal(allowedRequest('GET',path),false);assert.equal(allowed('GET',path),false)}
 assert.equal(allowedRequest('POST','/api/memory/page',{}),false);
});
