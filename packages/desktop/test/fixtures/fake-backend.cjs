'use strict';
// Stand-in for the backend in lifecycle tests: same env, IPC and token contract.
const http = require('node:http');
const mode = process.env.FAKE_MODE || 'ok';
if (mode === 'crash') { console.error(`boom ${process.env.AGENT_PLAYER_LAUNCH_TOKEN}`); process.exit(3); }
if (mode === 'ignore-stop') { process.on('SIGTERM', () => {}); process.on('disconnect', () => {}); }
const server = http.createServer((req, res) => {
  if (req.headers['x-agent-player-launch'] !== process.env.AGENT_PLAYER_LAUNCH_TOKEN) { res.writeHead(403); return res.end(); }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true, origin: process.env.ALLOWED_ORIGINS, dataDir: process.env.AGENT_PLAYER_DATA_DIR, cwd: process.cwd(), leaked: process.env.FAKE_SECRET ?? null }));
});
server.listen(Number(process.env.PORT), process.env.HOST, () => {
  console.log(`listening, token=${process.env.AGENT_PLAYER_LAUNCH_TOKEN}`);
  if (mode === 'never-ready') return;
  process.send({ type: 'listening', host: mode === 'wrong-host' ? '0.0.0.0' : process.env.HOST, port: server.address().port });
});
const shutdown = () => server.close(() => process.exit(0));
if (mode !== 'ignore-stop') {
  process.on('message', m => { if (m && m.type === 'shutdown') shutdown(); });
  process.once('disconnect', shutdown);
}
if (mode === 'ignore-stop') setInterval(() => {}, 1000);
