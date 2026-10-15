require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SSEParser, projectFrame, validChatBody, CHAT_BYTES, FRAME_BYTES } = require('../src/chat-protocol.js');
const { SessionClient, createSameOriginTransport, allowedRequest } = require('../src/session.ts');
const { createLoginMock } = require('../src/session-mock.ts');
const { ChatController } = require('../src/chat.ts');
const { ChatReview } = require('../src/ChatDestination.tsx');
const ids = { runId: 'run-1', messageId: 'message-1' };
const enc = new TextEncoder();
const frame = x => `data: ${JSON.stringify({ ...x, ...ids })}\n\n`;
const body = { stream: true, sessionId: 'ui-conversation', messages: [{ role: 'user', content: 'Hello' }] };
const owner = { id: 'fiction-owner', email: 'fiction@example.invalid', username: 'Fiction', role: 'owner' };
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return {promise,resolve}; };
function streamText(text) { return new ReadableStream({ start(c) { c.enqueue(enc.encode(text)); c.close(); } }); }
async function setup(chat = async () => ({ status:200, body:null, stream:streamText(frame({type:'text',content:'Hello'})+frame({type:'done'})), streamIds:ids })) {
 const calls=[];
 const transport=async r=>{calls.push(r);if(r.path.endsWith('/login'))return{status:200,body:{token:'fiction-token',deviceToken:'d'.repeat(43),user:owner}};if(r.path.endsWith('/me'))return{status:200,body:{user:owner}};if(r.path.endsWith('/logout'))return{status:200,body:{success:true}};return chat(r);};
 const client=new SessionClient({mock:transport});client.selectMode('mock');await client.login('x','y');let n=0;
 const controller=new ChatController(client,()=>`request-key-${++n}`);
 return {client,controller,calls};
}
test('SSE byte-by-byte UTF8/CRLF, comments, metadata and multiple data lines',()=>{
 const text=': comment\r\nretry: 0\r\nid: ignored\r\n\r\ndata: {"runId":"run-1",\r\ndata: "messageId":"message-1","content":"مرحبا 🌍","done":false}\r\n\r\n'+frame({type:'done'});
 const bytes=enc.encode(text);
 for(let split=0;split<=bytes.length;split++){
  const p=new SSEParser(ids);const out=[...p.push(bytes.slice(0,split)),...p.push(bytes.slice(split))];p.finish();assert.equal(out[0].content,'مرحبا 🌍');assert.equal(out.length,2);
 }
 const p=new SSEParser();const out=[];for(const byte of bytes)out.push(...p.push(Uint8Array.of(byte)));p.finish();assert.equal(out[0].content,'مرحبا 🌍');
});
test('multiple frames, unknown event types and metadata cannot fabricate completion',()=>{
 const p=new SSEParser();const out=p.push(enc.encode(frame({type:'future',content:'secret',done:true})+frame({type:'text',content:'visible'})+frame({type:'done'})));
 p.finish();assert.equal(out.length,2);assert.equal(out[0].content,'visible');
 const unknown=new SSEParser();assert.deepEqual(unknown.push(enc.encode(frame({type:'future',done:true}))),[]);assert.throws(()=>unknown.finish());
});
test('typed error projected; plain text error remains plain terminal content',()=>{
 assert.equal(projectFrame({...ids,type:'error',error:'private-exception',token:'private'}).error,'Chat request failed');
 const p=new SSEParser();const out=p.push(enc.encode(frame({content:'❌ CLI request failed',done:true})));p.finish();assert.equal(out[0].type,undefined);assert.equal(out[0].content,'❌ CLI request failed');
});
for(const [label,text] of [
 ['malformed','data: {\n\n'],['array','data: []\n\n'],['missing ids','data: {"content":"x","done":true}\n\n'],
 ['nonboolean done',frame({content:'x',done:'true'})],['missing content',frame({type:'text'})],['bad terminal',frame({type:'done',done:false})],
 ['mismatched ids',frame({type:'text',content:'a'})+'data: {"runId":"other","messageId":"message-1","type":"done"}\n\n'],
 ['after done',frame({type:'done'})+frame({type:'text',content:'late'})],['partial final',frame({type:'text',content:'a'})],
 ['unterminated',frame({type:'done'}).trimEnd()],['bad tool',frame({type:'tool_start',step:-1})],
])test(`protocol rejects ${label}`,()=>{assert.throws(()=>{const p=new SSEParser(ids);p.push(enc.encode(text));p.finish();});});
test('UTF8, frame, total and frame-count limits fail closed',()=>{
 assert.throws(()=>new SSEParser().push(Uint8Array.of(0xff)));
 assert.throws(()=>new SSEParser().push(enc.encode(frame({type:'text',content:'x'.repeat(FRAME_BYTES)}))));
 assert.throws(()=>new SSEParser().push(new Uint8Array(CHAT_BYTES+1)));
 const p=new SSEParser();assert.throws(()=>p.push(enc.encode(frame({type:'future'}).repeat(4097))));
});
test('tool data and arbitrary metadata never projected, IDs/terminal replay flags retained',()=>{
 assert.deepEqual(projectFrame({...ids,type:'tool_start',step:1,tools:[{input:'private'}],token:'private'}),{...ids,type:'tool_start',step:1});
 assert.deepEqual(projectFrame({...ids,type:'done',replayed:true,incomplete:true}),{...ids,type:'done',done:true,replayed:true,incomplete:true});
});
test('exact POST request body; unsupported model/user/scope/system fields rejected',()=>{
 assert.equal(validChatBody(body),true);assert.equal(allowedRequest('POST','/api/chat',body),true);
 for(const key of ['userId','memoryScope','systemPrompt','model','url','chatContext'])assert.equal(validChatBody({...body,[key]:'bad'}),false);
 for(const bad of [{...body,stream:false},{...body,sessionId:'../x'},{...body,messages:[{role:'system',content:'x'}]}, {...body,messages:[{role:'user',content:' '}]}])assert.equal(validChatBody(bad),false);
 assert.equal(allowedRequest('GET','/api/chat'),false);
});
test('controlled sends capture current history, agent and session; unique key only on explicit sends',async()=>{
 const s=await setup();s.controller.selectAgent('chosen-agent');s.controller.edit('First');await s.controller.send();
 assert.equal(s.controller.getSnapshot().phase,'complete');s.controller.selectAgent('other');s.controller.edit('Second');await s.controller.send();
 const calls=s.calls.filter(c=>c.path==='/api/chat');assert.equal(calls.length,2);assert.notEqual(calls[0].headers['Idempotency-Key'],calls[1].headers['Idempotency-Key']);
 assert.deepEqual(calls[1].body.messages,[{role:'user',content:'First'},{role:'assistant',content:'Hello'},{role:'user',content:'Second'}]);
 assert.equal(calls[1].body.agentId,'chosen-agent');assert.equal(calls[0].body.sessionId,calls[1].body.sessionId);assert.equal(s.controller.getSnapshot().turns[1].runId,ids.runId);
 s.controller.dispose();
});
test('busy double click produces one POST; cancel clears protected text and locks resend',async()=>{
 let c;const s=await setup(async()=>({status:200,body:null,stream:new ReadableStream({start(x){c=x; x.enqueue(enc.encode(frame({type:'text',content:'protected'})));}}),streamIds:ids}));
 s.controller.edit('private');const pending=s.controller.send();await new Promise(r=>setImmediate(r));await s.controller.send();
 assert.equal(s.controller.getSnapshot().turns[0].content,'protected');s.controller.cancel();assert.deepEqual(s.controller.getSnapshot().turns,[]);await pending;
 s.controller.edit('resend');await s.controller.send();assert.equal(s.calls.filter(c=>c.path==='/api/chat').length,1);assert.equal(s.controller.getSnapshot().phase,'unknown');s.controller.dispose();
});
for(const action of ['logout','mode','login','dispose','401','inactive'])test(`session ${action} clears messages synchronously and cancels reads`,async()=>{
 let cancelled=false;
 const s=await setup(async r=>r.path==='/api/chat'?{status:200,body:null,stream:new ReadableStream({start(c){c.enqueue(enc.encode(frame({type:'text',content:'protected'})));},cancel(){cancelled=true;}}),streamIds:ids}:{status:action==='inactive'?403:401,body:{code:'inactive_user'}});
 s.controller.edit('private');const work=s.controller.send();await new Promise(r=>setImmediate(r));
 let next;
 if(action==='logout')next=s.client.logoutAllDevices();if(action==='mode')s.client.selectMode('fixture');if(action==='login')next=s.client.login('x','y');if(action==='dispose')s.controller.dispose();
 if(action==='401'||action==='inactive')next=s.client.request({method:'GET',path:'/api/memory/proposals'});
 if(next)await next;
 assert.equal(s.controller.getSnapshot().turns.length,0);assert.equal(s.controller.getSnapshot().draft,'');await work;assert.equal(cancelled,true);s.controller.dispose();
});
test('late transport ignoring cancellation cannot repopulate new epoch',async()=>{
 const d=deferred();let cancelled=false;const s=await setup(()=>d.promise);s.controller.edit('secret');const work=s.controller.send();s.client.selectMode('fixture');
 d.resolve({status:200,body:null,stream:new ReadableStream({cancel(){cancelled=true;}})});await work;assert.equal(cancelled,true);assert.deepEqual(s.controller.getSnapshot().turns,[]);s.controller.dispose();
});
for(const kind of ['disconnect','malformed','truncated','incomplete','typed-error','409','422','500'])test(`${kind} is honest, preserves IDs where provided and never retries`,async()=>{
 const s=await setup(async()=>{
  if(['409','422','500'].includes(kind))return{status:Number(kind),body:kind==='409'?{code:'idempotency_in_progress',...ids,error:'secret'}:kind==='422'?{code:'idempotency_key_reused',error:'secret'}:{error:'secret'}};
  const data=kind==='malformed'?'data: {\n\n':kind==='typed-error'?frame({type:'error',error:'secret'}):frame({type:'text',content:'partial',...(kind==='truncated'?{truncated:true}:{})})+(kind==='disconnect'?'':frame({type:'done',...(kind==='incomplete'?{incomplete:true}:{})}));
  return{status:200,body:null,stream:streamText(data),streamIds:ids};
 });s.controller.edit('Hi');await s.controller.send();const state=s.controller.getSnapshot();assert.equal(state.phase,'unknown');assert.match(state.notice,/Retry is disabled/);assert.ok(!JSON.stringify(state).includes('secret'));
 if(kind==='409')assert.equal(state.turns[0].runId,ids.runId);
 await s.controller.send();assert.equal(s.calls.filter(c=>c.path==='/api/chat').length,1);s.controller.dispose();
});
test('no invented typed error for terminal backend text; all UI text escaped',async()=>{
 const s=await setup(async()=>({status:200,body:null,stream:streamText(frame({content:'<img src=x onerror=alert(1)> ❌ request failed',done:true})),streamIds:ids}));
 s.controller.edit('<script>alert(1)</script>');await s.controller.send();assert.equal(s.controller.getSnapshot().phase,'complete');
 const html=renderToStaticMarkup(React.createElement(ChatReview,{controller:s.controller}));assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script>'));assert.match(html,/&lt;img/);s.controller.dispose();
});
test('explicit offline mock mirrors replay/409/422 contract with the same key, no network',async()=>{
 const client=new SessionClient({mock:createLoginMock()});client.selectMode('mock');await client.login('demo@example.invalid','mock-only');
 const a=new AbortController(),out=[];const work=client.chat(body,'fixture-key',f=>out.push(f),a.signal);
 const running=await client.chat(body,'fixture-key',()=>{},new AbortController().signal);assert.equal(running.status,409);await work;
 const replay=[];await client.chat(body,'fixture-key',f=>replay.push(f),new AbortController().signal);assert.equal(replay[0].replayed,true);assert.equal(replay[0].runId,out[0].runId);
 const reused=await client.chat({...body,messages:[{role:'user',content:'different'}]},'fixture-key',()=>{},new AbortController().signal);assert.equal(reused.status,422);client.cancel();
});
test('bounded history refuses further sends rather than silently dropping messages',async()=>{
 const s=await setup();for(let i=0;i<32;i++){s.controller.edit('Hi');await s.controller.send();}s.controller.edit('Extra');await s.controller.send();assert.equal(s.calls.filter(c=>c.path==='/api/chat').length,32);assert.match(s.controller.getSnapshot().notice,/limit reached/);s.controller.dispose();
});
