/**
 * Jobs Command
 */

import ora from 'ora';
import * as prompts from '@clack/prompts';
import { getApiClient } from '../utils/api-client.js';
import { success, error, header, createTable, formatDate } from '../utils/formatting.js';

type JobAction = 'list' | 'create' | 'run' | 'delete';

export async function jobsCommand(action: JobAction, jobId?: string): Promise<void> {
  const client = getApiClient();

  const isRunning = await client.isBackendRunning();
  if (!isRunning) {
    error('Backend is not running');
    return;
  }

  switch (action) {
    case 'list':
      await listJobs(client);
      break;

    case 'create':
      await createJob(client);
      break;

    case 'run':
      if (!jobId) {
        error('Please provide job ID');
        return;
      }
      await runJob(client, jobId);
      break;

    case 'delete':
      if (!jobId) {
        error('Please provide job ID');
        return;
      }
      await deleteJob(client, jobId);
      break;
  }
}

async function listJobs(client: any): Promise<void> {
  const spinner = ora('Loading jobs...').start();

  try {
    const jobs = await client.getJobs();
    spinner.succeed(`Found ${jobs.length} jobs`);

    if (jobs.length === 0) {
      console.log('\nNo jobs scheduled\n');
      return;
    }

    header('Scheduled Jobs');

    const table = createTable(['Name', 'Schedule', 'Status', 'Last Run']);

    jobs.forEach((job: any) => {
      table.push([
        job.name,
        job.cronExpression || 'N/A',
        job.enabled ? '✓ Active' : '○ Inactive',
        job.lastExecutedAt ? formatDate(job.lastExecutedAt) : 'Never'
      ]);
    });

    console.log(table.toString());
    console.log();

  } catch (err: any) {
    spinner.fail('Failed to load jobs');
    error(err.message);
  }
}

async function createJob(client: any): Promise<void> {
  const name = await prompts.text({
    message: 'Job name:',
    placeholder: 'Daily backup'
  });

  if (prompts.isCancel(name)) return;

  const schedule = await prompts.text({
    message: 'Cron schedule:',
    placeholder: '0 9 * * *'
  });

  if (prompts.isCancel(schedule)) return;

  const spinner = ora('Creating job...').start();

  try {
    await client.createJob({
      name,
      cronExpression: schedule,
      enabled: true,
      action: { type: 'custom', command: '' }
    });

    spinner.succeed('Job created');
  } catch (err: any) {
    spinner.fail('Failed to create job');
    error(err.message);
  }
}

async function runJob(client: any, id: string): Promise<void> {
  const spinner = ora('Running job...').start();

  try {
    await client.runJob(id);
    spinner.succeed('Job executed');
  } catch (err: any) {
    spinner.fail('Failed to run job');
    error(err.message);
  }
}

async function deleteJob(client: any, id: string): Promise<void> {
  const spinner = ora('Deleting job...').start();

  try {
    await client.deleteJob(id);
    spinner.succeed('Job deleted');
  } catch (err: any) {
    spinner.fail('Failed to delete job');
    error(err.message);
  }
}
