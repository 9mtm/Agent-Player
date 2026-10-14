#!/usr/bin/env node
/**
 * Agent Player CLI
 *
 * Simple and user-friendly command-line interface
 * 20 essential commands
 */

import { Command } from 'commander';
import chalk from 'chalk';

// Commands are loaded on demand, so a command whose optional packages are
// missing (e.g. table output) does not break start/stop/status/doctor.
const load_startCommand = async () => (await import('./commands/start.js')).startCommand;
const load_stopCommand = async () => (await import('./commands/stop.js')).stopCommand;
const load_statusCommand = async () => (await import('./commands/status.js')).statusCommand;
const load_chatCommand = async () => (await import('./commands/chat.js')).chatCommand;
const load_skillsCommand = async () => (await import('./commands/skills.js')).skillsCommand;
const load_channelsCommand = async () => (await import('./commands/channels.js')).channelsCommand;
const load_jobsCommand = async () => (await import('./commands/jobs.js')).jobsCommand;
const load_configCommand = async () => (await import('./commands/config.js')).configCommand;
const load_doctorCommand = async () => (await import('./commands/doctor.js')).doctorCommand;
const load_onboardCommand = async () => (await import('./commands/onboard.js')).onboardCommand;
const load_loginCommand = async () => (await import('./commands/auth.js')).loginCommand;
const load_logoutCommand = async () => (await import('./commands/auth.js')).logoutCommand;
const load_setupCommand = async () => (await import('./commands/setup.js')).setupCommand;
const load_servicePrintCommand = async () => (await import('./commands/service.js')).servicePrintCommand;

const program = new Command();

program
  .name('agent-player')
  .description('Agent Player - Your personal AI assistant')
  .version('0.1.0');

// Essential Commands
program
  .command('onboard')
  .description('First-time setup (opens the web onboarding wizard)')
  .action(async () => (await load_onboardCommand())());

program
  .command('login')
  .description('Sign in to the backend (email + password); the session is saved privately')
  .option('-e, --email <email>', 'Account email')
  .option('-u, --url <url>', 'Backend URL (default http://127.0.0.1:41522)')
  .action(async (options: { email?: string; url?: string }) => {
    const ok = await (await load_loginCommand())(options);
    if (!ok) process.exitCode = 1;
  });

program
  .command('logout')
  .description('Sign out and remove the saved session')
  .action(async () => {
    await (await load_logoutCommand())();
  });

program
  .command('setup')
  .description('Prepare this install: data folders (0700), generated secrets (0600), record the install folder')
  .action(async () => {
    process.exitCode = (await load_setupCommand())();
  });

program
  .command('start')
  .description('Start the backend and web UI together on 127.0.0.1 (works from any folder)')
  .option('-d, --daemon', 'Run in the background (log in .data/logs/agent-player.log)')
  .option('--dev', 'Run from source (no build needed; no file watcher)')
  .action(async (options: { daemon?: boolean; dev?: boolean }) => {
    process.exitCode = await (await load_startCommand())(options);
  });

program
  .command('stop')
  .description('Stop the backend and web UI started by "agent-player start"')
  .option('--force', 'Send SIGKILL instead of SIGTERM')
  .action(async (options: { force?: boolean }) => {
    process.exitCode = await (await load_stopCommand())(options);
  });

program
  .command('status')
  .description('Show whether the backend and web UI are running and answering')
  .option('--json', 'Machine-readable output')
  .action(async (options: { json?: boolean }) => {
    process.exitCode = await (await load_statusCommand())(options);
  });

const service = program
  .command('service')
  .description('Background service (launchd / systemd user unit)');

service
  .command('print')
  .description('Print a launchd plist (macOS) or systemd user unit (Linux); installs nothing')
  .option('--platform <name>', 'macos or linux (default: this system)')
  .action(async (options: { platform?: string }) => {
    process.exitCode = (await load_servicePrintCommand())(options);
  });

program
  .command('chat')
  .description('Quick chat with your agent')
  .argument('[message]', 'Message to send')
  .action(async (message?: string) => (await load_chatCommand())(message));

program
  .command('doctor')
  .description('Run system diagnostics')
  .action(async () => (await load_doctorCommand())());

// Skills Management
const skills = program
  .command('skills')
  .description('Manage skills');

skills
  .command('list')
  .description('List installed skills')
  .action(async () => {
    await (await load_skillsCommand())('list');
  });

skills
  .command('install <name>')
  .description('Install a skill')
  .action(async (name: string) => {
    await (await load_skillsCommand())('install', name);
  });

skills
  .command('remove <name>')
  .description('Remove a skill')
  .action(async (name: string) => {
    await (await load_skillsCommand())('remove', name);
  });

skills
  .command('enable <name>')
  .description('Enable a skill')
  .action(async (name: string) => {
    await (await load_skillsCommand())('enable', name);
  });

skills
  .command('disable <name>')
  .description('Disable a skill')
  .action(async (name: string) => {
    await (await load_skillsCommand())('disable', name);
  });

// Channels Management
const channels = program
  .command('channels')
  .description('Manage messaging channels');

channels
  .command('list')
  .description('List all channels')
  .action(async () => {
    await (await load_channelsCommand())('list');
  });

channels
  .command('connect <id>')
  .description('Connect a channel')
  .action(async (id: string) => {
    await (await load_channelsCommand())('connect', id);
  });

channels
  .command('disconnect <id>')
  .description('Disconnect a channel')
  .action(async (id: string) => {
    await (await load_channelsCommand())('disconnect', id);
  });

channels
  .command('status')
  .description('Show channels status')
  .action(async () => {
    await (await load_channelsCommand())('status');
  });

// Jobs Management
const jobs = program
  .command('jobs')
  .description('Manage scheduled jobs');

jobs
  .command('list')
  .description('List all jobs')
  .action(async () => {
    await (await load_jobsCommand())('list');
  });

jobs
  .command('create')
  .description('Create a new job')
  .action(async () => {
    await (await load_jobsCommand())('create');
  });

jobs
  .command('run <id>')
  .description('Run a job now')
  .action(async (id: string) => {
    await (await load_jobsCommand())('run', id);
  });

jobs
  .command('delete <id>')
  .description('Delete a job')
  .action(async (id: string) => {
    await (await load_jobsCommand())('delete', id);
  });

// Configuration
const config = program
  .command('config')
  .description('Manage configuration');

config
  .command('show')
  .description('Show current config')
  .action(async () => {
    await (await load_configCommand())('show');
  });

config
  .command('set <key> <value>')
  .description('Set config value')
  .action(async (key: string, value: string) => {
    await (await load_configCommand())('set', key, value);
  });

config
  .command('reset')
  .description('Reset to defaults')
  .action(async () => {
    await (await load_configCommand())('reset');
  });

// Error handling
program.exitOverride();

try {
  await program.parseAsync();
} catch (err: any) {
  if (err.code === 'commander.helpDisplayed') {
    process.exit(0);
  } else if (err.code === 'commander.unknownCommand') {
    console.error(chalk.red(`\n❌ Unknown command: ${err.message}\n`));
    console.log(chalk.gray('Run "agent-player --help" for available commands\n'));
    process.exit(1);
  } else {
    console.error(chalk.red(`\n❌ Error: ${err.message}\n`));
    process.exit(1);
  }
}
