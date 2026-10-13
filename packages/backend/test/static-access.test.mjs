// S0-A.7: runtime data under public/storage/{cache,cdn,extensions} is not
// served by @fastify/static; display assets stay public.
// Run: node --import tsx --test test/static-access.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const backendDir = process.cwd();
const { isPublicStaticPath } = await import(join(backendDir, 'src/api/static-access.ts'));
const { default: Fastify } = await import('fastify');
const { default: fastifyStatic } = await import('@fastify/static');

const root = mkdtempSync(join(tmpdir(), 'ap-static-'));
for (const rel of ['storage/cache/screenshots/s.png', 'storage/cdn/files/f.txt', 'storage/extensions/trading/d.json',
  'storage/profiles/p.png', 'storage/avatars/user/1/a/avatar.glb', 'icons/x.svg']) {
  mkdirSync(join(root, rel, '..'), { recursive: true });
  writeFileSync(join(root, rel), 'data');
}
const app = Fastify();
await app.register(fastifyStatic, { root, prefix: '/', allowedPath: (p) => isPublicStaticPath(p) });
await app.ready();
test.after(async () => { await app.close(); rmSync(root, { recursive: true, force: true }); });

test('private runtime zones answer 404, also with encodings and case tricks', async () => {
  for (const url of ['/storage/cache/screenshots/s.png', '/storage/cdn/files/f.txt', '/storage/extensions/trading/d.json',
    '/storage/%63ache/screenshots/s.png', '/STORAGE/CDN/files/f.txt', '/storage/./cdn/files/f.txt', '/icons/../storage/cdn/files/f.txt',
    '//storage/cdn/files/f.txt', '/storage/cdn%2Ffiles/f.txt']) {
    const res = await app.inject({ method: 'GET', url });
    assert.equal(res.statusCode, 404, `${url} -> ${res.statusCode}`);
  }
});

test('display assets stay public', async () => {
  for (const url of ['/storage/profiles/p.png', '/storage/avatars/user/1/a/avatar.glb', '/icons/x.svg']) {
    const res = await app.inject({ method: 'GET', url });
    assert.equal(res.statusCode, 200, `${url} -> ${res.statusCode}`);
  }
});

test('isPublicStaticPath', () => {
  assert.equal(isPublicStaticPath('/storage/cache'), false);
  assert.equal(isPublicStaticPath('/storage/cachex/a'), true);
  assert.equal(isPublicStaticPath('/storage/%E0%A4%A'), false); // bad encoding
  assert.equal(isPublicStaticPath('/storage\\cdn\\a'), false);
});
