/**
 * Team Management API Routes
 * Handles teams, members, and invitations
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { randomBytes } from 'crypto';
import { getDatabase } from '../../db/index.js';
import { getUserIdFromRequest } from '../../auth/jwt.js';
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

export async function registerTeamRoutes(fastify: FastifyInstance) {
    const db = getDatabase();

    // ================== TEAMS ==================

    // Get current user's teams
    fastify.get('/api/team', async (request: FastifyRequest) => {
        const userId = getUserIdFromRequest(request);

        const teams = db.prepare(`
            SELECT
                t.*,
                tm.role as my_role,
                (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
            FROM teams t
            INNER JOIN team_members tm ON t.id = tm.team_id
            WHERE tm.user_id = ?
            ORDER BY t.created_at DESC
        `).all(userId);

        return { teams };
    });

    // Create new team
    fastify.post<{ Body: CreateTeamBody }>('/api/team', async (request) => {
        const userId = getUserIdFromRequest(request);
        const { name, description } = request.body;

        if (!name || name.trim().length === 0) {
            return request.code(400).send({ error: 'Team name is required' });
        }

        const teamId = `team_${Date.now()}_${randomBytes(8).toString('hex')}`;
        const memberId = `member_${Date.now()}_${randomBytes(8).toString('hex')}`;

        const insertTeam = db.transaction(() => {
            // Create team
            db.prepare(`
                INSERT INTO teams (id, name, description, owner_id)
                VALUES (?, ?, ?, ?)
            `).run(teamId, name.trim(), description?.trim() || null, userId);

            // Add creator as owner
            db.prepare(`
                INSERT INTO team_members (id, team_id, user_id, role)
                VALUES (?, ?, ?, 'owner')
            `).run(memberId, teamId, userId);
        });
        insertTeam();

        const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);

        return { success: true, team };
    });

    // Get team details
    fastify.get<{ Params: { id: string } }>('/api/team/:id', async (request) => {
        const userId = getUserIdFromRequest(request);
        const { id } = request.params;

        // Check if user is member
        const membership = db.prepare(`
            SELECT role FROM team_members
            WHERE team_id = ? AND user_id = ?
        `).get(id, userId) as { role: string } | undefined;

        if (!membership) {
            return request.code(403).send({ error: 'Not a team member' });
        }

        const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(id);

        if (!team) {
            return request.code(404).send({ error: 'Team not found' });
        }

        return { team, myRole: membership.role };
    });

    // Update team
    fastify.put<{ Params: { id: string }; Body: UpdateTeamBody }>('/api/team/:id', async (request) => {
        const userId = getUserIdFromRequest(request);
        const { id } = request.params;
        const { name, description } = request.body;

        // Check if user is owner or admin
        const membership = db.prepare(`
            SELECT role FROM team_members
            WHERE team_id = ? AND user_id = ?
        `).get(id, userId) as { role: string } | undefined;

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
            return request.code(403).send({ error: 'Only owners and admins can update team' });
        }

        const updates: string[] = [];
        const params: any[] = [];

        if (name !== undefined) {
            updates.push('name = ?');
            params.push(name.trim());
        }

        if (description !== undefined) {
            updates.push('description = ?');
            params.push(description?.trim() || null);
        }

        if (updates.length > 0) {
            updates.push('updated_at = CURRENT_TIMESTAMP');
            params.push(id);

            db.prepare(`
                UPDATE teams
                SET ${updates.join(', ')}
                WHERE id = ?
            `).run(...params);
        }

        const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(id);

        return { success: true, team };
    });

    // Delete team
    fastify.delete<{ Params: { id: string } }>('/api/team/:id', async (request) => {
        const userId = getUserIdFromRequest(request);
        const { id } = request.params;

        // Check if user is owner
        const team = db.prepare('SELECT owner_id FROM teams WHERE id = ?').get(id) as { owner_id: string } | undefined;

        if (!team) {
            return request.code(404).send({ error: 'Team not found' });
        }

        if (team.owner_id !== userId) {
            return request.code(403).send({ error: 'Only owner can delete team' });
        }

        db.prepare('DELETE FROM teams WHERE id = ?').run(id);

        return { success: true };
    });

    // ================== MEMBERS ==================

    // Get team members
    fastify.get<{ Params: { id: string } }>('/api/team/:id/members', async (request) => {
        const userId = getUserIdFromRequest(request);
        const { id } = request.params;

        // Check if user is member
        const membership = db.prepare(`
            SELECT role FROM team_members
            WHERE team_id = ? AND user_id = ?
        `).get(id, userId) as { role: string } | undefined;

        if (!membership) {
            return request.code(403).send({ error: 'Not a team member' });
        }

        const members = db.prepare(`
            SELECT
                tm.id,
                tm.role,
                tm.joined_at,
                u.id as user_id,
                u.name,
                u.email,
                u.avatar
            FROM team_members tm
            INNER JOIN users u ON tm.user_id = u.id
            WHERE tm.team_id = ?
            ORDER BY
                CASE tm.role
                    WHEN 'owner' THEN 1
                    WHEN 'admin' THEN 2
                    WHEN 'user' THEN 3
                    WHEN 'guest' THEN 4
                END,
                tm.joined_at
        `).all(id);

        return { members };
    });

    // Remove team member
    fastify.delete<{ Params: { id: string; userId: string } }>('/api/team/:id/members/:userId', async (request) => {
        const currentUserId = getUserIdFromRequest(request);
        const { id: teamId, userId: targetUserId } = request.params;

        // Check if current user is owner or admin
        const membership = db.prepare(`
            SELECT role FROM team_members
            WHERE team_id = ? AND user_id = ?
        `).get(teamId, currentUserId) as { role: string } | undefined;

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
            return request.code(403).send({ error: 'Only owners and admins can remove members' });
        }

        // Check target user's role
        const targetMember = db.prepare(`
            SELECT role FROM team_members
            WHERE team_id = ? AND user_id = ?
        `).get(teamId, targetUserId) as { role: string } | undefined;

        if (!targetMember) {
            return request.code(404).send({ error: 'Member not found' });
        }

        // Cannot remove owner
        if (targetMember.role === 'owner') {
            return request.code(403).send({ error: 'Cannot remove team owner' });
        }

        // Admin can only remove users and guests, not other admins (only owner can)
        if (membership.role === 'admin' && targetMember.role === 'admin') {
            return request.code(403).send({ error: 'Only owner can remove admins' });
        }

        db.prepare(`
            DELETE FROM team_members
            WHERE team_id = ? AND user_id = ?
        `).run(teamId, targetUserId);

        return { success: true };
    });

    // Update member role
    fastify.put<{ Params: { id: string; userId: string }; Body: UpdateMemberRoleBody }>('/api/team/:id/members/:userId/role', async (request) => {
        const currentUserId = getUserIdFromRequest(request);
        const { id: teamId, userId: targetUserId } = request.params;
        const { role: newRole } = request.body;

        if (!['admin', 'user', 'guest'].includes(newRole)) {
            return request.code(400).send({ error: 'Invalid role' });
        }

        // Check if current user is owner
        const team = db.prepare('SELECT owner_id FROM teams WHERE id = ?').get(teamId) as { owner_id: string } | undefined;

        if (!team) {
            return request.code(404).send({ error: 'Team not found' });
        }

        if (team.owner_id !== currentUserId) {
            return request.code(403).send({ error: 'Only owner can change member roles' });
        }

        // Check target member exists
        const targetMember = db.prepare(`
            SELECT role FROM team_members
            WHERE team_id = ? AND user_id = ?
        `).get(teamId, targetUserId) as { role: string } | undefined;

        if (!targetMember) {
            return request.code(404).send({ error: 'Member not found' });
        }

        // Cannot change owner's role
        if (targetMember.role === 'owner') {
            return request.code(403).send({ error: 'Cannot change owner role' });
        }

        db.prepare(`
            UPDATE team_members
            SET role = ?
            WHERE team_id = ? AND user_id = ?
        `).run(newRole, teamId, targetUserId);

        return { success: true };
    });

    // ================== INVITATIONS ==================

    // Send invitation
    fastify.post<{ Params: { id: string }; Body: InviteMemberBody }>('/api/team/:id/invite', async (request) => {
        const userId = getUserIdFromRequest(request);
        const { id: teamId } = request.params;
        const { email, role } = request.body;

        if (!email || !role) {
            return request.code(400).send({ error: 'Email and role are required' });
        }

        if (!['admin', 'user', 'guest'].includes(role)) {
            return request.code(400).send({ error: 'Invalid role' });
        }

        // Check if user is owner or admin
        const membership = db.prepare(`
            SELECT role FROM team_members
            WHERE team_id = ? AND user_id = ?
        `).get(teamId, userId) as { role: string } | undefined;

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
            return request.code(403).send({ error: 'Only owners and admins can invite members' });
        }

        // Check if email is already a member
        const existingMember = db.prepare(`
            SELECT tm.id FROM team_members tm
            INNER JOIN users u ON tm.user_id = u.id
            WHERE tm.team_id = ? AND u.email = ?
        `).get(teamId, email);

        if (existingMember) {
            return request.code(400).send({ error: 'User is already a team member' });
        }

        // Check if there's already a pending invitation
        const existingInvitation = db.prepare(`
            SELECT id FROM team_invitations
            WHERE team_id = ? AND email = ? AND status = 'pending'
        `).get(teamId, email);

        if (existingInvitation) {
            return request.code(400).send({ error: 'Invitation already sent to this email' });
        }

        // Create invitation
        const invitationId = `inv_${Date.now()}_${randomBytes(8).toString('hex')}`;
        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

        db.prepare(`
            INSERT INTO team_invitations (id, team_id, email, role, invited_by, token, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(invitationId, teamId, email, role, userId, token, expiresAt);

        const invitation = db.prepare('SELECT * FROM team_invitations WHERE id = ?').get(invitationId);

        // Get team and inviter details for email
        const team = db.prepare('SELECT name FROM teams WHERE id = ?').get(teamId) as { name: string } | undefined;
        const inviter = db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as { name: string } | undefined;

        // Send invitation email
        if (emailService.isConfigured() && team && inviter) {
            await emailService.sendTeamInvitation({
                to: email,
                teamName: team.name,
                inviterName: inviter.name || 'A team member',
                role,
                token,
            });
        } else if (!emailService.isConfigured()) {
            console.warn('[Team] Email not configured. Invitation created but email not sent.');
        }

        return { success: true, invitation };
    });

    // Get current user's pending invitations
    fastify.get('/api/team/invitations', async (request) => {
        const userId = getUserIdFromRequest(request);

        // Get user's email
        const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId) as { email: string } | undefined;

        if (!user) {
            return request.code(404).send({ error: 'User not found' });
        }

        const invitations = db.prepare(`
            SELECT
                ti.*,
                t.name as team_name,
                u.name as invited_by_name
            FROM team_invitations ti
            INNER JOIN teams t ON ti.team_id = t.id
            INNER JOIN users u ON ti.invited_by = u.id
            WHERE ti.email = ? AND ti.status = 'pending' AND ti.expires_at > datetime('now')
            ORDER BY ti.created_at DESC
        `).all(user.email);

        return { invitations };
    });

    // Get team's pending invitations (for admins/owners)
    fastify.get<{ Params: { id: string } }>('/api/team/:id/invitations', async (request) => {
        const userId = getUserIdFromRequest(request);
        const { id: teamId } = request.params;

        // Check if user is owner or admin
        const membership = db.prepare(`
            SELECT role FROM team_members
            WHERE team_id = ? AND user_id = ?
        `).get(teamId, userId) as { role: string } | undefined;

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
            return request.code(403).send({ error: 'Only owners and admins can view invitations' });
        }

        const invitations = db.prepare(`
            SELECT
                ti.*,
                u.name as invited_by_name
            FROM team_invitations ti
            INNER JOIN users u ON ti.invited_by = u.id
            WHERE ti.team_id = ? AND ti.status = 'pending'
            ORDER BY ti.created_at DESC
        `).all(teamId);

        return { invitations };
    });

    // Accept invitation
    fastify.post<{ Params: { token: string } }>('/api/team/invitations/:token/accept', async (request) => {
        const userId = getUserIdFromRequest(request);
        const { token } = request.params;

        // Get user's email
        const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId) as { email: string } | undefined;

        if (!user) {
            return request.code(404).send({ error: 'User not found' });
        }

        // Find invitation
        const invitation = db.prepare(`
            SELECT * FROM team_invitations
            WHERE token = ? AND email = ? AND status = 'pending'
        `).get(token, user.email) as any;

        if (!invitation) {
            return request.code(404).send({ error: 'Invitation not found or already used' });
        }

        // Check if expired
        if (new Date(invitation.expires_at) < new Date()) {
            db.prepare(`
                UPDATE team_invitations
                SET status = 'expired'
                WHERE id = ?
            `).run(invitation.id);

            return request.code(400).send({ error: 'Invitation has expired' });
        }

        const memberId = `member_${Date.now()}_${randomBytes(8).toString('hex')}`;

        const acceptInvitation = db.transaction(() => {
            // Add user as team member
            db.prepare(`
                INSERT INTO team_members (id, team_id, user_id, role, invited_by)
                VALUES (?, ?, ?, ?, ?)
            `).run(memberId, invitation.team_id, userId, invitation.role, invitation.invited_by);

            // Mark invitation as accepted
            db.prepare(`
                UPDATE team_invitations
                SET status = 'accepted'
                WHERE id = ?
            `).run(invitation.id);
        });
        acceptInvitation();

        const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(invitation.team_id);

        return { success: true, team };
    });

    // Cancel/Reject invitation
    fastify.delete<{ Params: { id: string } }>('/api/team/invitations/:id', async (request) => {
        const userId = getUserIdFromRequest(request);
        const { id: invitationId } = request.params;

        // Get invitation
        const invitation = db.prepare(`
            SELECT * FROM team_invitations WHERE id = ?
        `).get(invitationId) as any;

        if (!invitation) {
            return request.code(404).send({ error: 'Invitation not found' });
        }

        // Get user's email
        const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId) as { email: string } | undefined;

        if (!user) {
            return request.code(404).send({ error: 'User not found' });
        }

        // Check if user is the invitee (can reject) or team admin/owner (can cancel)
        const isInvitee = invitation.email === user.email;
        const membership = db.prepare(`
            SELECT role FROM team_members
            WHERE team_id = ? AND user_id = ?
        `).get(invitation.team_id, userId) as { role: string } | undefined;

        const isAdminOrOwner = membership && ['owner', 'admin'].includes(membership.role);

        if (!isInvitee && !isAdminOrOwner) {
            return request.code(403).send({ error: 'Not authorized to cancel this invitation' });
        }

        const newStatus = isInvitee ? 'rejected' : 'expired';

        db.prepare(`
            UPDATE team_invitations
            SET status = ?
            WHERE id = ?
        `).run(newStatus, invitationId);

        return { success: true };
    });

    console.log('[Team API] ✅ Routes registered');
}
