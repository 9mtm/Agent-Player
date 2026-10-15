const path = require('node:path');
const root = path.resolve(__dirname, '..');
const ts = require('../node_modules/typescript');
const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const program = ts.createProgram(parsed.fileNames, parsed.options);
const errors = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
if (errors.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(errors, { getCanonicalFileName: x => x, getCurrentDirectory: () => root, getNewLine: () => '\n' }));
  process.exitCode = 1;
} else console.log(`PASS: strict TypeScript check (${parsed.fileNames.length} source files); no emit`);
