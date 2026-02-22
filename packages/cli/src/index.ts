#!/usr/bin/env node
/**
 * Agent Player CLI
 *
 * Simple and user-friendly command-line interface
 * 20 essential commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { startCommand } from './commands/start.js';
import { stopCommand } from './commands/stop.js';
import { statusCommand } from './commands/status.js';
import { chatCommand } from './commands/chat.js';
import { skillsCommand } from './commands/skills.js';
import { channelsCommand } from './commands/channels.js';
import { jobsCommand } from './commands/jobs.js';
import { configCommand } from './commands/config.js';
import { doctorCommand } from './commands/doctor.js';
import { onboardCommand } from './commands/onboard.js';

const program = new Command();

program
  .name('agent-player')
  .description('Agent Player - Your personal AI assistant')
  .version('0.1.0');

// Essential Commands
program
  .command('onboard')
  .description('Interactive onboarding wizard (first-time setup)')
  .action(onboardCommand);

program
  .command('start')
  .description('Start the Agent Player backend')
  .option('-d, --daemon', 'Run as daemon in background')
  .action(startCommand);

program
  .command('stop')
  .description('Stop the Agent Player backend')
  .action(stopCommand);

program
  .command('status')
  .description('Show Agent Player status')
  .action(statusCommand);

program
  .command('chat')
  .description('Quick chat with your agent')
  .argument('[message]', 'Message to send')
  .action(chatCommand);

program
  .command('doctor')
  .description('Run system diagnostics')
  .action(doctorCommand);

// Skills Management
const skills = program
  .command('skills')
  .description('Manage skills');

skills
  .command('list')
  .description('List installed skills')
  .action(async () => {
    await skillsCommand('list');
  });

skills
  .command('install <name>')
  .description('Install a skill')
  .action(async (name: string) => {
    await skillsCommand('install', name);
  });

skills
  .command('remove <name>')
  .description('Remove a skill')
  .action(async (name: string) => {
    await skillsCommand('remove', name);
  });

skills
  .command('enable <name>')
  .description('Enable a skill')
  .action(async (name: string) => {
    await skillsCommand('enable', name);
  });

skills
  .command('disable <name>')
  .description('Disable a skill')
  .action(async (name: string) => {
    await skillsCommand('disable', name);
  });

// Channels Management
const channels = program
  .command('channels')
  .description('Manage messaging channels');

channels
  .command('list')
  .description('List all channels')
  .action(async () => {
    await channelsCommand('list');
  });

channels
  .command('connect <id>')
  .description('Connect a channel')
  .action(async (id: string) => {
    await channelsCommand('connect', id);
  });

channels
  .command('disconnect <id>')
  .description('Disconnect a channel')
  .action(async (id: string) => {
    await channelsCommand('disconnect', id);
  });

channels
  .command('status')
  .description('Show channels status')
  .action(async () => {
    await channelsCommand('status');
  });

// Jobs Management
const jobs = program
  .command('jobs')
  .description('Manage scheduled jobs');

jobs
  .command('list')
  .description('List all jobs')
  .action(async () => {
    await jobsCommand('list');
  });

jobs
  .command('create')
  .description('Create a new job')
  .action(async () => {
    await jobsCommand('create');
  });

jobs
  .command('run <id>')
  .description('Run a job now')
  .action(async (id: string) => {
    await jobsCommand('run', id);
  });

jobs
  .command('delete <id>')
  .description('Delete a job')
  .action(async (id: string) => {
    await jobsCommand('delete', id);
  });

// Configuration
const config = program
  .command('config')
  .description('Manage configuration');

config
  .command('show')
  .description('Show current config')
  .action(async () => {
    await configCommand('show');
  });

config
  .command('set <key> <value>')
  .description('Set config value')
  .action(async (key: string, value: string) => {
    await configCommand('set', key, value);
  });

config
  .command('reset')
  .description('Reset to defaults')
  .action(async () => {
    await configCommand('reset');
  });

// Error handling
program.exitOverride();

try {
  program.parse();
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
