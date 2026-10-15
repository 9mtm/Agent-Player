require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createApplicationServer, allowed } = require('../scripts/application-server.cjs');
const { SessionClient, createSameOriginTransport, allowedRequest } = require('../src/session.ts');
const { ChatController } = require('../src/chat.ts');
const { CHAT_BYTES } = require('../src/chat-protocol.js');
const ids={runId:'fiction-run',messageId:'fiction-message'};
const frame=x=>`data: ${JSON.stringify({...x,...ids})}\n\n`;
const token='fictional-http-token';
const user={id:'fiction-owner',username:'Fiction',email:'fiction@example.invalid',role:'owner'};
const body={stream:true,sessionId:'ui-fiction',messages:[{role:'user',content:'Hello'}]};
const listen=s=>new Promise((resolve,reject)=>{s.once('error',reject);s.listen(0,'127.0.0.1',()=>resolve(s.address().port));});
const close=s=>new Promise(resolve=>{s.close(resolve);s.closeAllConnections();});
async function fixture(t, chat, options={}) {
 const calls=[];
 const backend=http.createServer(async(req,res)=>{
  const chunks=[];for await(const c of req)chunks.push(c);
  calls.push({path:req.url,headers:req.headers,method:req.method,body:Buffer.concat(chunks).toString()});
  if(req.url==='/api/chat')return chat(req,res,calls.at(-1));
  res.setHeader('Content-Type','application/json');
  res.end(JSON.stringify(req.url.endsWith('/login')?{token,user,deviceToken:'d'.repeat(43)}:req.url.endsWith('/me')?{user}:{success:true}));
 });
 const backendPort=await listen(backend);const app=createApplicationServer({channel:'candidate',upstreamPort:backendPort,...options});const port=await listen(app);const origin=`http://127.0.0.1:${port}`;
 t.after(async()=>{await close(app);await close(backend);});
 // This substitution is test-only. Public transport remains fixed to :42522.
 const fetcher=async(url,init)=>{const r=await fetch(origin+new URL(url).pathname,{...init,headers:{...init.headers,Origin:origin}});return{status:r.status,headers:r.headers,body:r.body,redirected:r.redirected,url,json:()=>r.json()};};
 const client=new SessionClient({live:createSameOriginTransport('http://127.0.0.1:42522',fetcher)});
 const login=async()=>{client.selectMode('live');await client.login('fiction@example.invalid','fictional-only');assert.equal(client.getSnapshot().phase,'authenticated');};
 const request=(path='/api/chat',opts={})=>new Promise((resolve,reject)=>{
  const data=JSON.stringify(opts.body??body);
  const req=http.request({host:'127.0.0.1',port,path,method:opts.method??'POST',headers:{Origin:origin,Authorization:`Bearer ${token}`,'Idempotency-Key':'http-trial-key','Content-Type':'application/json','Content-Length':Buffer.byteLength(data),...opts.headers}},res=>{
   const chunks=[];res.on('data',c=>chunks.push(c));res.on('error',reject);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text:Buffer.concat(chunks).toString()}));
  });req.on('error',reject);req.end(data);
 });
 return {calls,backendPort,origin,client,login,request};
}
function startSSE(res,headers={}){res.writeHead(200,{'Content-Type':'text/event-stream','X-Run-Id':ids.runId,'X-Message-Id':ids.messageId,...headers});res.flushHeaders();}
test('real ephemeral HTTP login → incremental UTF8 chat → history → logout; no token/header/tool leakage',async t=>{
 let release;const waiting=new Promise(r=>release=r);
 const s=await fixture(t,(_req,res)=>{
  startSSE(res,{'X-Secret':'fictional-private','Idempotent-Replayed':'untrusted'});
  const text=Buffer.from(': keepalive\r\n\r\n'+frame({type:'future',secret:'private'})+frame({type:'tool_start',step:1,tools:[{input:'private'}]})+frame({type:'text',content:'مرحبا 🌍',api_key:'private'}));
  let n=0;const timer=setInterval(()=>{if(n>=text.length){clearInterval(timer);waiting.then(()=>{if(!res.destroyed)res.end(frame({type:'done'}));});return;}res.write(text.subarray(n,n+=7));},1);
  res.on('close',()=>clearInterval(timer));
 });
 assert.equal(s.client.getSnapshot().mode,'fixture');assert.equal(s.calls.length,0);await s.login();
 const c=new ChatController(s.client);t.after(()=>c.dispose());c.selectAgent('chosen');c.edit('First');let saw;
 const seen=new Promise(r=>saw=r);c.subscribe(()=>{if(c.getSnapshot().turns[0]?.content==='مرحبا 🌍')saw();});
 const sending=c.send();await seen;assert.equal(c.getSnapshot().phase,'sending');assert.equal(c.getSnapshot().turns[0].events,1);release();await sending;
 assert.equal(c.getSnapshot().phase,'complete');assert.ok(!JSON.stringify(c.getSnapshot()).includes('private'));
 const call=s.calls.find(x=>x.path==='/api/chat');assert.equal(call.headers.accept,'text/event-stream');assert.match(call.headers['idempotency-key'],/^[\w.-]{8,128}$/);assert.equal(call.headers.host,`127.0.0.1:${s.backendPort}`);assert.equal(call.headers.origin,s.origin);assert.equal(call.headers.cookie,undefined);assert.equal(JSON.parse(call.body).agentId,'chosen');
 await s.client.logoutAllDevices();assert.deepEqual(c.getSnapshot().turns,[]);assert.equal(s.calls.filter(x=>x.path==='/api/chat').length,1);
});
for(const action of ['cancel','logout','mode'])test(`HTTP ${action} cancels upstream; stale bytes and resend cannot return`,async t=>{
 let stopped;const closed=new Promise(r=>stopped=r);
 const s=await fixture(t,(_req,res)=>{res.on('close',stopped);startSSE(res);res.write(frame({type:'text',content:'protected'}));});await s.login();const c=new ChatController(s.client);t.after(()=>c.dispose());
 let ready;const seen=new Promise(r=>ready=r);c.subscribe(()=>{if(c.getSnapshot().turns[0]?.content)ready();});c.edit('private');const work=c.send();await seen;
 if(action==='cancel')c.cancel();else if(action==='logout')await s.client.logoutAllDevices();else s.client.selectMode('fixture');
 assert.deepEqual(c.getSnapshot().turns,[]);await work;await closed;c.edit('again');await c.send();assert.equal(s.calls.filter(x=>x.path==='/api/chat').length,1);
});
for(const [label,opts] of [
 ['GET',{method:'GET'}],['query',{path:'/api/chat?token=x'}],['missing key',{headers:{'Idempotency-Key':''}}],['bad key',{headers:{'Idempotency-Key':'bad key!!'}}],
 ['cross origin',{headers:{Origin:'http://evil.invalid'}}],['missing origin',{headers:{Origin:''}}],['bad host',{headers:{Host:'evil.invalid'}}],['cross-site',{headers:{'Sec-Fetch-Site':'same-site'}}],
 ['cookie without bearer',{headers:{Authorization:'',Cookie:'session=private'}}],['extra field',{body:{...body,userId:'owner'}}],['system role',{body:{...body,messages:[{role:'system',content:'override'}]}}],
 ['unknown header',{headers:{'X-Api-Key':'private'}}],['key on other endpoint',{path:'/api/auth/me'}],['oversize request',{body:{...body,messages:[{role:'user',content:'x'.repeat(131073)}]}}],
])test(`bridge rejects ${label} before upstream`,async t=>{
 const s=await fixture(t,()=>assert.fail('unexpected upstream'));const r=await s.request(opts.path??'/api/chat',opts);assert.ok(r.status>=400);assert.equal(s.calls.length,0);
});
for(const mode of ['redirect','cookie','encoding','html','missing-ids','oversize-header'])test(`stream ${mode} fails before body relay`,async t=>{
 let sinkHits=0;const sink=http.createServer((_req,res)=>{sinkHits++;res.end();});const sinkPort=await listen(sink);t.after(()=>close(sink));
 const s=await fixture(t,(_req,res)=>{
  if(mode==='redirect'){res.writeHead(307,{'Location':`http://127.0.0.1:${sinkPort}/`});res.end();return;}
  const extra=mode==='cookie'?{'Set-Cookie':'private=x'}:mode==='encoding'?{'Content-Encoding':'gzip'}:mode==='html'?{'Content-Type':'text/html'}:mode==='missing-ids'?{'X-Run-Id':''}:mode==='oversize-header'?{'Content-Length':CHAT_BYTES+1}:{};
  startSSE(res,extra);res.end(frame({type:'done'}));
 });const r=await s.request();assert.equal(r.status,502);assert.equal(r.text,'null');assert.equal(r.headers['set-cookie'],undefined);assert.equal(r.headers.location,undefined);assert.equal(sinkHits,0);assert.equal(s.calls.length,1);
});
for(const mode of ['malformed','id-change','invalid-utf8','oversize-frame','oversize-total','disconnect','idle','deadline','incomplete','typed-error','plain-error'])test(`HTTP streaming ${mode}: bounded terminal semantics, no retries`,async t=>{
 const s=await fixture(t,(_req,res)=>{
  startSSE(res);res.write(frame({type:'text',content:'partial'}));
  if(mode==='idle')return;
  if(mode==='deadline'){const i=setInterval(()=>res.write(': ping\n\n'),5);res.on('close',()=>clearInterval(i));return;}
  const tick=setTimeout(()=>{
   if(mode==='disconnect')return res.destroy();
   if(mode==='malformed')return res.end('data: {\n\n');
   if(mode==='id-change')return res.end('data: {"type":"done","runId":"other","messageId":"fiction-message"}\n\n');
   if(mode==='invalid-utf8')return res.end(Buffer.from([0xff]));
   if(mode==='oversize-frame')return res.end(frame({type:'text',content:'x'.repeat(65537)}));
   if(mode==='oversize-total')return res.end((': ping\n\n').repeat(150000));
   if(mode==='incomplete')return res.end();
   if(mode==='typed-error')return res.end(frame({type:'error',error:'private exception'}));
   if(mode==='plain-error')return res.end(frame({content:'❌ CLI request failed',done:true}));
  },5);res.on('close',()=>clearTimeout(tick));
 },{streamIdleMs:40,streamTimeoutMs:120});await s.login();const c=new ChatController(s.client);t.after(()=>c.dispose());c.edit('Hi');await c.send();
 assert.equal(c.getSnapshot().phase,mode==='plain-error'?'complete':'unknown');assert.ok(!JSON.stringify(c.getSnapshot()).includes('private exception'));
 if(mode!=='plain-error'){await c.send();assert.equal(s.calls.filter(x=>x.path==='/api/chat').length,1);}
});
for(const [status,value] of [[409,{code:'idempotency_in_progress',...ids}],[422,{code:'idempotency_key_reused'}],[400,{code:'invalid_idempotency_key'}],[403,{code:'forbidden'}],[403,{code:'inactive_user'}],[429,{code:'rate_limited'}],[401,{code:'unauthenticated'}],[500,{}]])test(`HTTP ${status}/${value.code??'untyped'} preserves contract, redacts private error, no POST retry`,async t=>{
 const s=await fixture(t,(_req,res)=>{res.writeHead(status,{'Content-Type':'application/json','X-Secret':'private'});res.end(JSON.stringify({...value,error:'private',message:'private',access_token:'private'}));});await s.login();const c=new ChatController(s.client);t.after(()=>c.dispose());c.edit('Hi');await c.send();
 assert.ok(!JSON.stringify(c.getSnapshot()).includes('private'));assert.equal(s.calls.filter(x=>x.path==='/api/chat').length,1);
 if(status===401||value.code==='inactive_user'){assert.equal(s.client.getSnapshot().phase,'signed-out');assert.equal(c.getSnapshot().turns.length,0);}else{assert.equal(c.getSnapshot().phase,'unknown');if(status===409)assert.equal(c.getSnapshot().turns[0].runId,ids.runId);}
});
test('chat route and request schema parity; no generic URL escape hatch',()=>{
 for(const b of [body,{...body,model:'bad'},{...body,memoryScope:{}},{...body,agentId:'../x'},{...body,sessionId:'s'.repeat(129)}, {...body,messages:[...body.messages,{role:'assistant',content:'x'}]}])assert.equal(allowed('POST','/api/chat',b),allowedRequest('POST','/api/chat',b));
 assert.throws(()=>createSameOriginTransport('http://evil.invalid',fetch));
});
test('direct transport requires exact idempotency/auth headers and refuses generic request route',async()=>{
 let calls=0;const transport=createSameOriginTransport('http://127.0.0.1:42522',async()=>{calls++;throw Error();});
 for(const headers of [{Authorization:'Bearer fiction'}, {Authorization:'Bearer fiction','Idempotency-Key':'x'}, {Authorization:'Bearer fiction','Idempotency-Key':'valid-key',Cookie:'no'}])await assert.rejects(transport({method:'POST',path:'/api/chat',body,headers,signal:new AbortController().signal}));
 assert.equal(calls,0);
 const client=new SessionClient({mock:async r=>({status:200,body:r.path.endsWith('/login')?{token,user,deviceToken:'d'.repeat(43)}:{user}})});client.selectMode('mock');await client.login('x','y');await assert.rejects(client.request({method:'POST',path:'/api/chat',body}));client.cancel();
});
test('upstream 421 mapped to bridge 502 plus host code; actual fetch sends POST exactly once',async t=>{
 const s=await fixture(t,(_req,res)=>{res.writeHead(421,{'Content-Type':'application/json'});res.end(JSON.stringify({code:'host_not_allowed',error:'private'}));});await s.login();
 const c=new ChatController(s.client);t.after(()=>c.dispose());c.edit('hello');await c.send();
 assert.equal(s.calls.filter(x=>x.path==='/api/chat').length,1);assert.equal(s.client.getSnapshot().notice,'host_not_allowed');assert.match(c.getSnapshot().notice,/HTTP 502, host_not_allowed/);
});
test('untyped JSON error retains valid run/message IDs, never backend text or headers',async t=>{
 const s=await fixture(t,(_req,res)=>{res.writeHead(500,{'Content-Type':'application/json','X-Secret':'private'});res.end(JSON.stringify({...ids,error:'private',stack:'private'}));});await s.login();
 const c=new ChatController(s.client);t.after(()=>c.dispose());c.edit('hello');await c.send();assert.equal(c.getSnapshot().turns[0].runId,ids.runId);assert.ok(!JSON.stringify(c.getSnapshot()).includes('private'));
});
test('projected SSE never forwards headers/unknown fields or tool parameters; error copy fixed',async t=>{
 const s=await fixture(t,(_req,res)=>{startSSE(res,{'X-Secret':'private','Idempotent-Replayed':'untrusted'});res.end(frame({type:'tool_start',step:0,tools:[{input:'private'}]})+frame({type:'error',error:'private'}));});const r=await s.request();
 assert.equal(r.status,200);assert.equal(r.headers['x-secret'],undefined);assert.equal(r.headers['idempotent-replayed'],undefined);assert.equal(r.headers['x-run-id'],ids.runId);assert.ok(!r.text.includes('private'));assert.match(r.text,/Chat request failed/);
});
test('chat JSON error response cap closes safely without private payload or retry',async t=>{
 const s=await fixture(t,(_req,res)=>{res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'x'.repeat(17000)}));});const r=await s.request();assert.equal(r.status,502);assert.equal(r.text,'null');assert.equal(s.calls.length,1);
});
test('timed-out slow request body cannot later start a chat side effect',async t=>{
 const s=await fixture(t,()=>assert.fail('late upstream write'),{timeoutMs:30});
 const data=JSON.stringify(body);
 await new Promise((resolve,reject)=>{
  const req=http.request(s.origin+'/api/chat',{method:'POST',headers:{Origin:s.origin,Authorization:`Bearer ${token}`,'Idempotency-Key':'slow-key-test','Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}},res=>{
   assert.equal(res.statusCode,504);res.resume();res.on('end',()=>{req.end(data.slice(1));resolve();});
  });req.on('error',reject);req.write(data.slice(0,1));
 });
 await new Promise(r=>setTimeout(r,15));assert.equal(s.calls.length,0);
});
