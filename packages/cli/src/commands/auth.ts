/**
 * Login / Logout Commands
 *
 * `agent-player login` asks for email and password (hidden), signs in at the
 * backend and saves the session token in a private file (0600). The token is
 * never printed. `agent-player logout` ends the session at the backend and
 * removes that file.
 */

import chalk from 'chalk';
import { ApiClient } from '../utils/api-client.js';
import { clearSession, getBackendUrl, readSession, saveSession } from '../utils/auth-store.js';
import { ask, askHidden } from '../utils/prompt.js';

export interface LoginDeps {
  ask?: (q: string) => Promise<string>;
  askHidden?: (q: string) => Promise<string>;
  log?: (msg: string) => void;
}

export async function loginCommand(
  options: { email?: string; url?: string } = {},
  deps: LoginDeps = {}
): Promise<boolean> {
  const log = deps.log ?? ((m: string) => console.log(m));
  const backendUrl = (options.url || getBackendUrl()).replace(/\/+$/, '');
  const client = new ApiClient(backendUrl);

  const email = (options.email || (await (deps.ask ?? ask)('Email: '))).trim();
  if (!email) {
    log(chalk.red('Email is required'));
    return false;
  }
  const password = await (deps.askHidden ?? askHidden)('Password: ');
  if (!password) {
    log(chalk.red('Password is required'));
    return false;
  }

  try {
    const { token, user } = await client.login(email, password);
    const file = saveSession(token, backendUrl, email);
    const who = user?.username || user?.email || email;
    log(chalk.green(`Signed in as ${who} at ${backendUrl}`));
    log(chalk.gray(`Session saved to ${file}`));
    return true;
  } catch (err: any) {
    log(chalk.red(err?.message || 'Login failed'));
    return false;
  }
}

export async function logoutCommand(deps: { log?: (msg: string) => void } = {}): Promise<boolean> {
  const log = deps.log ?? ((m: string) => console.log(m));
  const session = readSession();
  if (!session) {
    log(chalk.gray('Not signed in'));
    return true;
  }

  let endedOnServer = true;
  try {
    await new ApiClient(session.backendUrl).logout();
  } catch (err: any) {
    // 401: the session had already ended. Otherwise the backend is unreachable;
    // the local token is still removed.
    endedOnServer = err?.status === 401;
    if (!endedOnServer) log(chalk.yellow(`Could not end the session at the backend: ${err?.message}`));
  }

  clearSession();
  log(chalk.green(endedOnServer ? 'Signed out' : 'Local session removed'));
  return true;
}
