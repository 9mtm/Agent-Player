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
 *
 * One implementation over a SQL runner (sql-runner.ts, B2.2b): sqliteTeams
 * and pgTeams (repositories/pg/teams.ts) share the logic and the SQL; only
 * the "now" of the pending-invitation filter and the expires_at shape of
 * returned invitation rows (invitationRow) differ by dialect. The
 * multi-statement writes (create team + owner membership, accept invitation)
 * run as one runner.batch transaction on either driver.
 */

import { randomBytes } from 'node:crypto';
import type { Actor } from './actor.js';
import { ScopeError, requireMember } from './scope.js';
import { sqliteRunner, type SqlRunner } from './sql-runner.js';
import { nowTs } from '../db/pg/dialect.js';

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

function memberId(actor: A): string {
  const a = requireMember(actor);
  if (!a.userId) throw new ScopeError(403, 'An account is required');
  return a.userId;
}

const newId = (prefix: string) => `${prefix}_${Date.now()}_${randomBytes(8).toString('hex')}`;

/**
 * A stored timestamp as a Date. SQLite rows hold the ISO string written by
 * invite(); PostgreSQL returns timestamptz as 'YYYY-MM-DD HH:MM:SS[.f]' in
 * UTC (db/pg/types.ts), which Date would read as local time without the 'Z'.
 */
export function parseStoredTime(value: string): Date {
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}(?:\.\d+)?)$/.exec(value);
  return new Date(m ? `${m[1]}T${m[2]}Z` : value);
}

/**
 * An invitation row in the SQLite shape (B2.2b-2). invite() writes
 * expires_at as an ISO string and SQLite returns that string; PostgreSQL
 * stores timestamptz and returns 'YYYY-MM-DD HH:MM:SS[.f]' (UTC). On
 * PostgreSQL the value is turned back into the same ISO string, so callers
 * see one shape on both drivers. Other columns are unchanged.
 */
export function invitationRow<T>(dialect: SqlRunner['dialect'], row: T): T {
  if (dialect !== 'postgres' || !row || typeof row !== 'object') return row;
  const r = row as Record<string, unknown>;
  if (typeof r.expires_at !== 'string') return row;
  const d = parseStoredTime(r.expires_at);
  return Number.isNaN(d.getTime()) ? row : { ...r, expires_at: d.toISOString() } as T;
}

/** The teams repository over a SQL runner (one per driver). */
export function createTeams(sql: SqlRunner): TeamsRepository {
  // SQLite keeps its original text comparison; PostgreSQL compares timestamptz.
  const NOW = sql.dialect === 'postgres' ? nowTs(sql.dialect) : `datetime('now')`;

  const membership = (teamId: string, userId: string) =>
    sql.one<{ role: string }>('SELECT role FROM team_members WHERE team_id = ? AND user_id = ?', teamId, userId);

  async function teamManager(teamId: string, userId: string, message: string): Promise<{ role: string }> {
    const m = await membership(teamId, userId);
    if (!m || !['owner', 'admin'].includes(m.role)) throw new ScopeError(403, message);
    return m;
  }

  async function teamOwner(teamId: string, userId: string, message: string): Promise<void> {
    const team = await sql.one<{ owner_id: string }>('SELECT owner_id FROM teams WHERE id = ?', teamId);
    if (!team) throw new ScopeError(404, 'Team not found');
    if (team.owner_id !== userId) throw new ScopeError(403, message);
  }

  async function accountEmail(userId: string): Promise<string> {
    const user = await sql.one<{ email: string }>('SELECT email FROM users WHERE id = ?', userId);
    if (!user) throw new ScopeError(404, 'User not found');
    return user.email;
  }

  const teamRow = (teamId: string) => sql.one('SELECT * FROM teams WHERE id = ?', teamId);

  return {
    async teams(actor) {
      return sql.all(`
        SELECT t.*, tm.role as my_role,
               (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
        FROM teams t
        INNER JOIN team_members tm ON t.id = tm.team_id
        WHERE tm.user_id = ?
        ORDER BY t.created_at DESC
      `, memberId(actor));
    },

    async createTeam(actor, input) {
      const userId = memberId(actor);
      const name = input.name;
      if (typeof name !== 'string' || name.trim().length === 0) throw new TeamInputError('Team name is required');
      const description = typeof input.description === 'string' ? input.description.trim() || null : null;
      const teamId = newId('team');
      await sql.batch(actor, [
        ['INSERT INTO teams (id, name, description, owner_id) VALUES (?, ?, ?, ?)', teamId, name.trim(), description, userId],
        [`INSERT INTO team_members (id, team_id, user_id, role) VALUES (?, ?, ?, 'owner')`, newId('member'), teamId, userId],
      ]);
      return teamRow(teamId);
    },

    async team(actor, teamId) {
      const m = await membership(teamId, memberId(actor));
      if (!m) throw new ScopeError(403, 'Not a team member');
      const team = await teamRow(teamId);
      if (!team) throw new ScopeError(404, 'Team not found');
      return { team, myRole: m.role };
    },

    async updateTeam(actor, teamId, input) {
      await teamManager(teamId, memberId(actor), 'Only owners and admins can update team');
      const updates: string[] = [];
      const params: Array<string | null> = [];
      if (input.name !== undefined) {
        if (typeof input.name !== 'string') throw new TeamInputError('Team name must be text');
        updates.push('name = ?'); params.push(input.name.trim());
      }
      if (input.description !== undefined) {
        updates.push('description = ?'); params.push(typeof input.description === 'string' ? input.description.trim() || null : null);
      }
      if (updates.length > 0) {
        updates.push('updated_at = CURRENT_TIMESTAMP');
        await sql.run(`UPDATE teams SET ${updates.join(', ')} WHERE id = ?`, ...params, teamId);
      }
      return teamRow(teamId);
    },

    async deleteTeam(actor, teamId) {
      await teamOwner(teamId, memberId(actor), 'Only owner can delete team');
      await sql.run('DELETE FROM teams WHERE id = ?', teamId);
    },

    async members(actor, teamId) {
      if (!(await membership(teamId, memberId(actor)))) throw new ScopeError(403, 'Not a team member');
      return sql.all(`
        SELECT tm.id, tm.role, tm.joined_at, u.id as user_id, u.full_name as name, u.email, u.avatar_url as avatar
        FROM team_members tm
        INNER JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = ?
        ORDER BY CASE tm.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 WHEN 'user' THEN 3 WHEN 'guest' THEN 4 END, tm.joined_at
      `, teamId);
    },

    async removeMember(actor, teamId, memberUserId) {
      const m = await teamManager(teamId, memberId(actor), 'Only owners and admins can remove members');
      const target = await membership(teamId, memberUserId);
      if (!target) throw new ScopeError(404, 'Member not found');
      if (target.role === 'owner') throw new ScopeError(403, 'Cannot remove team owner');
      if (m.role === 'admin' && target.role === 'admin') throw new ScopeError(403, 'Only owner can remove admins');
      await sql.run('DELETE FROM team_members WHERE team_id = ? AND user_id = ?', teamId, memberUserId);
    },

    async setMemberRole(actor, teamId, memberUserId, role) {
      const userId = memberId(actor);
      if (typeof role !== 'string' || !TEAM_ROLES.includes(role)) throw new TeamInputError('Invalid role');
      await teamOwner(teamId, userId, 'Only owner can change member roles');
      const target = await membership(teamId, memberUserId);
      if (!target) throw new ScopeError(404, 'Member not found');
      if (target.role === 'owner') throw new ScopeError(403, 'Cannot change owner role');
      await sql.run('UPDATE team_members SET role = ? WHERE team_id = ? AND user_id = ?', role, teamId, memberUserId);
    },

    async invite(actor, teamId, input) {
      const userId = memberId(actor);
      const { email, role } = input;
      if (!email || !role || typeof email !== 'string') throw new TeamInputError('Email and role are required');
      if (typeof role !== 'string' || !TEAM_ROLES.includes(role)) throw new TeamInputError('Invalid role');
      await teamManager(teamId, userId, 'Only owners and admins can invite members');
      const existingMember = await sql.one(`
        SELECT tm.id FROM team_members tm INNER JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = ? AND u.email = ?
      `, teamId, email);
      if (existingMember) throw new TeamInputError('User is already a team member');
      const pending = await sql.one(`SELECT id FROM team_invitations WHERE team_id = ? AND email = ? AND status = 'pending'`, teamId, email);
      if (pending) throw new TeamInputError('Invitation already sent to this email');

      const invitationId = newId('inv');
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
      await sql.run(`
        INSERT INTO team_invitations (id, team_id, email, role, invited_by, token, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, invitationId, teamId, email, role, userId, token, expiresAt);
      const invitation = invitationRow(sql.dialect, await sql.one('SELECT * FROM team_invitations WHERE id = ?', invitationId));
      const team = await sql.one<{ name: string }>('SELECT name FROM teams WHERE id = ?', teamId);
      const inviter = await sql.one<{ name: string | null; username: string }>('SELECT full_name AS name, username FROM users WHERE id = ?', userId);
      return {
        invitation,
        mail: { to: email, teamName: team?.name ?? null, inviterName: inviter ? (inviter.name || inviter.username) : null, role, token },
      };
    },

    async myInvitations(actor) {
      const email = await accountEmail(memberId(actor));
      return (await sql.all(`
        SELECT ti.*, t.name as team_name, u.full_name as invited_by_name
        FROM team_invitations ti
        INNER JOIN teams t ON ti.team_id = t.id
        INNER JOIN users u ON ti.invited_by = u.id
        WHERE ti.email = ? AND ti.status = 'pending' AND ti.expires_at > ${NOW}
        ORDER BY ti.created_at DESC
      `, email)).map((r) => invitationRow(sql.dialect, r));
    },

    async teamInvitations(actor, teamId) {
      await teamManager(teamId, memberId(actor), 'Only owners and admins can view invitations');
      return (await sql.all(`
        SELECT ti.*, u.full_name as invited_by_name
        FROM team_invitations ti
        INNER JOIN users u ON ti.invited_by = u.id
        WHERE ti.team_id = ? AND ti.status = 'pending'
        ORDER BY ti.created_at DESC
      `, teamId)).map((r) => invitationRow(sql.dialect, r));
    },

    async acceptInvitation(actor, token) {
      const userId = memberId(actor);
      const email = await accountEmail(userId);
      const invitation = await sql.one<any>(`SELECT * FROM team_invitations WHERE token = ? AND email = ? AND status = 'pending'`, token, email);
      if (!invitation) throw new ScopeError(404, 'Invitation not found or already used');
      if (parseStoredTime(invitation.expires_at) < new Date()) {
        await sql.run(`UPDATE team_invitations SET status = 'expired' WHERE id = ?`, invitation.id);
        throw new TeamInputError('Invitation has expired');
      }
      await sql.batch(actor, [
        ['INSERT INTO team_members (id, team_id, user_id, role, invited_by) VALUES (?, ?, ?, ?, ?)',
          newId('member'), invitation.team_id, userId, invitation.role, invitation.invited_by],
        [`UPDATE team_invitations SET status = 'accepted' WHERE id = ?`, invitation.id],
      ]);
      return teamRow(invitation.team_id);
    },

    async cancelInvitation(actor, invitationId) {
      const userId = memberId(actor);
      const invitation = await sql.one<any>('SELECT * FROM team_invitations WHERE id = ?', invitationId);
      if (!invitation) throw new ScopeError(404, 'Invitation not found');
      const email = await accountEmail(userId);
      const isInvitee = invitation.email === email;
      const m = await membership(invitation.team_id, userId);
      const isManager = !!m && ['owner', 'admin'].includes(m.role);
      if (!isInvitee && !isManager) throw new ScopeError(403, 'Not authorized to cancel this invitation');
      await sql.run('UPDATE team_invitations SET status = ? WHERE id = ?', isInvitee ? 'rejected' : 'expired', invitationId);
    },
  };
}

export const sqliteTeams: TeamsRepository = createTeams(sqliteRunner);
