/**
 * Skills API Routes
 * Manage skills installation, settings, and execution
 */

import type { FastifyInstance } from 'fastify';
import { getSkillsRegistry } from '../../skills/registry.js';
import { getSkillsExecutor } from '../../skills/executor.js';
import { handleError } from '../error-handler.js';

export async function skillsRoutes(fastify: FastifyInstance) {
  const skillsRegistry = getSkillsRegistry();
  const skillsExecutor = getSkillsExecutor();

  // GET /api/skills - List all skills
  fastify.get('/api/skills', async (request, reply) => {
    try {
      const skills = skillsRegistry.getAll();

      return {
        success: true,
        skills: skills.map((skill) => ({
          id: skill.id,
          name: skill.name,
          source: skill.source,
          description: skill.metadata.description,
          version: skill.metadata.version,
          enabled: skill.enabled,
          triggers: skill.metadata.triggers,
          settings: skill.settingsSchema,
        })),
        stats: {
          total: skills.length,
          enabled: skills.filter((s) => s.enabled).length,
          bundled: skills.filter((s) => s.source === 'bundled').length,
          managed: skills.filter((s) => s.source === 'managed').length,
          workspace: skills.filter((s) => s.source === 'workspace').length,
        },
      };
    } catch (error: any) {
      console.error('[Skills API] ❌ List failed:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Skills] List failed');
    }
  });

  // GET /api/skills/:id - Get skill details
  fastify.get<{ Params: { id: string } }>('/api/skills/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const skill = skillsRegistry.get(id);

      if (!skill) {
        return reply.status(404).send({
          success: false,
          error: 'Skill not found',
        });
      }

      return {
        success: true,
        skill: {
          id: skill.id,
          name: skill.name,
          source: skill.source,
          enabled: skill.enabled,
          metadata: skill.metadata,
          instructions: skill.instructions,
          settingsSchema: skill.settingsSchema,
        },
      };
    } catch (error: any) {
      console.error('[Skills API] ❌ Get failed:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Skills] Get failed');
    }
  });

  // POST /api/skills/install - Install new skill from file
  fastify.post<{ Body: { content: string; name: string; source: 'managed' | 'workspace' } }>(
    '/api/skills/install',
    async (request, reply) => {
      try {
        const { content, name, source } = request.body;

        // TODO: Validate content is valid SKILL.md
        // TODO: Save to appropriate directory based on source
        // TODO: Registry will auto-load via file watcher

        return {
          success: true,
          message: `Skill "${name}" installed successfully`,
          source: source,
        };
      } catch (error: any) {
        console.error('[Skills API] ❌ Install failed:', error);
        // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
        return handleError(reply, error, 'internal', '[Skills] Install failed');
      }
    }
  );

  // PUT /api/skills/:id/settings - Update skill settings
  fastify.put<{
    Params: { id: string };
    Body: { settings: Record<string, any> };
  }>('/api/skills/:id/settings', async (request, reply) => {
    try {
      const { id } = request.params;
      const { settings } = request.body;

      const skill = skillsRegistry.get(id);

      if (!skill) {
        return reply.status(404).send({
          success: false,
          error: 'Skill not found',
        });
      }

      // TODO: Validate settings against schema
      // TODO: Encrypt secrets if any
      // TODO: Save to database

      return {
        success: true,
        message: `Settings for "${skill.name}" updated`,
      };
    } catch (error: any) {
      console.error('[Skills API] ❌ Settings update failed:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Skills] Settings update failed');
    }
  });

  // POST /api/skills/:id/enable - Enable skill
  fastify.post<{ Params: { id: string } }>('/api/skills/:id/enable', async (request, reply) => {
    try {
      const { id } = request.params;

      skillsRegistry.enable(id);

      return {
        success: true,
        message: `Skill enabled`,
      };
    } catch (error: any) {
      console.error('[Skills API] ❌ Enable failed:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Skills] Enable failed');
    }
  });

  // POST /api/skills/:id/disable - Disable skill
  fastify.post<{ Params: { id: string } }>('/api/skills/:id/disable', async (request, reply) => {
    try {
      const { id } = request.params;

      skillsRegistry.disable(id);

      return {
        success: true,
        message: `Skill disabled`,
      };
    } catch (error: any) {
      console.error('[Skills API] ❌ Disable failed:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Skills] Disable failed');
    }
  });

  // DELETE /api/skills/:id - Uninstall skill
  fastify.delete<{ Params: { id: string } }>('/api/skills/:id', async (request, reply) => {
    try {
      const { id } = request.params;

      const skill = skillsRegistry.get(id);

      if (!skill) {
        return reply.status(404).send({
          success: false,
          error: 'Skill not found',
        });
      }

      if (skill.source === 'bundled') {
        return reply.status(400).send({
          success: false,
          error: 'Cannot uninstall bundled skills',
        });
      }

      // TODO: Delete skill file
      // TODO: Registry will auto-reload via file watcher

      return {
        success: true,
        message: `Skill "${skill.name}" uninstalled`,
      };
    } catch (error: any) {
      console.error('[Skills API] ❌ Uninstall failed:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Skills] Uninstall failed');
    }
  });

  // POST /api/skills/:id/execute - Execute skill (for testing)
  fastify.post<{
    Params: { id: string };
    Body: { message: string; settings?: Record<string, any> };
  }>('/api/skills/:id/execute', async (request, reply) => {
    try {
      const { id } = request.params;
      const { message, settings } = request.body;

      const result = await skillsExecutor.execute(id, {
        message,
        settings: settings || {},
        userId: 'test-user',
        channelId: 'test-channel',
      });

      return {
        success: result.success,
        output: result.output,
        data: result.data,
        error: result.error,
      };
    } catch (error: any) {
      console.error('[Skills API] ❌ Execute failed:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Skills] Execute failed');
    }
  });

  // GET /api/skills/match - Find skills matching message
  fastify.get<{ Querystring: { message: string } }>(
    '/api/skills/match',
    async (request, reply) => {
      try {
        const { message } = request.query;

        if (!message) {
          return reply.status(400).send({
            success: false,
            error: 'Message parameter required',
          });
        }

        const matchingSkills = skillsExecutor.findMatchingSkills(message);

        return {
          success: true,
          matches: matchingSkills.map((skill) => ({
            id: skill.id,
            name: skill.name,
            description: skill.metadata.description,
            triggers: skill.metadata.triggers,
          })),
        };
      } catch (error: any) {
        console.error('[Skills API] ❌ Match failed:', error);
        // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
        return handleError(reply, error, 'internal', '[Skills] Match failed');
      }
    }
  );

  console.log('[Skills API] ✅ Routes registered');
}
