/**
 * Cron Engine
 * Manages scheduled jobs using node-cron
 */

import cron from 'node-cron';
import { EventEmitter } from 'events';
import type {
  CronJob,
  ICronEngine,
  JobExecutionResult,
  ExecuteSkillAction,
  SendMessageAction,
  ApiCallAction,
  RunWorkflowAction,
} from './types.js';
import { getJobQueue } from './queue.js';

export class CronEngine extends EventEmitter implements ICronEngine {
  private jobs: Map<string, CronJob> = new Map();
  private tasks: Map<string, any> = new Map();
  private queue = getJobQueue();
  private isRunning = false;

  /**
   * Start cron engine
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[CronEngine] ⚠️  Already running');
      return;
    }

    console.log('[CronEngine] 🚀 Starting cron engine...');

    // Load jobs from database
    await this.loadJobs();

    // Schedule all enabled jobs
    for (const job of this.jobs.values()) {
      if (job.enabled) {
        this.scheduleJob(job);
      }
    }

    this.isRunning = true;
    console.log(`[CronEngine] ✅ Started with ${this.jobs.size} jobs`);
  }

  /**
   * Stop cron engine
   */
  async stop(): Promise<void> {
    console.log('[CronEngine] 🛑 Stopping cron engine...');

    // Stop all scheduled tasks
    for (const task of this.tasks.values()) {
      task.stop();
    }

    this.tasks.clear();
    this.isRunning = false;

    console.log('[CronEngine] ✅ Stopped');
  }

  /**
   * Schedule a job
   */
  scheduleJob(job: CronJob): void {
    if (!cron.validate(job.cronExpression)) {
      throw new Error(`Invalid cron expression: ${job.cronExpression}`);
    }

    // If already scheduled, unschedule first
    if (this.tasks.has(job.id)) {
      this.unscheduleJob(job.id);
    }

    // Create scheduled task
    const task = cron.schedule(
      job.cronExpression,
      async () => {
        console.log(`[CronEngine] ⏰ Executing job: ${job.name}`);

        try {
          const result = await this.executeJob(job.id);

          if (result.success) {
            console.log(`[CronEngine] ✅ Job "${job.name}" completed`);
          } else {
            console.error(`[CronEngine] ❌ Job "${job.name}" failed:`, result.error);
          }

          this.emit('job:executed', result);
        } catch (error: any) {
          console.error(`[CronEngine] ❌ Job "${job.name}" error:`, error);
          this.emit('job:error', { jobId: job.id, error: error.message });
        }

        // Update last run time
        job.lastRun = new Date();
        await this.updateJob(job);
      }
    );

    this.jobs.set(job.id, job);
    this.tasks.set(job.id, task);

    console.log(`[CronEngine] 📅 Scheduled job: ${job.name} (${job.cronExpression})`);
  }

  /**
   * Unschedule a job
   */
  unscheduleJob(jobId: string): void {
    const task = this.tasks.get(jobId);

    if (task) {
      task.stop();
      this.tasks.delete(jobId);
      console.log(`[CronEngine] ⏹️  Unscheduled job: ${jobId}`);
    }
  }

  /**
   * Get all scheduled jobs
   */
  getJobs(): CronJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): CronJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Execute job immediately (manual trigger)
   */
  async executeJob(jobId: string): Promise<JobExecutionResult> {
    const job = this.jobs.get(jobId);

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const startTime = Date.now();

    try {
      let output: any;

      switch (job.actionType) {
        case 'execute-skill':
          output = await this.executeSkill(job.actionData as ExecuteSkillAction);
          break;

        case 'send-message':
          output = await this.sendMessage(job.actionData as SendMessageAction);
          break;

        case 'api-call':
          output = await this.executeApiCall(job.actionData as ApiCallAction);
          break;

        case 'run-workflow':
          output = await this.executeWorkflow(job.actionData as RunWorkflowAction);
          break;

        case 'custom':
          output = await this.executeCustom(job.actionData as any);
          break;

        default:
          throw new Error(`Unknown action type: ${job.actionType}`);
      }

      const duration = Date.now() - startTime;

      // Save execution history
      await this.saveExecutionHistory({
        jobId: job.id,
        success: true,
        output: JSON.stringify(output),
        executedAt: new Date(),
        duration,
      });

      return {
        jobId: job.id,
        success: true,
        output,
        executedAt: new Date(),
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Save execution history
      await this.saveExecutionHistory({
        jobId: job.id,
        success: false,
        error: error.message,
        executedAt: new Date(),
        duration,
      });

      return {
        jobId: job.id,
        success: false,
        error: error.message,
        executedAt: new Date(),
        duration,
      };
    }
  }

  /**
   * Execute skill
   */
  private async executeSkill(action: ExecuteSkillAction): Promise<any> {
    const { getSkillsExecutor } = await import('../skills/executor.js');
    const executor = getSkillsExecutor();

    const result = await executor.execute(action.skillId, {
      message: action.context.message,
      settings: action.context.settings || {},
      userId: 'cron',
      channelId: 'cron',
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    return result.output;
  }

  /**
   * Send message
   */
  private async sendMessage(action: SendMessageAction): Promise<any> {
    const { getChannelRegistry } = await import('../channels/registry.js');
    const registry = getChannelRegistry();

    await registry.sendMessage(action.channelId, {
      channelId: action.channelId,
      to: action.to,
      content: action.content,
      options: action.options,
    });

    return { sent: true };
  }

  /**
   * Execute API call
   */
  private async executeApiCall(action: ApiCallAction): Promise<any> {
    const response = await fetch(action.url, {
      method: action.method,
      headers: action.headers || {},
      body: action.body ? JSON.stringify(action.body) : undefined,
    });

    return await response.json();
  }

  /**
   * Execute workflow
   */
  private async executeWorkflow(action: RunWorkflowAction): Promise<any> {
    // TODO: Integrate with workflow engine when implemented
    throw new Error('Workflow execution not yet implemented');
  }

  /**
   * Execute custom function
   */
  private async executeCustom(action: any): Promise<any> {
    // TODO: Implement custom function execution
    throw new Error('Custom function execution not yet implemented');
  }

  /**
   * Load jobs from database
   */
  private async loadJobs(): Promise<void> {
    const { getDatabase } = await import('../db/index.js');
    const db = getDatabase();

    const rows = db
      .prepare(
        `
      SELECT * FROM cron_jobs
      WHERE enabled = 1
    `
      )
      .all() as any[];

    for (const row of rows) {
      const job: CronJob = {
        id: row.id,
        name: row.name,
        description: row.description,
        cronExpression: row.cron_expression,
        actionType: row.action_type,
        actionData: JSON.parse(row.action_data),
        enabled: Boolean(row.enabled),
        lastRun: row.last_run ? new Date(row.last_run) : undefined,
        nextRun: row.next_run ? new Date(row.next_run) : undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      };

      this.jobs.set(job.id, job);
    }
  }

  /**
   * Update job in database
   */
  private async updateJob(job: CronJob): Promise<void> {
    const { getDatabase } = await import('../db/index.js');
    const db = getDatabase();

    db.getDb().prepare(
      `
      UPDATE cron_jobs
      SET last_run = ?, next_run = ?, updated_at = ?
      WHERE id = ?
    `
    ).run(
      job.lastRun?.toISOString() || null,
      job.nextRun?.toISOString() || null,
      new Date().toISOString(),
      job.id
    );
  }

  /**
   * Save execution history
   */
  private async saveExecutionHistory(history: any): Promise<void> {
    const { getDatabase } = await import('../db/index.js');
    const db = getDatabase();

    db.getDb().prepare(
      `
      INSERT INTO job_executions (job_id, success, output, error, executed_at, duration)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    ).run(
      history.jobId,
      history.success ? 1 : 0,
      history.output || null,
      history.error || null,
      history.executedAt.toISOString(),
      history.duration
    );
  }
}

// Singleton instance
let engineInstance: CronEngine | null = null;

export function getCronEngine(): CronEngine {
  if (!engineInstance) {
    engineInstance = new CronEngine();
  }
  return engineInstance;
}
