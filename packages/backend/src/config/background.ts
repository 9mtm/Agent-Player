/**
 * Background switch (RUN-ISO F2).
 *
 * `AGENT_PLAYER_BACKGROUND=off` disables every scheduler, timer, watcher and
 * startup probe that the server starts on its own (cron engine, evolution,
 * agent cron, task-run recovery, memory jobs and consolidation, scheduled
 * notifications, calendar sync, extension stats, heartbeat checks, audit
 * flush timer, gateway session cleanup, login pruning, skills watcher, camera
 * room cleanup, instance identity publish, Docker and Python probes, desktop
 * cleanup, extensions). The API still serves requests.
 *
 * Any other value (or unset) keeps today's behaviour.
 */

export const BACKGROUND_ENV = 'AGENT_PLAYER_BACKGROUND';

export function backgroundEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env[BACKGROUND_ENV] ?? '').trim().toLowerCase() !== 'off';
}
