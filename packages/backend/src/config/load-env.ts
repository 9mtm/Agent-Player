/**
 * Side-effect module: load `.env`, then the generated secrets (INST-02).
 *
 * Import it as the very first import of an entry point. ES module imports are
 * evaluated in order before the importing module's body runs, so a `dotenv`
 * call in the body would run after every other import has already read
 * process.env.
 */

import { config as loadDotenv } from 'dotenv';
import { bootstrapSecrets, SecretsBootstrapError } from './secrets-bootstrap.js';

loadDotenv({ quiet: true });

try {
  bootstrapSecrets();
} catch (err) {
  if (err instanceof SecretsBootstrapError) {
    console.error(`FATAL: ${err.message}`);
    process.exit(1);
  }
  throw err;
}
