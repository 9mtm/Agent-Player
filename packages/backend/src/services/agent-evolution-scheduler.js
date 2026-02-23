/**
 * Agent Evolution Scheduler
 *
 * Integrates agent evolution system with the scheduler
 * Creates and manages cron jobs for automatic evolution cycles
 */

import { getDatabase } from '../db/index.js';
import { getCronEngine } from '../scheduler/engine.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Initialize evolution scheduler for all agents with enabled evolution
 */
export async function initializeEvolutionScheduler() {
  const db = getDatabase();
  const cronEngine = getCronEngine();

  console.log('[Evolution Scheduler] 🔄 Initializing agent evolution schedules...');

  // Get all agents with evolution enabled
  const configs = db.prepare(`
    SELECT agent_id, evolution_frequency FROM agent_evolution_config
    WHERE enabled = TRUE
  `).all();

  let scheduled = 0;
  for (const config of configs) {
    try {
      await scheduleAgentEvolution(config.agent_id, config.evolution_frequency);
      scheduled++;
    } catch (error) {
      console.error(`[Evolution Scheduler] Failed to schedule agent ${config.agent_id}:`, error.message);
    }
  }

  console.log(`[Evolution Scheduler] ✅ Scheduled evolution for ${scheduled}/${configs.length} agents\n`);
}

/**
 * Schedule evolution for a specific agent
 * @param {string} agentId - Agent ID
 * @param {string} frequency - Evolution frequency ('hourly', 'daily', 'weekly')
 */
export async function scheduleAgentEvolution(agentId, frequency = 'daily') {
  const db = getDatabase();
  const cronEngine = getCronEngine();

  // Get agent name
  const agent = db.prepare('SELECT name FROM agents_config WHERE id = ?').get(agentId);

  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }

  // Convert frequency to cron expression
  const cronExpression = frequencyToCron(frequency);

  // Create unique job name
  const jobName = `agent-evolution-${agentId}`;

  // Check if job already exists
  const existingJob = db.prepare(`
    SELECT id FROM cron_jobs WHERE name = ?
  `).get(jobName);

  if (existingJob) {
    // Update existing job
    db.prepare(`
      UPDATE cron_jobs
      SET cron_expression = ?, updated_at = ?
      WHERE name = ?
    `).run(cronExpression, new Date().toISOString(), jobName);

    // Reschedule
    const job = db.prepare('SELECT * FROM cron_jobs WHERE name = ?').get(jobName);
    cronEngine.unscheduleJob(job.id);
    cronEngine.scheduleJob({
      id: job.id,
      name: job.name,
      description: job.description,
      cronExpression: job.cron_expression,
      actionType: job.action_type,
      actionData: JSON.parse(job.action_data),
      enabled: job.enabled === 1,
      createdAt: new Date(job.created_at),
      updatedAt: new Date(job.updated_at),
    });

    console.log(`[Evolution Scheduler] 🔄 Updated schedule for agent "${agent.name}" (${frequency})`);
  } else {
    // Create new job
    const jobId = uuidv4();

    db.prepare(`
      INSERT INTO cron_jobs (id, name, description, cron_expression, action_type, action_data, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      jobId,
      jobName,
      `Auto-evolve agent: ${agent.name}`,
      cronExpression,
      'api-call',
      JSON.stringify({
        method: 'POST',
        url: `http://localhost:${process.env.PORT || 41522}/api/evolution/${agentId}/evolve`,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
      1, // enabled
      new Date().toISOString(),
      new Date().toISOString()
    );

    // Schedule the job
    cronEngine.scheduleJob({
      id: jobId,
      name: jobName,
      description: `Auto-evolve agent: ${agent.name}`,
      cronExpression,
      actionType: 'api-call',
      actionData: {
        method: 'POST',
        url: `http://localhost:${process.env.PORT || 41522}/api/evolution/${agentId}/evolve`,
        headers: {
          'Content-Type': 'application/json',
        },
      },
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`[Evolution Scheduler] ✅ Scheduled evolution for agent "${agent.name}" (${frequency})`);
  }
}

/**
 * Unschedule evolution for an agent
 * @param {string} agentId - Agent ID
 */
export async function unscheduleAgentEvolution(agentId) {
  const db = getDatabase();
  const cronEngine = getCronEngine();

  const jobName = `agent-evolution-${agentId}`;

  const job = db.prepare('SELECT id FROM cron_jobs WHERE name = ?').get(jobName);

  if (job) {
    // Unschedule
    cronEngine.unscheduleJob(job.id);

    // Delete from database
    db.prepare('DELETE FROM cron_jobs WHERE id = ?').run(job.id);

    console.log(`[Evolution Scheduler] ⏹️  Unscheduled evolution for agent ${agentId}`);
  }
}

/**
 * Update evolution schedule for an agent
 * @param {string} agentId - Agent ID
 * @param {boolean} enabled - Whether evolution is enabled
 * @param {string} frequency - Evolution frequency
 */
export async function updateEvolutionSchedule(agentId, enabled, frequency) {
  if (enabled) {
    await scheduleAgentEvolution(agentId, frequency);
  } else {
    await unscheduleAgentEvolution(agentId);
  }
}

/**
 * Convert frequency string to cron expression
 * @param {string} frequency - 'hourly', 'daily', 'weekly', 'manual'
 * @returns {string} Cron expression
 */
function frequencyToCron(frequency) {
  switch (frequency) {
    case 'hourly':
      return '0 * * * *'; // Every hour at minute 0
    case 'daily':
      return '0 3 * * *'; // Every day at 3 AM (low traffic time)
    case 'weekly':
      return '0 3 * * 0'; // Every Sunday at 3 AM
    case 'manual':
      return '0 0 31 2 *'; // Never runs (Feb 31 doesn't exist) - manual only
    default:
      return '0 3 * * *'; // Default: daily at 3 AM
  }
}

/**
 * Get evolution schedule status for an agent
 * @param {string} agentId - Agent ID
 * @returns {Object|null} Schedule info or null
 */
export function getEvolutionSchedule(agentId) {
  const db = getDatabase();

  const jobName = `agent-evolution-${agentId}`;

  const job = db.prepare(`
    SELECT * FROM cron_jobs WHERE name = ?
  `).get(jobName);

  if (!job) return null;

  return {
    jobId: job.id,
    agentId,
    frequency: cronToFrequency(job.cron_expression),
    cronExpression: job.cron_expression,
    enabled: job.enabled === 1,
    lastRun: job.last_run ? new Date(job.last_run) : null,
    nextRun: job.next_run ? new Date(job.next_run) : null,
    createdAt: new Date(job.created_at),
    updatedAt: new Date(job.updated_at),
  };
}

/**
 * Convert cron expression back to frequency string
 * @param {string} cronExpression - Cron expression
 * @returns {string} Frequency
 */
function cronToFrequency(cronExpression) {
  const cronMap = {
    '0 * * * *': 'hourly',
    '0 3 * * *': 'daily',
    '0 3 * * 0': 'weekly',
    '0 0 31 2 *': 'manual',
  };

  return cronMap[cronExpression] || 'custom';
}
