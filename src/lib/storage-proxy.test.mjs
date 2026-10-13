// CL-05: /storage/<path> forwards to the backend /api/uploads/<path> with the
// user's token; unsafe segments never reach the backend.
// Run from the repo root: node --import tsx --test src/lib/storage-proxy.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { backendUploadUrl } from './storage-proxy.ts';
import { avatarModelCacheDir, avatarModelCacheUrl, uploadsRoot } from './uploads-dir.ts';

test('builds the backend upload URL and re-encodes each segment', () => {
  assert.equal(backendUploadUrl('http://127.0.0.1:41522/', ['avatars', 'user', 'u-1', 'a', 'avatar.glb']),
    'http://127.0.0.1:41522/api/uploads/avatars/user/u-1/a/avatar.glb');
  assert.equal(backendUploadUrl('http://b', ['profiles', 'a b#?.png']), 'http://b/api/uploads/profiles/a%20b%23%3F.png');
});

test('refuses empty, dot, separator and control segments', () => {
  for (const segs of [undefined, [], ['..', 'x'], ['.', 'x'], ['a/b'], ['a\\b'], ['a\u0000'], [''], new Array(33).fill('a')]) {
    assert.equal(backendUploadUrl('http://b', segs), null, JSON.stringify(segs));
  }
});

test('Next upload cache lives under .data/uploads, not public/', () => {
  const prev = process.env.UPLOADS_DIR;
  delete process.env.UPLOADS_DIR;
  try {
    assert.equal(uploadsRoot(), path.join(process.cwd(), '.data', 'uploads'));
    assert.ok(!avatarModelCacheDir().includes(`${path.sep}public${path.sep}`));
    assert.equal(avatarModelCacheUrl('h.glb'), '/storage/cache/avatar-models/h.glb');
  } finally {
    if (prev !== undefined) process.env.UPLOADS_DIR = prev;
  }
});
