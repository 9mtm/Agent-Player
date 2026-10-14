/**
 * Teams, members and invitations (B1.6, part of the identity repository).
 * Scope rules (scope.ts + team membership):
 *
 *   teams / createTeam / myInvitations / acceptInvitation
 *                       member accounts (owner/admin/user), for themselves
 *   team / members      members of that team (else 403 `Not a team member`)
 *   updateTeam / invite / teamInvitations
 *                       the team's owner or admin members
 *   removeMember        team owner/admin; never the team owner; admins
 *                       cannot remove admins
 *   deleteTeam / setMemberRole
 *                       the team's owner only
 *   cancelInvitation    the invitee (reject) or a team owner/admin (cancel)
 *
 * The acting user always comes from the actor; a user id in the path only
 * names the member a change is about. Agent runs and channel turns: refused.
 * Denials are ScopeError 403/404 with the routes' messages; invalid input is
 * TeamInputError (400).
 */

import { randomBytes } from 'node:crypto';
import type { Actor } from './actor.js';
import { ScopeError, requireMember } from './scope.js';
import { withTransaction } from './transaction.js';
import { getDatabase } from '../db/index.js';

export class TeamInputError extends Error {}

const TEAM_ROLES = ['admin', 'user', 'guest'];
type A = Actor | null | undefined;

export interface TeamInvitationCreated {
  invitation: any;
  /** For the invitation e-mail (sent by the route). */
  mail: { to: string; teamName: string | null; inviterName: string | null; role: string; token: string };
}

export interface TeamsRepository {
  teams(actor: A): Promise<any[]>;
  createTeam(actor: A, input: { name?: unknown; description?: unknown }): Promise<any>;
  team(actor: A, teamId: string): Promise<{ team: any; myRole: string }>;
  updateTeam(actor: A, teamId: string, input: { name?: unknown; description?: unknown }): Promise<any>;
  deleteTeam(actor: A, teamId: string): Promise<void>;
  members(actor: A, teamId: string): Promise<any[]>;
  removeMember(actor: A, teamId: string, memberUserId: string): Promise<void>;
  setMemberRole(actor: A, teamId: string, memberUserId: string, role: unknown): Promise<void>;
  invite(actor: A, teamId: string, input: { email?: unknown; role?: unknown }): Promise<TeamInvitationCreated>;
  myInvitations(actor: A): Promise<any[]>;
  teamInvitations(actor: A, teamId: string): Promise<any[]>;
  acceptInvitation(actor: A, token: string): Promise<any>;
  cancelInvitation(actor: A, invitationId: string): Promise<void>;
}

const db = () => getDatabase();

function memberId(actor: A): string {
  const a = requireMember(actor);
  if (!a.userId) throw new ScopeError(403, 'An account is required');
  return a.userId;
}

function membership(teamId: string, userId: string): { role: string } | undefined {
  return db().prepare('SELECT role FROM team_members WHERE team_id = ? AND user_id = ?').get(teamId, userId) as { role: string } | undefined;
}

function teamManager(teamId: string, userId: string, message: string): { role: string } {
  const m = membership(teamId, userId);
  if (!m || !['owner', 'admin'].includes(m.role)) throw new ScopeError(403, message);
  return m;
}

function teamOwner(teamId: string, userId: string, message: string): void {
  const team = db().prepare('SELECT owner_id FROM teams WHERE id = ?').get(teamId) as { owner_id: string } | undefined;
  if (!team) throw new ScopeError(404, 'Team not found');
  if (team.owner_id !== userId) throw new ScopeError(403, message);
}

function accountEmail(userId: string): string {
  const user = db().prepare('SELECT email FROM users WHERE id = ?').get(userId) as { email: string } | undefined;
  if (!user) throw new ScopeError(404, 'User not found');
  return user.email;
}

const newId = (prefix: string) => `${prefix}_${Date.now()}_${randomBytes(8).toString('hex')}`;

export const sqliteTeams: TeamsRepository = {
  async teams(actor) {
    return db().prepare(`
      SELECT t.*, tm.role as my_role,
             (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
      FROM teams t
      INNER JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = ?
      ORDER BY t.created_at DESC
    `).all(memberId(actor));
  },

  async createTeam(actor, input) {
    const userId = memberId(actor);
    const name = input.name;
    if (typeof name !== 'string' || name.trim().length === 0) throw new TeamInputError('Team name is required');
    const description = typeof input.description === 'string' ? input.description.trim() || null : null;
    const teamId = newId('team');
    await withTransaction(actor, () => {
      db().prepare('INSERT INTO teams (id, name, description, owner_id) VALUES (?, ?, ?, ?)').run(teamId, name.trim(), description, userId);
      db().prepare(`INSERT INTO team_members (id, team_id, user_id, role) VALUES (?, ?, ?, 'owner')`).run(newId('member'), teamId, userId);
    });
    return db().prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
  },

  async team(actor, teamId) {
    const m = membership(teamId, memberId(actor));
    if (!m) throw new ScopeError(403, 'Not a team member');
    const team = db().prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    if (!team) throw new ScopeError(404, 'Team not found');
    return { team, myRole: m.role };
  },

  async updateTeam(actor, teamId, input) {
    teamManager(teamId, memberId(actor), 'Only owners and admins can update team');
    const updates: string[] = [];
    const params: unknown[] = [];
    if (input.name !== undefined) {
      if (typeof input.name !== 'string') throw new TeamInputError('Team name must be text');
      updates.push('name = ?'); params.push(input.name.trim());
    }
    if (input.description !== undefined) {
      updates.push('description = ?'); params.push(typeof input.description === 'string' ? input.description.trim() || null : null);
    }
    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      db().prepare(`UPDATE teams SET ${updates.join(', ')} WHERE id = ?`).run(...params, teamId);
    }
    return db().prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
  },

  async deleteTeam(actor, teamId) {
    teamOwner(teamId, memberId(actor), 'Only owner can delete team');
    db().prepare('DELETE FROM teams WHERE id = ?').run(teamId);
  },

  async members(actor, teamId) {
    if (!membership(teamId, memberId(actor))) throw new ScopeError(403, 'Not a team member');
    return db().prepare(`
      SELECT tm.id, tm.role, tm.joined_at, u.id as user_id, u.full_name as name, u.email, u.avatar_url as avatar
      FROM team_members tm
      INNER JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ?
      ORDER BY CASE tm.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 WHEN 'user' THEN 3 WHEN 'guest' THEN 4 END, tm.joined_at
    `).all(teamId);
  },

  async removeMember(actor, teamId, memberUserId) {
    const m = teamManager(teamId, memberId(actor), 'Only owners and admins can remove members');
    const target = membership(teamId, memberUserId);
    if (!target) throw new ScopeError(404, 'Member not found');
    if (target.role === 'owner') throw new ScopeError(403, 'Cannot remove team owner');
    if (m.role === 'admin' && target.role === 'admin') throw new ScopeError(403, 'Only owner can remove admins');
    db().prepare('DELETE FROM team_members WHERE team_id = ? AND user_id = ?').run(teamId, memberUserId);
  },

  async setMemberRole(actor, teamId, memberUserId, role) {
    const userId = memberId(actor);
    if (typeof role !== 'string' || !TEAM_ROLES.includes(role)) throw new TeamInputError('Invalid role');
    teamOwner(teamId, userId, 'Only owner can change member roles');
    const target = membership(teamId, memberUserId);
    if (!target) throw new ScopeError(404, 'Member not found');
    if (target.role === 'owner') throw new ScopeError(403, 'Cannot change owner role');
    db().prepare('UPDATE team_members SET role = ? WHERE team_id = ? AND user_id = ?').run(role, teamId, memberUserId);
  },

  async invite(actor, teamId, input) {
    const userId = memberId(actor);
    const { email, role } = input;
    if (!email || !role || typeof email !== 'string') throw new TeamInputError('Email and role are required');
    if (typeof role !== 'string' || !TEAM_ROLES.includes(role)) throw new TeamInputError('Invalid role');
    teamManager(teamId, userId, 'Only owners and admins can invite members');
    const existingMember = db().prepare(`
      SELECT tm.id FROM team_members tm INNER JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ? AND u.email = ?
    `).get(teamId, email);
    if (existingMember) throw new TeamInputError('User is already a team member');
    const pending = db().prepare(`SELECT id FROM team_invitations WHERE team_id = ? AND email = ? AND status = 'pending'`).get(teamId, email);
    if (pending) throw new TeamInputError('Invitation already sent to this email');

    const invitationId = newId('inv');
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
    db().prepare(`
      INSERT INTO team_invitations (id, team_id, email, role, invited_by, token, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(invitationId, teamId, email, role, userId, token, expiresAt);
    const invitation = db().prepare('SELECT * FROM team_invitations WHERE id = ?').get(invitationId);
    const team = db().prepare('SELECT name FROM teams WHERE id = ?').get(teamId) as { name: string } | undefined;
    const inviter = db().prepare('SELECT full_name AS name, username FROM users WHERE id = ?').get(userId) as { name: string | null; username: string } | undefined;
    return {
      invitation,
      mail: { to: email, teamName: team?.name ?? null, inviterName: inviter ? (inviter.name || inviter.username) : null, role, token },
    };
  },

  async myInvitations(actor) {
    const email = accountEmail(memberId(actor));
    return db().prepare(`
      SELECT ti.*, t.name as team_name, u.full_name as invited_by_name
      FROM team_invitations ti
      INNER JOIN teams t ON ti.team_id = t.id
      INNER JOIN users u ON ti.invited_by = u.id
      WHERE ti.email = ? AND ti.status = 'pending' AND ti.expires_at > datetime('now')
      ORDER BY ti.created_at DESC
    `).all(email);
  },

  async teamInvitations(actor, teamId) {
    teamManager(teamId, memberId(actor), 'Only owners and admins can view invitations');
    return db().prepare(`
      SELECT ti.*, u.full_name as invited_by_name
      FROM team_invitations ti
      INNER JOIN users u ON ti.invited_by = u.id
      WHERE ti.team_id = ? AND ti.status = 'pending'
      ORDER BY ti.created_at DESC
    `).all(teamId);
  },

  async acceptInvitation(actor, token) {
    const userId = memberId(actor);
    const email = accountEmail(userId);
    const invitation = db().prepare(`SELECT * FROM team_invitations WHERE token = ? AND email = ? AND status = 'pending'`).get(token, email) as any;
    if (!invitation) throw new ScopeError(404, 'Invitation not found or already used');
    if (new Date(invitation.expires_at) < new Date()) {
      db().prepare(`UPDATE team_invitations SET status = 'expired' WHERE id = ?`).run(invitation.id);
      throw new TeamInputError('Invitation has expired');
    }
    await withTransaction(actor, () => {
      db().prepare('INSERT INTO team_members (id, team_id, user_id, role, invited_by) VALUES (?, ?, ?, ?, ?)')
        .run(newId('member'), invitation.team_id, userId, invitation.role, invitation.invited_by);
      db().prepare(`UPDATE team_invitations SET status = 'accepted' WHERE id = ?`).run(invitation.id);
    });
    return db().prepare('SELECT * FROM teams WHERE id = ?').get(invitation.team_id);
  },

  async cancelInvitation(actor, invitationId) {
    const userId = memberId(actor);
    const invitation = db().prepare('SELECT * FROM team_invitations WHERE id = ?').get(invitationId) as any;
    if (!invitation) throw new ScopeError(404, 'Invitation not found');
    const email = accountEmail(userId);
    const isInvitee = invitation.email === email;
    const m = membership(invitation.team_id, userId);
    const isManager = !!m && ['owner', 'admin'].includes(m.role);
    if (!isInvitee && !isManager) throw new ScopeError(403, 'Not authorized to cancel this invitation');
    db().prepare('UPDATE team_invitations SET status = ? WHERE id = ?').run(isInvitee ? 'rejected' : 'expired', invitationId);
  },
};
