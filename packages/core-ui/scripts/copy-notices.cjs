const { copyFileSync } = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function copyNotices(output) {
  copyFileSync(path.join(root, 'THIRD_PARTY_NOTICES.txt'), path.join(output, 'THIRD_PARTY_NOTICES.txt'));
}
module.exports = { copyNotices };
