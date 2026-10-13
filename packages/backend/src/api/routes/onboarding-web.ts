/**
 * Web onboarding wizard API (F-05, decision D-ONBOARDING).
 *
 * `/onboarding` is the wizard shown after the first owner login. Every route
 * needs an active owner (bearer token); the user always comes from the token.
 * This is NOT the terminal wizard in `./onboarding.ts`, which stays
 * unregistered (S0-Q.14).
 *
 *   GET  /api/onboarding           -> { state }
 *   POST /api/onboarding           -> save one step: { step?, data?, currentStep? }
 *   POST /api/onboarding/complete  -> { skipped?: boolean } ("Skip" also completes)
 *   POST /api/onboarding/reset     -> start over (settings already applied stay)
 *
 * Responses never carry a secret: a provider API key is stored encrypted by the
 * settings manager and only shown masked. Channels are saved, never started;
 * skills are saved, never installed.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { authorizeActiveRole } from '../../auth/route-guards.js';
import { handleError } from '../error-handler.js';
import {
  WizardInputError,
  completeWizard,
  getWizardState,
  resetWizard,
  saveWizardStep,
  validateCurrentStep,
  validateStep,
  type ValidatedStep,
} from '../../onboarding/web-wizard.js';

const OWNER_ONLY = ['owner'] as const;

function owner(request: FastifyRequest, reply: FastifyReply): string | null {
  return authorizeActiveRole(request, reply, OWNER_ONLY);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

export async function onboardingWebRoutes(fastify: FastifyInstance) {
  fastify.get('/api/onboarding', async (request, reply) => {
    const userId = owner(request, reply);
    if (userId === null) return reply;
    try {
      return { success: true, state: getWizardState(userId) };
    } catch (error) {
      return handleError(reply, error, 'internal', '[Onboarding]');
    }
  });

  fastify.post('/api/onboarding', async (request, reply) => {
    const userId = owner(request, reply);
    if (userId === null) return reply;

    const body = request.body ?? {};
    if (!isPlainObject(body)) return reply.code(400).send({ success: false, error: 'Invalid body' });
    for (const k of Object.keys(body)) {
      if (!['step', 'data', 'currentStep'].includes(k)) {
        return reply.code(400).send({ success: false, error: `Unknown field "${k.slice(0, 40)}"` });
      }
    }

    let step: ValidatedStep | null = null;
    let currentStep: number | undefined;
    try {
      if (body.step !== undefined) step = validateStep(body.step, body.data ?? {});
      else if (body.data !== undefined) throw new WizardInputError('data needs a step');
      if (body.currentStep !== undefined) currentStep = validateCurrentStep(body.currentStep);
      if (!step && currentStep === undefined) throw new WizardInputError('Nothing to save');
    } catch (error) {
      if (error instanceof WizardInputError) {
        return reply.code(400).send({ success: false, error: error.message });
      }
      return handleError(reply, error, 'internal', '[Onboarding]');
    }

    try {
      return { success: true, state: await saveWizardStep(userId, step, currentStep) };
    } catch (error) {
      return handleError(reply, error, 'internal', '[Onboarding]');
    }
  });

  fastify.post('/api/onboarding/complete', async (request, reply) => {
    const userId = owner(request, reply);
    if (userId === null) return reply;
    const body = request.body ?? {};
    if (!isPlainObject(body) || (body.skipped !== undefined && typeof body.skipped !== 'boolean')) {
      return reply.code(400).send({ success: false, error: 'Invalid body' });
    }
    try {
      return { success: true, state: completeWizard(userId, body.skipped === true) };
    } catch (error) {
      return handleError(reply, error, 'internal', '[Onboarding]');
    }
  });

  fastify.post('/api/onboarding/reset', async (request, reply) => {
    const userId = owner(request, reply);
    if (userId === null) return reply;
    try {
      return { success: true, state: resetWizard(userId) };
    } catch (error) {
      return handleError(reply, error, 'internal', '[Onboarding]');
    }
  });
}
