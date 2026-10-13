/**
 * Skills API Routes
 * Manage skills installation, settings, and execution
 */

import type { FastifyInstance } from 'fastify';
import { getSkillsRegistry } from '../../skills/registry.js';
import { getSkillsExecutor } from '../../skills/executor.js';
import { handleError } from '../error-handler.js';
import { anthropicSkillsService } from '../../services/anthropic-skills-service.js';
import { authorizeActiveRole, OWNER_OR_ADMIN } from '../../auth/route-guards.js';

export async function skillsRoutes(fastify: FastifyInstance) {
  const skillsRegistry = getSkillsRegistry();
  const skillsExecutor = getSkillsExecutor();

  // POST /api/skills/reload - Reload all skills from disk (F-07)
  // SECURITY: active owner/admin only.
  fastify.post('/api/skills/reload', async (request, reply) => {
    if (authorizeActiveRole(request, reply, OWNER_OR_ADMIN) === null) return reply;
    try {
      await skillsRegistry.reload();
      return { success: true, count: skillsRegistry.getAll().length };
    } catch (error: any) {
      return handleError(reply, error, 'internal', '[Skills] Reload failed');
    }
  });

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

  // ========================================
  // MARKETPLACE ROUTES - Anthropic Skills
  // ========================================

  // GET /api/skills/marketplace/sources - List skill sources
  fastify.get('/api/skills/marketplace/sources', async (request, reply) => {
    try {
      const { getDatabase } = await import('../../db/index.js');
      const db = getDatabase();

      const sources = db
        .prepare(
          `
        SELECT * FROM skill_sources
        WHERE is_enabled = 1
        ORDER BY priority DESC, name
      `
        )
        .all();

      return { success: true, sources };
    } catch (error: any) {
      console.error('[Skills Marketplace] ❌ Sources failed:', error);
      return handleError(reply, error, 'internal', '[Skills Marketplace] Sources failed');
    }
  });

  // GET /api/skills/marketplace/available - Fetch available skills from Anthropic
  fastify.get('/api/skills/marketplace/available', async (request, reply) => {
    try {
      console.log('[Skills Marketplace] 📥 Fetching available skills from Anthropic...');
      const skills = await anthropicSkillsService.fetchAvailableSkills();
      console.log(`[Skills Marketplace] ✅ Fetched ${skills.length} skills`);

      return { success: true, skills, count: skills.length };
    } catch (error: any) {
      console.error('[Skills Marketplace] ❌ Fetch available failed:', error);
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to fetch skills',
      });
    }
  });

  // GET /api/skills/marketplace/installed - List installed marketplace skills
  fastify.get('/api/skills/marketplace/installed', async (request, reply) => {
    try {
      const skills = anthropicSkillsService.getInstalledSkills();

      return { success: true, skills, count: skills.length };
    } catch (error: any) {
      console.error('[Skills Marketplace] ❌ List installed failed:', error);
      return handleError(
        reply,
        error,
        'internal',
        '[Skills Marketplace] List installed failed'
      );
    }
  });

  // POST /api/skills/marketplace/install - Install skill from Anthropic
  fastify.post<{ Body: { skillName: string; skillPath: string } }>(
    '/api/skills/marketplace/install',
    async (request, reply) => {
      try {
        const { skillName, skillPath } = request.body;

        console.log('[Skills Marketplace] 📥 Install request:', { skillName, skillPath });

        if (!skillName || !skillPath) {
          console.error('[Skills Marketplace] ❌ Missing parameters:', { skillName, skillPath });
          return reply.status(400).send({
            success: false,
            error: 'skillName and skillPath are required',
          });
        }

        const localPath = await anthropicSkillsService.installSkill(skillName, skillPath);

        console.log('[Skills Marketplace] ✅ Skill installed:', { skillName, localPath });

        return {
          success: true,
          message: `Skill "${skillName}" installed successfully`,
          localPath,
        };
      } catch (error: any) {
        console.error('[Skills Marketplace] ❌ Install failed:', error);
        // Return detailed error to frontend
        return reply.status(500).send({
          success: false,
          error: error.message || 'Installation failed',
        });
      }
    }
  );

  // DELETE /api/skills/marketplace/:skillId - Uninstall marketplace skill
  fastify.delete<{ Params: { skillId: string } }>(
    '/api/skills/marketplace/:skillId',
    async (request, reply) => {
      try {
        const { skillId } = request.params;

        await anthropicSkillsService.uninstallSkill(skillId);

        return {
          success: true,
          message: 'Skill uninstalled successfully',
        };
      } catch (error: any) {
        console.error('[Skills Marketplace] ❌ Uninstall failed:', error);
        return handleError(reply, error, 'internal', '[Skills Marketplace] Uninstall failed');
      }
    }
  );

  // GET /api/skills/marketplace/search - Search marketplace skills
  fastify.get<{ Querystring: { q: string } }>(
    '/api/skills/marketplace/search',
    async (request, reply) => {
      try {
        const { q } = request.query;

        if (!q) {
          return reply.status(400).send({
            success: false,
            error: 'Query parameter "q" is required',
          });
        }

        const skills = await anthropicSkillsService.searchSkills(q);

        return { success: true, skills, count: skills.length };
      } catch (error: any) {
        console.error('[Skills Marketplace] ❌ Search failed:', error);
        return handleError(reply, error, 'internal', '[Skills Marketplace] Search failed');
      }
    }
  );

  // GET /api/skills/marketplace/stats - Get marketplace statistics
  fastify.get('/api/skills/marketplace/stats', async (request, reply) => {
    try {
      const { getDatabase } = await import('../../db/index.js');
      const db = getDatabase();

      const stats = {
        totalInstalled: db
          .prepare(`SELECT COUNT(*) as count FROM installed_skills`)
          .get() as { count: number },
        enabled: db
          .prepare(`SELECT COUNT(*) as count FROM installed_skills WHERE is_enabled = 1`)
          .get() as { count: number },
        byCategory: db
          .prepare(
            `
          SELECT category, COUNT(*) as count
          FROM installed_skills
          GROUP BY category
          ORDER BY count DESC
        `
          )
          .all(),
        mostUsed: db
          .prepare(
            `
          SELECT skill_name, display_name, usage_count
          FROM installed_skills
          ORDER BY usage_count DESC
          LIMIT 5
        `
          )
          .all(),
      };

      return { success: true, stats };
    } catch (error: any) {
      console.error('[Skills Marketplace] ❌ Stats failed:', error);
      return handleError(reply, error, 'internal', '[Skills Marketplace] Stats failed');
    }
  });

  // PUT /api/skills/marketplace/:skillId/toggle - Enable/disable marketplace skill
  fastify.put<{ Params: { skillId: string } }>(
    '/api/skills/marketplace/:skillId/toggle',
    async (request, reply) => {
      try {
        const { skillId } = request.params;
        const { getDatabase } = await import('../../db/index.js');
        const db = getDatabase();

        // Toggle is_enabled
        db.prepare(
          `
        UPDATE installed_skills
        SET is_enabled = CASE WHEN is_enabled = 1 THEN 0 ELSE 1 END
        WHERE id = ?
      `
        ).run(skillId);

        const skill = db
          .prepare(`SELECT is_enabled FROM installed_skills WHERE id = ?`)
          .get(skillId) as { is_enabled: number } | undefined;

        return {
          success: true,
          enabled: skill?.is_enabled === 1,
        };
      } catch (error: any) {
        console.error('[Skills Marketplace] ❌ Toggle failed:', error);
        return handleError(reply, error, 'internal', '[Skills Marketplace] Toggle failed');
      }
    }
  );

  console.log('[Skills API] ✅ Routes registered (including Marketplace)');
}
