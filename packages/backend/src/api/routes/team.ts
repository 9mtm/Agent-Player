/**
 * Team Management API Routes
 * Handles teams, members, and invitations
 *
 * B1.6: everything goes through the identity repository
 * (repositories/teams.ts) with the request's actor; the acting user always
 * comes from the verified token, a user id in the path only names the
 * member a change is about. Team rules (membership, owner/admin) are
 * enforced there; denials answer 403/404, invalid input 400.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { actorOf } from '../../auth/auth-gate.js';
import { getUserIdFromRequest } from '../../auth/jwt.js';
import { repositories } from '../../repositories/index.js';
import { ScopeError } from '../../repositories/scope.js';
import { TeamInputError } from '../../repositories/teams.js';
import type { Actor } from '../../repositories/actor.js';
import { emailService } from '../../services/email-service.js';

interface CreateTeamBody {
    name: string;
    description?: string;
}

interface UpdateTeamBody {
    name?: string;
    description?: string;
}

interface InviteMemberBody {
    email: string;
    role: 'admin' | 'user' | 'guest';
}

interface UpdateMemberRoleBody {
    role: 'admin' | 'user' | 'guest';
}

const teams = () => repositories.identity;

/** The signed-in caller (token checked as before; throws -> 401 by the error handler). */
function caller(request: FastifyRequest): Actor | null {
    getUserIdFromRequest(request);
    return actorOf(request);
}

/** Scope / input errors as `{ error }` with their status; anything else is rethrown. */
function fail(reply: FastifyReply, err: unknown) {
    if (err instanceof ScopeError) return reply.code(err.status).send({ error: err.message });
    if (err instanceof TeamInputError) return reply.code(400).send({ error: err.message });
    throw err;
}

const body = (request: FastifyRequest): Record<string, unknown> =>
    request.body && typeof request.body === 'object' && !Array.isArray(request.body) ? request.body as Record<string, unknown> : {};

export async function registerTeamRoutes(fastify: FastifyInstance) {
    // ================== TEAMS ==================

    // Get current user's teams
    fastify.get('/api/team', async (request, reply) => {
        const actor = caller(request);
        try { return { teams: await teams().teams(actor) }; } catch (err) { return fail(reply, err); }
    });

    // Create new team
    fastify.post<{ Body: CreateTeamBody }>('/api/team', async (request, reply) => {
        const actor = caller(request);
        try { return { success: true, team: await teams().createTeam(actor, body(request)) }; } catch (err) { return fail(reply, err); }
    });

    // Get team details
    fastify.get<{ Params: { id: string } }>('/api/team/:id', async (request, reply) => {
        const actor = caller(request);
        try { return await teams().team(actor, request.params.id); } catch (err) { return fail(reply, err); }
    });

    // Update team
    fastify.put<{ Params: { id: string }; Body: UpdateTeamBody }>('/api/team/:id', async (request, reply) => {
        const actor = caller(request);
        try { return { success: true, team: await teams().updateTeam(actor, request.params.id, body(request)) }; } catch (err) { return fail(reply, err); }
    });

    // Delete team
    fastify.delete<{ Params: { id: string } }>('/api/team/:id', async (request, reply) => {
        const actor = caller(request);
        try { await teams().deleteTeam(actor, request.params.id); return { success: true }; } catch (err) { return fail(reply, err); }
    });

    // ================== MEMBERS ==================

    // Get team members
    fastify.get<{ Params: { id: string } }>('/api/team/:id/members', async (request, reply) => {
        const actor = caller(request);
        try { return { members: await teams().members(actor, request.params.id) }; } catch (err) { return fail(reply, err); }
    });

    // Remove team member (the path names the member; the caller comes from the token)
    fastify.delete<{ Params: { id: string; userId: string } }>('/api/team/:id/members/:userId', async (request, reply) => {
        const actor = caller(request);
        const { id: teamId, userId: memberUserId } = request.params;
        try { await teams().removeMember(actor, teamId, memberUserId); return { success: true }; } catch (err) { return fail(reply, err); }
    });

    // Update member role
    fastify.put<{ Params: { id: string; userId: string }; Body: UpdateMemberRoleBody }>('/api/team/:id/members/:userId/role', async (request, reply) => {
        const actor = caller(request);
        const { id: teamId, userId: memberUserId } = request.params;
        try { await teams().setMemberRole(actor, teamId, memberUserId, body(request).role); return { success: true }; } catch (err) { return fail(reply, err); }
    });

    // ================== INVITATIONS ==================

    // Send invitation
    fastify.post<{ Params: { id: string }; Body: InviteMemberBody }>('/api/team/:id/invite', async (request, reply) => {
        const actor = caller(request);
        let created;
        try { created = await teams().invite(actor, request.params.id, body(request)); } catch (err) { return fail(reply, err); }

        // Send invitation email
        const { mail } = created;
        if (emailService.isConfigured() && mail.teamName && mail.inviterName !== null) {
            await emailService.sendTeamInvitation({
                to: mail.to,
                teamName: mail.teamName,
                inviterName: mail.inviterName || 'A team member',
                role: mail.role,
                token: mail.token,
            });
        } else if (!emailService.isConfigured()) {
            console.warn('[Team] Email not configured. Invitation created but email not sent.');
        }

        return { success: true, invitation: created.invitation };
    });

    // Get current user's pending invitations
    fastify.get('/api/team/invitations', async (request, reply) => {
        const actor = caller(request);
        try { return { invitations: await teams().myInvitations(actor) }; } catch (err) { return fail(reply, err); }
    });

    // Get team's pending invitations (for admins/owners)
    fastify.get<{ Params: { id: string } }>('/api/team/:id/invitations', async (request, reply) => {
        const actor = caller(request);
        try { return { invitations: await teams().teamInvitations(actor, request.params.id) }; } catch (err) { return fail(reply, err); }
    });

    // Accept invitation
    fastify.post<{ Params: { token: string } }>('/api/team/invitations/:token/accept', async (request, reply) => {
        const actor = caller(request);
        try { return { success: true, team: await teams().acceptInvitation(actor, request.params.token) }; } catch (err) { return fail(reply, err); }
    });

    // Cancel/Reject invitation
    fastify.delete<{ Params: { id: string } }>('/api/team/invitations/:id', async (request, reply) => {
        const actor = caller(request);
        try { await teams().cancelInvitation(actor, request.params.id); return { success: true }; } catch (err) { return fail(reply, err); }
    });

    console.log('[Team API] ✅ Routes registered');
}
