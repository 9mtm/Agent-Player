// B2.2d-5: one skills-marketplace scenario for both drivers: the Anthropic
// skills service (install with the GitHub fetch stubbed — no network —,
// search, installed list, usage log, enabled content, uninstall) and the
// marketplace DB routes (sources, installed, stats, toggle). The caller
// sets up a temp cwd (the skills directory is relative to it), the driver,
// the routes behind the auth gate, and passes { app, q, auth, svc }.
// Used by test/skills-marketplace.test.mjs (SQLite) and
// test/pg-skills.integration.test.mjs (PostgreSQL).
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

export function skillsScenario(test, getM, { tag, skip = false }) {
  const m = () => getM();
  const owner = `sk-owner-${tag}`;
  const name = `pdf-tools-${tag}`;
  const call = async (method, url) => m().app.inject({ method, url, headers: m().auth(owner) });
  let skill;

  test('seed owner; stub the GitHub fetch', { skip }, async () => {
    const { q, svc } = m();
    await q.run(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', 'owner', 'active')`, owner, `${owner}@example.test`, owner);
    svc.fetchSkillContent = async (p) => `---\nname: PDF Tools ${tag}\ndescription: Works with PDF files (${p})\n---\n# Body ${tag}\n`;
  });

  test('install writes the file and one row; reinstall upserts', { skip }, async () => {
    const { q, svc } = m();
    const p = await svc.installSkill(name, `skills/documents/${name}`);
    assert.ok(existsSync(p));
    await svc.installSkill(name, `skills/documents/${name}`);
    const rows = await q.all('SELECT * FROM installed_skills WHERE skill_name = ?', name);
    assert.equal(rows.length, 1);
    skill = rows[0];
    assert.match(skill.id, /^skill_[a-f0-9]{32}$/);
    assert.equal(skill.display_name, `PDF Tools ${tag}`);
    assert.equal(skill.category, 'documents');
    assert.equal(skill.is_enabled, 1);
    await assert.rejects(svc.installSkill('../evil', 'skills/x/y'), /Invalid/);
  });

  test('search is case-insensitive; installed list joins the source', { skip }, async () => {
    const { svc } = m();
    assert.deepEqual((await svc.searchSkills(`PDF-TOOLS-${tag.toUpperCase()}`)).map((s) => s.id), [skill.id]);
    const installed = await svc.getInstalledSkills();
    const mine = installed.find((s) => s.id === skill.id);
    assert.equal(mine.source_name, 'Anthropic Official');
    assert.match(await svc.getEnabledSkillsContent(), new RegExp(`# Body ${tag}`));
  });

  test('usage log counts and stamps last_used as TEXT', { skip }, async () => {
    const { q, svc } = m();
    await svc.logSkillUsage(skill.id, owner, undefined, true);
    await svc.logSkillUsage(skill.id, undefined, undefined, false);
    const row = await q.one('SELECT usage_count, last_used FROM installed_skills WHERE id = ?', skill.id);
    assert.equal(row.usage_count, 2);
    assert.match(row.last_used, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    assert.equal((await q.one('SELECT COUNT(*) AS n FROM skill_usage_log WHERE skill_id = ?', skill.id)).n, 2);
  });

  test('routes: sources, installed, stats, toggle (one statement), bad id', { skip }, async () => {
    const src = await call('GET', '/api/skills/marketplace/sources');
    assert.equal(src.statusCode, 200, src.body);
    assert.ok(src.json().sources.some((s) => s.name === 'Anthropic Official'));
    const inst = await call('GET', '/api/skills/marketplace/installed');
    assert.ok(inst.json().skills.some((s) => s.id === skill.id));
    const st = (await call('GET', '/api/skills/marketplace/stats')).json().stats;
    assert.equal(typeof st.totalInstalled.count, 'number');
    assert.ok(st.enabled.count >= 1);
    assert.ok(st.byCategory.some((c) => c.category === 'documents'));
    assert.ok(st.mostUsed.some((s) => s.skill_name === name));
    const off = await call('PUT', `/api/skills/marketplace/${skill.id}/toggle`);
    assert.equal(off.statusCode, 200, off.body);
    assert.equal(off.json().enabled, false);
    assert.equal((await call('PUT', `/api/skills/marketplace/${skill.id}/toggle`)).json().enabled, true);
    assert.equal((await call('PUT', '/api/skills/marketplace/not-an-id/toggle')).statusCode, 400);
  });

  test('uninstall deletes the row and the file', { skip }, async () => {
    const { q, svc } = m();
    await svc.uninstallSkill(skill.id);
    assert.equal(await q.one('SELECT id FROM installed_skills WHERE id = ?', skill.id), undefined);
    assert.equal(existsSync(skill.file_path), false);
    await assert.rejects(svc.uninstallSkill(skill.id), /not found/);
  });
}
