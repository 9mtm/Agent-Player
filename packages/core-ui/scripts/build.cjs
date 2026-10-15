const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { root, beginBuild, completeBuild, failBuild } = require('./build-artifacts.cjs');
const { copyNotices } = require('./copy-notices.cjs');
function parseBuildArgs(args) {
  if (args.some(arg => !['--candidate', '--live-entry'].includes(arg)) || new Set(args).size !== args.length) throw new Error('Invalid build arguments');
  const channel = args.includes('--candidate') ? 'candidate' : 'current';
  const entryMode = args.includes('--live-entry') ? 'live-candidate' : 'fictional';
  if (entryMode === 'live-candidate' && channel !== 'candidate') throw new Error('Live entry requires candidate build');
  return { channel, entryMode };
}
async function main(args = process.argv.slice(2)) {
  const { channel, entryMode } = parseBuildArgs(args);
  const { buildId, output } = beginBuild(root, channel, entryMode);
  try {
    const check = spawnSync(process.execPath, [path.join(__dirname, 'typecheck.cjs')], { cwd: root, stdio: 'inherit' });
    if (check.error || check.status !== 0) throw new Error('Typecheck failed');
    const { build } = await import('vite');
    await build({ configFile: false, root, base: '/', envDir: false, publicDir: false,
      define: { __LIVE_ENTRY_CANDIDATE__: JSON.stringify(entryMode === 'live-candidate') },
      plugins: [{ name: 'entry-provenance', transformIndexHtml: () => [{ tag: 'meta', attrs: { name: 'core-ui-entry', content: entryMode }, injectTo: 'head' }] }],
      css: { postcss: { plugins: [] } },
      build: { outDir: output, emptyOutDir: false, license: true } });
    copyNotices(output);
    completeBuild(root, buildId, channel);
    console.log(`${channel} build: ${output}\nManifest: ${path.join(root, 'dist', `${channel}.json`)}`);
  } catch (error) {
    failBuild(root, buildId, channel);
    throw error;
  }
}
module.exports = { parseBuildArgs };
if (require.main === module) main().catch(() => { console.error('Build failed; preview disabled for this result. Previous outputs retained.'); process.exitCode = 1; });
