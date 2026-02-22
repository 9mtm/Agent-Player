/**
 * Skills Command
 *
 * Manage skills
 */

import ora from 'ora';
import chalk from 'chalk';
import { getApiClient } from '../utils/api-client.js';
import { success, error, header, createTable, formatDate } from '../utils/formatting.js';

type SkillAction = 'list' | 'install' | 'remove' | 'enable' | 'disable';

export async function skillsCommand(
  action: SkillAction,
  skillName?: string
): Promise<void> {
  const client = getApiClient();

  // Check if backend is running
  const isRunning = await client.isBackendRunning();
  if (!isRunning) {
    error('Backend is not running');
    console.log(chalk.gray('Run "agent-player start" first\n'));
    return;
  }

  switch (action) {
    case 'list':
      await listSkills(client);
      break;

    case 'install':
      if (!skillName) {
        error('Please provide skill name');
        return;
      }
      await installSkill(client, skillName);
      break;

    case 'remove':
      if (!skillName) {
        error('Please provide skill name');
        return;
      }
      await removeSkill(client, skillName);
      break;

    case 'enable':
      if (!skillName) {
        error('Please provide skill name');
        return;
      }
      await enableSkill(client, skillName);
      break;

    case 'disable':
      if (!skillName) {
        error('Please provide skill name');
        return;
      }
      await disableSkill(client, skillName);
      break;
  }
}

async function listSkills(client: any): Promise<void> {
  const spinner = ora('Loading skills...').start();

  try {
    const skills = await client.getSkills();
    spinner.succeed(`Found ${skills.length} skills`);

    if (skills.length === 0) {
      console.log(chalk.gray('\nNo skills installed\n'));
      return;
    }

    header('Installed Skills');

    const table = createTable(['Name', 'Version', 'Status', 'Updated']);

    skills.forEach((skill: any) => {
      table.push([
        skill.name,
        skill.version || '1.0.0',
        skill.enabled ? chalk.green('✓ Enabled') : chalk.gray('○ Disabled'),
        formatDate(skill.updatedAt || skill.createdAt)
      ]);
    });

    console.log(table.toString());
    console.log();

  } catch (err: any) {
    spinner.fail('Failed to load skills');
    error(err.message);
  }
}

async function installSkill(client: any, name: string): Promise<void> {
  const spinner = ora(`Installing ${name}...`).start();

  try {
    await client.installSkill(name);
    spinner.succeed(`Installed ${name}`);
  } catch (err: any) {
    spinner.fail(`Failed to install ${name}`);
    error(err.message);
  }
}

async function removeSkill(client: any, name: string): Promise<void> {
  const spinner = ora(`Removing ${name}...`).start();

  try {
    const skills = await client.getSkills();
    const skill = skills.find((s: any) => s.name === name);

    if (!skill) {
      spinner.fail(`Skill ${name} not found`);
      return;
    }

    await client.removeSkill(skill.id);
    spinner.succeed(`Removed ${name}`);
  } catch (err: any) {
    spinner.fail(`Failed to remove ${name}`);
    error(err.message);
  }
}

async function enableSkill(client: any, name: string): Promise<void> {
  const spinner = ora(`Enabling ${name}...`).start();

  try {
    const skills = await client.getSkills();
    const skill = skills.find((s: any) => s.name === name);

    if (!skill) {
      spinner.fail(`Skill ${name} not found`);
      return;
    }

    await client.updateSkill(skill.id, { enabled: true });
    spinner.succeed(`Enabled ${name}`);
  } catch (err: any) {
    spinner.fail(`Failed to enable ${name}`);
    error(err.message);
  }
}

async function disableSkill(client: any, name: string): Promise<void> {
  const spinner = ora(`Disabling ${name}...`).start();

  try {
    const skills = await client.getSkills();
    const skill = skills.find((s: any) => s.name === name);

    if (!skill) {
      spinner.fail(`Skill ${name} not found`);
      return;
    }

    await client.updateSkill(skill.id, { enabled: false });
    spinner.succeed(`Disabled ${name}`);
  } catch (err: any) {
    spinner.fail(`Failed to disable ${name}`);
    error(err.message);
  }
}
