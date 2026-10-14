/**
 * Onboarding API Routes
 *
 * SECURITY (S0-Q.14): these routes only drive the interactive *terminal*
 * wizard inside the server process (prompts on the server's stdin/stdout).
 * They are NOT registered in api/server.ts any more; the web first-run flow is
 * /setup (F-01). If they are ever registered again, every route still needs an
 * active owner (bearer token).
 */

import { FastifyInstance } from 'fastify';
import { OnboardingWizard } from '../../onboarding/index.js';
import type { OnboardingState } from '../../onboarding/index.js';
import { requireActiveRole } from '../../auth/route-guards.js';
import { sendInternalError } from '../error-handler.js';
import { safeErrorFields } from '../../services/safe-error-log.js';

export async function onboardingRoutes(fastify: FastifyInstance) {
  let wizard: OnboardingWizard | null = null;
  let currentState: OnboardingState | null = null;

  // Encapsulated to this plugin: owner only for every onboarding route.
  fastify.addHook('preHandler', requireActiveRole(['owner']));

  // Start onboarding wizard
  fastify.post('/api/onboarding/start', async (request, reply) => {
    try {
      wizard = new OnboardingWizard();

      // Run wizard in background (it's interactive via CLI)
      wizard.start().then(() => {
        fastify.log.info('Onboarding wizard completed');
      }).catch((err) => {
        console.error('[Onboarding] wizard failed', safeErrorFields(err));
      });

      return {
        success: true,
        message: 'Onboarding wizard started. Please follow the prompts in your terminal.'
      };
    } catch (err: any) {
      return sendInternalError(reply, '[Onboarding] POST /api/onboarding/start', err);
    }
  });

  // Get onboarding status
  fastify.get('/api/onboarding/status', async (request, reply) => {
    if (!wizard) {
      return {
        completed: false,
        currentStep: 0,
        totalSteps: 6
      };
    }

    return {
      completed: false,
      currentStep: 0,
      totalSteps: 6,
      message: 'Wizard is running in terminal'
    };
  });

  // Resume onboarding
  fastify.post('/api/onboarding/resume', async (request, reply) => {
    try {
      if (!wizard) {
        wizard = new OnboardingWizard();
      }

      wizard.resume().then(() => {
        fastify.log.info('Onboarding wizard resumed');
      }).catch((err) => {
        console.error('[Onboarding] resume failed', safeErrorFields(err));
      });

      return {
        success: true,
        message: 'Resuming onboarding wizard...'
      };
    } catch (err: any) {
      return sendInternalError(reply, '[Onboarding] POST /api/onboarding/resume', err);
    }
  });

  // Skip onboarding (mark as completed)
  fastify.post('/api/onboarding/skip', async (request, reply) => {
    try {
      // Simply mark that onboarding was skipped
      wizard = null;
      currentState = null;

      return {
        success: true,
        message: 'Onboarding skipped'
      };
    } catch (err: any) {
      return sendInternalError(reply, '[Onboarding] POST /api/onboarding/skip', err);
    }
  });
}
