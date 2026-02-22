/**
 * Job Queue
 * Manages queued jobs with priority
 */

import { EventEmitter } from 'events';
import type { IJobQueue, QueuedJob } from './types.js';
import { getCronEngine } from './engine.js';

export class JobQueue extends EventEmitter implements IJobQueue {
  private queue: QueuedJob[] = [];
  private isProcessing = false;
  private maxConcurrent = 1; // Process one job at a time by default

  /**
   * Add job to queue
   */
  enqueue(job: QueuedJob): void {
    // Insert based on priority (higher priority first)
    const priority = job.priority || 0;
    let insertIndex = this.queue.length;

    for (let i = 0; i < this.queue.length; i++) {
      const queuedPriority = this.queue[i].priority || 0;
      if (priority > queuedPriority) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, job);

    console.log(`[JobQueue] ➕ Added job to queue: ${job.jobId} (priority: ${priority})`);
    this.emit('job:enqueued', job);

    // Start processing if not already
    if (!this.isProcessing) {
      this.processNext();
    }
  }

  /**
   * Process next job in queue
   */
  async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    const job = this.queue.shift();

    if (!job) {
      this.isProcessing = false;
      return;
    }

    console.log(`[JobQueue] 🔄 Processing job: ${job.jobId}`);
    this.emit('job:processing', job);

    try {
      const engine = getCronEngine();
      const result = await engine.executeJob(job.jobId);

      console.log(
        `[JobQueue] ${result.success ? '✅' : '❌'} Job ${job.jobId} ${
          result.success ? 'completed' : 'failed'
        }`
      );

      this.emit('job:completed', { job, result });
    } catch (error: any) {
      console.error(`[JobQueue] ❌ Job ${job.jobId} error:`, error);
      this.emit('job:error', { job, error: error.message });
    } finally {
      this.isProcessing = false;

      // Process next if queue not empty
      if (this.queue.length > 0) {
        setImmediate(() => this.processNext());
      }
    }
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Clear queue
   */
  clear(): void {
    const count = this.queue.length;
    this.queue = [];
    console.log(`[JobQueue] 🗑️  Cleared ${count} jobs from queue`);
    this.emit('queue:cleared', count);
  }

  /**
   * Get all queued jobs
   */
  getAll(): QueuedJob[] {
    return [...this.queue];
  }

  /**
   * Remove job from queue
   */
  remove(jobId: string): boolean {
    const index = this.queue.findIndex((j) => j.jobId === jobId);

    if (index !== -1) {
      this.queue.splice(index, 1);
      console.log(`[JobQueue] ➖ Removed job from queue: ${jobId}`);
      this.emit('job:removed', jobId);
      return true;
    }

    return false;
  }

  /**
   * Set max concurrent jobs
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = Math.max(1, max);
    console.log(`[JobQueue] ⚙️  Max concurrent jobs set to ${this.maxConcurrent}`);
  }
}

// Singleton instance
let queueInstance: JobQueue | null = null;

export function getJobQueue(): JobQueue {
  if (!queueInstance) {
    queueInstance = new JobQueue();
  }
  return queueInstance;
}
