require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { AgentsController, publicAgent, agentResponse } = require('../src/agents.ts');
const { AgentsReview } = require('../src/AgentsDestination.tsx');
const { SessionClient, createSameOriginTransport, allowedRequest } = require('../src/session.ts');
const { SessionFailure } = require('../src/session-failure.ts');
const { createLoginMock } = require('../src/session-mock.ts');
const { createAgentsMock } = require('../src/agents-mock.ts');
const { createApplicationServer, allowed } = require('../scripts/application-server.cjs');
const badNames = ['', ' legacy ', 'Ａ', 'e\u0301', 'bad\nname', 'bad\u0000name', 'bad\u0085name', 'bad\u200dname', 'bad\u202ename', 'bad\u2066name', '🦉'.repeat(61), null, 42, {}, [], undefined];
const good = { id: 'sample-helper', name: 'Offline helper', version: 1 };
const mark = { id: 'sample-main', version: 1, nameUnavailable: true };
const markup = c => renderToStaticMarkup(React.createElement(AgentsReview, { controller: c }));
const defer = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };
async function setup(t, wrap = b => b) {
 const mock=createAgentsMock(), base=wrap(createLoginMock(mock)), calls=[];
 const client=new SessionClient({mock: async r => { calls.push(r); return base(r); }});
 client.selectMode('mock'); await client.login('demo@example.invalid','mock-only');
 const c=new AgentsController(client); t.after(()=>c.dispose()); await c.list(); await c.select('sample-main');
 return {client,c,calls,mock};
}
for (const [i,name] of badNames.entries()) test(`legacy name ${i}: exact safe projection and neighbour isolation`, async t => {
 const raw={id:'sample-main',version:1,name,api_key:'fictional-private'};
 assert.deepEqual(publicAgent(raw),mark); assert.deepEqual(publicAgent(mark),mark);
 assert.deepEqual(agentResponse('/api/agents',{status:200,body:{agents:[raw,good]}}).body,{agents:[mark,good]});
 const s=await setup(t,base=>r=>r.method==='GET' && r.path==='/api/agents' ? {status:200,body:{agents:[raw,good]}} : r.method==='GET' && r.path==='/api/agents/sample-main' ? {status:200,body:{agent:raw}} : base(r));
 assert.deepEqual(s.c.getSnapshot().selected,mark); assert.equal(s.c.getSnapshot().draft,'');
 const n=s.calls.length; s.c.edit('Candidate'); await s.c.generate(); await s.c.save(); s.c.cancel(); assert.equal(s.calls.length,n);
 const ui=markup(s.c); assert.match(ui,/Name unavailable/); assert.match(ui,/disabled="">Generate draft/); assert.match(ui,/disabled="">Save name/); assert.doesNotMatch(ui,/fictional-private/);
 await s.c.select('sample-helper'); s.c.edit('Valid neighbour'); await s.c.save(); assert.equal(s.c.getSnapshot().phase,'saved');
 for(const allow of [allowedRequest,allowed]) assert.equal(allow('PUT','/api/agents/sample-main',{...mark,name:'Candidate',expectedVersion:1}),false);
});
for(const patch of [{id:'../bad'},{id:null},{version:0},{version:'1'},{version:1.5},{version:Number.MAX_SAFE_INTEGER+1}]) test(`malformed identity/version stays closed ${JSON.stringify(patch)}`,()=>{
 assert.throws(()=>publicAgent({...mark,...patch}));
 assert.throws(()=>agentResponse('/api/agents',{status:200,body:{agents:[good,{...mark,...patch}]}}));
});
test('pre-send blocked removes only this attempt and allows deliberate save after remount',async t=>{
 const s=await setup(t); const original=s.client.request.bind(s.client);
 s.client.request=async r=>{if(r.method==='PUT')throw new SessionFailure('blocked');return original(r);};
 s.c.edit('Candidate'); await s.c.save(); assert.equal(s.c.getSnapshot().unknown,false); assert.match(s.c.getSnapshot().notice,/refused before sending/);
 assert.equal(s.calls.filter(r=>r.method==='PUT').length,0); s.c.dispose();
 const c=new AgentsController(s.client);t.after(()=>c.dispose());await c.select('sample-main');assert.equal(c.getSnapshot().unknown,false);
 s.client.request=original;c.edit('Candidate');await c.save();assert.equal(c.getSnapshot().phase,'saved');
});
for(const code of ['blocked','cancelled','unavailable']) test(`late ${code} after epoch change never republishes stale state`,async t=>{
 const s=await setup(t), gate=defer(), original=s.client.request.bind(s.client);
 s.client.request=r=>r.method==='PUT'?gate.promise:original(r);
 s.c.edit('Candidate');const pending=s.c.save();s.client.selectMode('fixture');gate.reject(new SessionFailure(code));await pending;
 assert.equal(s.c.getSnapshot().selected,undefined);assert.equal(s.c.getSnapshot().phase,'denied');
 s.client.selectMode('mock');await s.client.login('demo@example.invalid','mock-only');s.client.request=original;
 await s.c.select('sample-main');assert.equal(s.c.getSnapshot().unknown,code!=='blocked');
});
test('late blocked cannot erase a newer attempt for the same account and agent',async t=>{
 const s=await setup(t),old=defer(),fresh=defer(), original=s.client.request.bind(s.client);let n=0;
 s.client.request=r=>r.method==='PUT'?(++n===1?old.promise:fresh.promise):original(r);
 s.c.edit('Old');const first=s.c.save();s.client.selectMode('mock');await s.client.login('demo@example.invalid','mock-only');
 await s.c.select('sample-main');await s.c.reconcile();s.c.review();s.c.edit('Fresh');const second=s.c.save();
 old.reject(new SessionFailure('blocked'));await first;fresh.reject(new SessionFailure('unavailable'));await second;
 await s.c.select('sample-main');assert.equal(s.c.getSnapshot().unknown,true);assert.equal(s.c.getSnapshot().draft,'Fresh');
});
test('404 reconciliation clears only missing selection and retains unrelated unknown ledger',async t=>{
 let missing=false;
 const s=await setup(t,base=>r=>r.method==='PUT'?Promise.reject(Error('fictional loss')):missing&&r.path==='/api/agents/sample-main'?{status:404,body:null}:base(r));
 s.c.edit('First');await s.c.save();await s.c.select('sample-helper');s.c.edit('Second');await s.c.save();
 await s.c.select('sample-main');missing=true;await s.c.reconcile();
 assert.equal(s.c.getSnapshot().selected,undefined);assert.equal(s.c.getSnapshot().unknown,false);assert.match(s.c.getSnapshot().notice,/no longer exists/);
 assert.deepEqual(s.c.getSnapshot().agents.map(a=>a.id),['sample-helper']);await s.c.select('sample-helper');assert.equal(s.c.getSnapshot().unknown,true);
});
test('conflict with unavailable current name is definitive but cannot generate or save',async t=>{
 const s=await setup(t,base=>r=>r.method==='PUT'?{status:409,body:{code:'version_conflict',currentVersion:2,agent:{...mark,version:2}}}:base(r));
 s.c.edit('Draft');await s.c.save();assert.equal(s.c.getSnapshot().unknown,false);assert.equal(s.c.getSnapshot().draft,'Draft');
 const n=s.calls.length;s.c.review();await s.c.generate();await s.c.save();assert.equal(s.calls.length,n);assert.match(markup(s.c),/Name unavailable/);
});
const listen=s=>new Promise(resolve=>s.listen(0,'127.0.0.1',()=>resolve(s.address().port)));
const close=s=>new Promise(resolve=>{s.close(resolve);s.closeAllConnections();});
test('fictional HTTP mixed legacy names: bridge/client projection, GET, no unavailable actions, valid CAS conflict',async t=>{
 let rawName=badNames[0], invalidIdentity=false, rawVersion=1;const mock=createAgentsMock(), base=createLoginMock(mock), calls=[], responses=[];
 const upstream=http.createServer(async(req,res)=>{
  const chunks=[];for await(const chunk of req)chunks.push(chunk);const text=Buffer.concat(chunks).toString();
  const r={method:req.method,path:req.url,body:text?JSON.parse(text):undefined,headers:{Authorization:req.headers.authorization},signal:new AbortController().signal};calls.push(r);
  let result=await base(r);const raw={id:invalidIdentity?'../bad':'sample-main',name:rawName,version:rawVersion,api_key:'fictional-private'};
  if(r.method==='GET'&&r.path==='/api/agents')result={status:200,body:{agents:[raw,good]}};
  if(r.method==='GET'&&r.path==='/api/agents/sample-main')result={status:200,body:{agent:raw}};
  res.writeHead(result.status,{'Content-Type':'application/json'});res.end(JSON.stringify(result.body));
 });
 const upstreamPort=await listen(upstream);t.after(()=>close(upstream));const app=createApplicationServer({channel:'candidate',upstreamPort});const port=await listen(app);t.after(()=>close(app));const origin=`http://127.0.0.1:${port}`;
 const fetcher=async(url,init)=>{const r=await fetch(origin+new URL(url).pathname,{...init,headers:{...init.headers,Origin:origin}});const body=await r.json();responses.push(body);return {status:r.status,headers:r.headers,url,redirected:false,json:async()=>body};};
 const client=new SessionClient({live:createSameOriginTransport('http://127.0.0.1:42522',fetcher)});client.selectMode('live');await client.login('demo@example.invalid','mock-only');const c=new AgentsController(client);t.after(()=>c.dispose());
 for(const name of badNames){rawName=name;await c.list();assert.deepEqual(c.getSnapshot().agents,[mark,good]);await c.select('sample-main');assert.deepEqual(c.getSnapshot().selected,mark);const n=calls.length;c.edit('Candidate');await c.generate();await c.save();assert.equal(calls.length,n);}
 assert.doesNotMatch(JSON.stringify(responses),/fictional-private/);
 await c.select('sample-helper');mock.update('sample-helper','Concurrent',1);c.edit('Neighbour');await c.save();assert.equal(c.getSnapshot().phase,'review');assert.equal(c.getSnapshot().draft,'Neighbour');c.review();await c.save();assert.equal(c.getSnapshot().phase,'saved');
 for(const v of [0,'1',null,1.5,Number.MAX_SAFE_INTEGER+1]){rawVersion=v;await c.list();assert.equal(c.getSnapshot().phase,'error');await c.select('sample-main');assert.equal(c.getSnapshot().selected,undefined);}rawVersion=1;
 invalidIdentity=true;await c.list();assert.equal(c.getSnapshot().phase,'error');assert.deepEqual(c.getSnapshot().agents,[]);
});

for(const name of ['أَمَل','安然','🦉'.repeat(60),'Éclair']) test(`valid Unicode name remains usable: ${name.slice(0,8)}`,()=>{
 assert.deepEqual(publicAgent({id:'a',version:1,name}),{id:'a',version:1,name});
});
test('stale reconciliation 404 cannot clear a newer selected agent',async t=>{
 const s=await setup(t,base=>r=>r.method==='PUT'?Promise.reject(Error('lost')):base(r));s.c.edit('Draft');await s.c.save();
 const original=s.client.request.bind(s.client), gate=defer();s.client.request=r=>r.path==='/api/agents/sample-main'?gate.promise:original(r);
 const pending=s.c.reconcile();await s.c.select('sample-helper');gate.resolve({status:404,body:null});await pending;assert.equal(s.c.getSnapshot().selected.id,'sample-helper');
 s.client.request=original;await s.c.select('sample-main');assert.equal(s.c.getSnapshot().unknown,true);
});
