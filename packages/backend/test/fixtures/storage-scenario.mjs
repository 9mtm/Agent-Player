// B2.2d-1: one storage_files scenario for both drivers. The caller sets up
// the environment (temp cwd, STORAGE_BASE_DIR, driver), writes a file at
// <base>/cdn/images/pre-<tag>.png BEFORE calling, and passes the modules.
// Used by test/storage-manager.test.mjs (SQLite) and
// test/pg-storage.integration.test.mjs (PostgreSQL).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

async function readStream(stream) {
  const chunks = [];
  for await (const c of stream) chunks.push(Buffer.from(c));
  return Buffer.concat(chunks).toString('utf8');
}

export function storageScenario(test, getM, { tag, skip = false }) {
  const m = () => getM();

  test('initialize indexes files already on disk, once', { skip }, async () => {
    const { mgr, q } = m();
    await mgr.initialize();
    await mgr.initialize();
    const rows = await q.all('SELECT category, created_by, size_bytes FROM storage_files WHERE filename = ?', `pre-${tag}.png`);
    assert.deepEqual(rows, [{ category: 'images', created_by: 'disk-sync', size_bytes: 3 }]);
  });

  test('save, getById, search (case-insensitive text, tags), url, stream', { skip }, async () => {
    const { mgr } = m();
    const f = await mgr.save({
      zone: 'cdn', category: 'files', data: Buffer.from('hello'),
      filename: `a-${tag}.txt`, mimeType: 'text/plain',
      description: `Report ${tag}`, tags: ['alpha'], createdBy: 'user',
    });
    assert.equal(f.sizeBytes, 5);
    assert.equal(typeof f.sizeBytes, 'number');
    assert.deepEqual(f.tags, ['alpha']);
    assert.equal(f.filepath, `cdn/files/a-${tag}.txt`);
    const again = await mgr.getById(f.id);
    assert.equal(again.filename, `a-${tag}.txt`);
    assert.ok(again.accessCount >= 1, 'getById counts the access');
    assert.deepEqual((await mgr.search({ q: `REPORT ${tag.toUpperCase()}` })).map((x) => x.id), [f.id]);
    assert.deepEqual((await mgr.search({ zone: 'cdn', category: 'files', tags: ['alpha'] })).map((x) => x.id), [f.id]);
    assert.deepEqual(await mgr.search({ zone: 'cache', q: tag }), []);
    assert.equal(await mgr.getPublicUrl(f.id), `/api/storage/${f.id}`);
    const s = await mgr.getStream(f.id);
    assert.equal(await readStream(s.stream), 'hello');
    assert.equal(await mgr.getById('missing-id'), null);
    assert.equal(await mgr.getStream('missing-id'), null);
  });

  test('indexExistingFile records an outside file by absolute path', { skip }, async () => {
    const { mgr, outsideFile } = m();
    const f = await mgr.indexExistingFile({ zone: 'cache', category: 'audio', filepath: outsideFile, mimeType: 'audio/mpeg' });
    assert.equal(f.filepath, outsideFile);
    assert.equal(f.sizeBytes, readFileSync(outsideFile).length);
    const s = await mgr.getStream(f.id);
    assert.equal(await readStream(s.stream), 'mp3');
  });

  test('stats: numbers on both drivers; totals match the table', { skip }, async () => {
    const { mgr, q } = m();
    const st = await mgr.stats();
    const raw = await q.one('SELECT COUNT(*) AS n, SUM(size_bytes) AS b FROM storage_files');
    assert.equal(typeof st.totalBytes, 'number', 'SUM is a number, not numeric text');
    assert.equal(st.totalFiles, raw.n);
    assert.equal(st.totalBytes, Number(raw.b));
    assert.ok(st.byZone.cdn >= 2);
    assert.ok(st.byCategory.files >= 1);
  });

  test('cleanup deletes only expired rows and their files', { skip }, async () => {
    const { mgr, q } = m();
    const old = await mgr.save({ zone: 'cache', category: 'web', data: 'expired!', filename: `old-${tag}.txt`, ttl: '24h' });
    const fresh = await mgr.save({ zone: 'cache', category: 'web', data: 'fresh', filename: `new-${tag}.txt`, ttl: '24h' });
    await q.run('UPDATE storage_files SET expires_at = ? WHERE id = ?', '2000-01-01T00:00:00.000Z', old.id);
    const r = await mgr.cleanup();
    assert.ok(r.deleted >= 1);
    assert.ok(r.freedBytes >= 8);
    assert.equal(await mgr.getById(old.id), null);
    assert.ok(await mgr.getById(fresh.id));
  });

  test('extension analytics storage usage sums size_bytes of the extension files', { skip }, async () => {
    const { mgr, analytics } = m();
    const ext = `ext-st-${tag}`;
    await mgr.save({ zone: 'cdn', category: `extensions/${ext}`, data: 'abc', filename: `e1-${tag}.txt` });
    await mgr.save({ zone: 'cdn', category: `extensions/${ext}`, data: 'abcd', filename: `e2-${tag}.txt` });
    const a = await analytics.getExtensionAnalytics(ext);
    assert.deepEqual(a.storageUsage, { fileCount: 2, totalBytes: 7, totalMB: 0 });
    const none = await analytics.getExtensionAnalytics(`ext-none-${tag}`);
    assert.deepEqual(none.storageUsage, { fileCount: 0, totalBytes: 0, totalMB: 0 });
  });

  test('FIX-STO-01: an extension subtree search finds sub-category files; wildcards never leak to other extensions', { skip }, async () => {
    const { mgr, analytics, storage } = m();
    const ext = `ex_${tag}`; // `_` is a LIKE wildcard: must be matched literally
    await mgr.save({ zone: 'cdn', category: `extensions/${ext}`, data: 'a', filename: `t1-${tag}.txt` });
    await mgr.save({ zone: 'cdn', category: `extensions/${ext}/img`, data: 'bb', filename: `t2-${tag}.txt` });
    await mgr.save({ zone: 'cdn', category: `extensions/${ext}/img/deep`, data: 'ccc', filename: `t3-${tag}.txt` });
    await mgr.save({ zone: 'cdn', category: `extensions/${ext}x`, data: 'zzzz', filename: `o1-${tag}.txt` }); // prefix sibling
    await mgr.save({ zone: 'cdn', category: `extensions/exA${tag}/img`, data: 'zzzzz', filename: `o2-${tag}.txt` }); // matches only if '_' were a wildcard
    const names = async (category, categoryTree) => (await mgr.search({ zone: 'cdn', category, categoryTree, limit: 100 })).map((f) => f.filename).sort();
    assert.deepEqual(await names(`extensions/${ext}`, true), [`t1-${tag}.txt`, `t2-${tag}.txt`, `t3-${tag}.txt`]);
    assert.deepEqual(await names(`extensions/${ext}`, false), [`t1-${tag}.txt`], 'exact match without categoryTree');
    assert.deepEqual(await names(`extensions/${ext}/img`, true), [`t2-${tag}.txt`, `t3-${tag}.txt`]);
    const usage = (await analytics.getExtensionAnalytics(ext)).storageUsage;
    assert.deepEqual([usage.fileCount, usage.totalBytes], [3, 6]);
    assert.equal(storage.inCategoryTree(`extensions/${ext}/img`, `extensions/${ext}`), true);
    assert.equal(storage.inCategoryTree(`extensions/${ext}x`, `extensions/${ext}`), false, 'no bare-prefix match');
  });

  test('dashboard storage-usage widget sums size_bytes per zone', { skip }, async () => {
    const { app, q } = m();
    const res = await app.inject({ method: 'GET', url: '/api/dashboard/widgets/storage-usage' });
    assert.equal(res.statusCode, 200, res.body);
    const data = res.json().chart.data;
    const expected = await q.all('SELECT zone, SUM(size_bytes) AS b FROM storage_files GROUP BY zone ORDER BY zone');
    const byZone = Object.fromEntries(data.map((d) => [d.label.split(' ')[0], d.value]));
    for (const row of expected) assert.equal(byZone[row.zone], Number(row.b), `zone ${row.zone}`);
    assert.ok(byZone.cdn > 0, 'real sums, not 0 / an error');
  });

  test('delete removes the row and the stored file', { skip }, async () => {
    const { mgr, base } = m();
    const f = await mgr.save({ zone: 'cdn', category: 'files', data: 'bye', filename: `d-${tag}.txt` });
    assert.equal(await mgr.delete(f.id), true);
    assert.equal(await mgr.getById(f.id), null);
    assert.equal(await mgr.delete(f.id), false);
    await new Promise((r) => setTimeout(r, 50)); // provider.remove is fire-and-forget
    assert.throws(() => readFileSync(`${base}/cdn/files/d-${tag}.txt`), /ENOENT/);
  });
}
