/**
 * Onboarding API Routes
 */

import { FastifyInstance } from 'fastify';
import { OnboardingWizard } from '../../onboarding/index.js';
import type { OnboardingState } from '../../onboarding/index.js';

export async function onboardingRoutes(fastify: FastifyInstance) {
  let wizard: OnboardingWizard | null = null;
  let currentState: OnboardingState | null = null;

  // Start onboarding wizard
  fastify.post('/api/onboarding/start', async (request, reply) => {
    try {
      wizard = new OnboardingWizard();

      // Run wizard in background (it's interactive via CLI)
      wizard.start().then(() => {
        fastify.log.info('Onboarding wizard completed');
      }).catch((err) => {
        fastify.log.error('Onboarding wizard error:', err);
      });

      return {
        success: true,
        message: 'Onboarding wizard started. Please follow the prompts in your terminal.'
      };
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: err.message
      });
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
        fastify.log.error('Resume onboarding error:', err);
      });

      return {
        success: true,
        message: 'Resuming onboarding wizard...'
      };
    } catch (err: any) {
      return reply.code(500).send({
        success: false,
        error: err.message
      });
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
      return reply.code(500).send({
        success: false,
        error: err.message
      });
    }
  });
}
