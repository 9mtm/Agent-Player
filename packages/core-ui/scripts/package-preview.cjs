const { packageCurrent } = require('./build-artifacts.cjs');
try { console.log(`Current-only package: ${packageCurrent()}`); }
catch { console.error('No verified current build to package. Run npm run build successfully first.'); process.exitCode = 1; }
