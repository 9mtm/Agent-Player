/**
 * Workflow Scheduler - Cron-based scheduling
 *
 * NO Vercel Workflow SDK!
 */

import { CronJob } from 'cron';
import { Workflow } from './types';
import { WorkflowExecutor } from './executor';

interface ScheduledWorkflow {
  workflow: Workflow;
  job: CronJob;
}

export class WorkflowScheduler {
  private scheduledWorkflows: Map<string, ScheduledWorkflow> = new Map();

  /**
   * Schedule a workflow to run on a cron schedule
   */
  scheduleWorkflow(workflow: Workflow, cronExpression: string): void {
    // Remove existing schedule if any
    this.unscheduleWorkflow(workflow.id);

    const job = new CronJob(
      cronExpression,
      async () => {
        console.log(`Running scheduled workflow: ${workflow.name}`);

        try {
          const executor = new WorkflowExecutor(workflow);
          const result = await executor.execute();

          console.log(`Workflow ${workflow.name} completed:`, result);

          // TODO: Save execution log to database
        } catch (error) {
          console.error(`Workflow ${workflow.name} failed:`, error);
        }
      },
      null, // onComplete
      true, // start immediately
      'UTC' // timezone
    );

    this.scheduledWorkflows.set(workflow.id, {
      workflow,
      job,
    });

    console.log(`Scheduled workflow ${workflow.name} with cron: ${cronExpression}`);
  }

  /**
   * Unschedule a workflow
   */
  unscheduleWorkflow(workflowId: string): void {
    const scheduled = this.scheduledWorkflows.get(workflowId);

    if (scheduled) {
      scheduled.job.stop();
      this.scheduledWorkflows.delete(workflowId);
      console.log(`Unscheduled workflow ${workflowId}`);
    }
  }

  /**
   * Get all scheduled workflows
   */
  getScheduledWorkflows(): Workflow[] {
    return Array.from(this.scheduledWorkflows.values()).map(s => s.workflow);
  }

  /**
   * Check if workflow is scheduled
   */
  isScheduled(workflowId: string): boolean {
    return this.scheduledWorkflows.has(workflowId);
  }

  /**
   * Reschedule workflow with new cron expression
   */
  rescheduleWorkflow(workflow: Workflow, cronExpression: string): void {
    this.unscheduleWorkflow(workflow.id);
    this.scheduleWorkflow(workflow, cronExpression);
  }

  /**
   * Stop all scheduled workflows
   */
  stopAll(): void {
    for (const [workflowId] of this.scheduledWorkflows) {
      this.unscheduleWorkflow(workflowId);
    }
  }
}

// Singleton instance
export const workflowScheduler = new WorkflowScheduler();
