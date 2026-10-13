// S0-A.8: URL path segments joined onto directories must be plain names.
// Run from the repo root: node --import tsx --test src/lib/net/path-segment.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { isSafePathSegment } from './path-segment.ts';

test('plain names are accepted', () => {
  for (const v of ['web-search', 'my_skill', 'Author1', 'skill.v2']) assert.equal(isSafePathSegment(v), true, v);
});

test('traversal, separators, hidden names and odd input are refused', () => {
  for (const v of ['..', '.', '../etc', '..\\x', 'a/b', 'a\\b', '.git', 'C:', 'a\0b', '', ' ', 'x'.repeat(129), null, undefined, 5, ['a']]) {
    assert.equal(isSafePathSegment(v), false, String(v));
  }
});
