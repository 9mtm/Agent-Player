/**
 * Credentials repository (B1-core). Scope rules (S0-Q.14/16, scope.ts):
 *
 *   list / get / maskedValue / test / update / delete
 *       owner: every credential (own, unowned system ones, other users' -
 *       values only ever masked, and every touch of another user's
 *       credential is audited here); admin: only their own; others refused.
 *       Out of scope -> 404 'Credential not found'.
 *   create                    owner/admin; always owned by the actor
 *   exportBackup / importBackup
 *       own credentials, plus unowned system ones for the owner; another
 *       user's ciphertext never leaves and is never overwritten
 *   saveOwnByName             an agent run (credentials_save tool) or a
 *                             member: create/replace a credential of the
 *                             actor's OWN user by name; never another user's
 *
 * Plain users, guests, channel turns: refused (the route tier is owner/admin).
 * Decrypted values never leave this layer except to server code that needs
 * them (credentials/authority.ts); this repository returns masked hints only.
 *
 * One implementation for both drivers (B2.2b-2): createCredentials(deps)
 * over the credential manager/storage of a driver (credentials/manager.ts,
 * storage.ts) and that driver's audit repository. sqliteCredentials here,
 * pgCredentials in repositories/pg/credentials.ts. The cross-user audit
 * entry is awaited, so on PostgreSQL it joins an open transaction (pgAudit
 * writes it in a SAVEPOINT) instead of running after it ended.
 */

import { randomUUID } from 'node:crypto';
import type { Actor } from './actor.js';
import { ScopeError, MSG, isOwner, requireActor, requireAdmin, requireOwnUser } from './scope.js';
import { sqliteAudit, type AuditRepository, type RequestMeta } from './audit.js';
import { credentialManagerFor, type CredentialManager } from '../credentials/manager.js';
import { credentialStorageFor, type CredentialStorage } from '../credentials/storage.js';
import { maskSecret } from '../credentials/secret-mask.js';
import type { CreateCredentialRequest, Credential, CredentialType, UpdateCredentialRequest } from '../credentials/types.js';
import type { AuditEventType } from '../services/audit-logger.js';

const NOT_FOUND = 'Credential not found';

/** Fields a backup (export/import) may carry; built from this allowlist only. */
export const BACKUP_FIELDS = [
  'id', 'name', 'type', 'encryptedValue', 'iv', 'authTag', 'description', 'skillId',
  'userId', 'refreshToken', 'expiresAt', 'scopes', 'createdAt', 'updatedAt', 'lastUsed',
] as const;

export function pickBackupFields(source: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const key of BACKUP_FIELDS) if (source[key] !== undefined) out[key] = source[key];
  return out;
}

/** Owner: every credential; admin: own only. */
function inScope(actor: Actor, ownerId: string | null | undefined): boolean {
  if (actor.kind === 'system' || isOwner(actor)) return true;
  return !!ownerId && ownerId === actor.userId;
}

/** Ciphertext the actor may export/overwrite: own, plus unowned for the owner. */
function isBackupScope(actor: Actor, ownerId: string | null | undefined): boolean {
  if (ownerId) return ownerId === actor.userId;
  return actor.kind === 'system' || isOwner(actor);
}

function isOtherUsers(actor: Actor, ownerId: string | null | undefined): boolean {
  return !!ownerId && ownerId !== actor.userId;
}

/** Audit the owner's access to other users' credentials (ids only, never names or values). */
async function auditCrossUser(
  audit: AuditRepository,
  actor: Actor,
  meta: RequestMeta | undefined,
  event: Extract<AuditEventType, `data.${string}`>,
  action: string,
  credentials: Array<{ id: string; userId?: string | null }>,
): Promise<void> {
  const others = credentials.filter((c) => isOtherUsers(actor, c.userId));
  if (others.length === 0) return;
  await audit.record(actor, {
    event_type: event,
    event_category: event === 'data.read' || event === 'data.export' ? 'data_access' : 'data_modification',
    severity: event === 'data.delete' ? 'warning' : 'info',
    resource_type: 'credential',
    resource_id: others.length === 1 ? others[0].id : undefined,
    action: `credentials.${action}.other_user`,
    success: true,
    metadata: {
      count: others.length,
      credentialIds: others.map((c) => c.id),
      ownerUserIds: [...new Set(others.map((c) => c.userId))],
    },
  }, meta);
}

export interface CredentialsRepository {
  list(actor: Actor | null | undefined, filter?: { skillId?: string }, meta?: RequestMeta): Promise<Credential[]>;
  /** auditAs: action name of the cross-user audit entry ('get'); null = no entry (a later call audits). */
  get(actor: Actor | null | undefined, id: string, meta?: RequestMeta, auditAs?: string | null): Promise<Credential>;
  maskedValue(actor: Actor | null | undefined, id: string): Promise<string>;
  test(actor: Actor | null | undefined, id: string, meta?: RequestMeta): Promise<boolean>;
  create(actor: Actor | null | undefined, input: CreateCredentialRequest): Promise<Credential>;
  update(actor: Actor | null | undefined, id: string, updates: UpdateCredentialRequest, meta?: RequestMeta): Promise<Credential>;
  delete(actor: Actor | null | undefined, id: string, meta?: RequestMeta): Promise<void>;
  exportBackup(actor: Actor | null | undefined): Promise<Record<string, any>[]>;
  importBackup(actor: Actor | null | undefined, raw: unknown[]): Promise<number>;
  saveOwnByName(
    actor: Actor | null | undefined,
    input: { name: string; type: CredentialType; value: string; description?: string; skillId?: string },
  ): Promise<{ created: boolean; credential: Credential }>;
}

/** What the repository runs on: one driver's manager, storage and audit. */
export interface CredentialsDeps {
  manager: () => CredentialManager;
  storage: () => CredentialStorage;
  audit: AuditRepository;
}

/** The credentials repository over one driver's manager/storage/audit. */
export function createCredentials(deps: CredentialsDeps): CredentialsRepository {
  const { manager, audit } = deps;
  const getCredentialStorage = deps.storage;

  async function scoped(a: Actor, id: string): Promise<Credential> {
    const c = await manager().get(id);
    if (!c || !inScope(a, c.userId)) throw new ScopeError(404, NOT_FOUND);
    return c;
  }

  return {
    async list(actor, filter = {}, meta) {
      const a = requireAdmin(actor);
      let rows: Credential[];
      if (filter.skillId) rows = (await manager().listBySkill(filter.skillId)).filter((c) => inScope(a, c.userId));
      else if (a.kind === 'system' || isOwner(a)) rows = await getCredentialStorage().getAll();
      else rows = await manager().list(a.userId);
      await auditCrossUser(audit, a, meta, 'data.read', 'list', rows);
      return rows;
    },

    async get(actor, id, meta, auditAs = 'get') {
      const a = requireAdmin(actor);
      const c = await scoped(a, id);
      if (auditAs) await auditCrossUser(audit, a, meta, 'data.read', auditAs, [c]);
      return c;
    },

    async maskedValue(actor, id) {
      const a = requireAdmin(actor);
      const c = await scoped(a, id);
      return maskSecret(await manager().getValue(c.id));
    },

    async test(actor, id, meta) {
      const a = requireAdmin(actor);
      const c = await scoped(a, id);
      await auditCrossUser(audit, a, meta, 'data.read', 'test', [c]);
      return manager().test(c.id);
    },

    async create(actor, input) {
      const a = requireAdmin(actor);
      // The owner is always the actor; an input userId is ignored (S0-Q.14).
      return manager().create({ ...input, userId: a.userId });
    },

    async update(actor, id, updates, meta) {
      const a = requireAdmin(actor);
      const existing = await scoped(a, id);
      await manager().update(id, updates);
      await auditCrossUser(audit, a, meta, 'data.update', 'update', [existing]);
      return (await manager().get(id))!;
    },

    async delete(actor, id, meta) {
      const a = requireAdmin(actor);
      const existing = await scoped(a, id);
      await manager().delete(id);
      await auditCrossUser(audit, a, meta, 'data.delete', 'delete', [existing]);
    },

    async exportBackup(actor) {
      const a = requireAdmin(actor);
      const rows = a.kind === 'system' || isOwner(a) ? await getCredentialStorage().getAll() : await manager().list(a.userId);
      return rows.filter((c) => isBackupScope(a, c.userId)).map((c) => pickBackupFields(c as any));
    },

    async importBackup(actor, credentials) {
      const a = requireAdmin(actor);
      // Imported credentials land in the actor's backup scope: own, or (owner
      // only) unowned system ones. An id outside that scope gets a new id
      // instead of overwriting someone else's credential (storage replaces by id).
      const prepared: any[] = [];
      for (const raw of credentials) {
        if (!raw || typeof raw !== 'object') continue;
        const c: any = pickBackupFields(raw as Record<string, any>);
        c.userId = isOwner(a) && !c.userId ? undefined : a.userId;
        const existing = typeof c.id === 'string' && c.id ? await manager().get(c.id) : null;
        if (!c.id || typeof c.id !== 'string' || (existing && !isBackupScope(a, existing.userId))
          || (existing && (existing.userId || undefined) !== c.userId)) c.id = randomUUID();
        for (const key of ['createdAt', 'updatedAt', 'expiresAt', 'lastUsed']) {
          if (typeof c[key] === 'string') c[key] = new Date(c[key]);
        }
        if (!(c.createdAt instanceof Date)) c.createdAt = new Date();
        if (!(c.updatedAt instanceof Date)) c.updatedAt = new Date();
        prepared.push(c);
      }
      return manager().import(prepared);
    },

    async saveOwnByName(actor, input) {
      const a = requireActor(actor);
      if (a.kind === 'system') throw new ScopeError(403, 'A credential needs a user');
      const own = requireOwnUser(a);
      if (!own.userId) throw new ScopeError(403, MSG.agent);
      const existing = await manager().getByName(input.name, own.userId);
      if (existing) {
        await manager().update(existing.id, { value: input.value, description: input.description || existing.description });
        return { created: false, credential: (await manager().get(existing.id)) ?? existing };
      }
      const credential = await manager().create({
        name: input.name,
        type: input.type,
        value: input.value,
        description: input.description || undefined,
        skillId: input.skillId,
        userId: own.userId,
      });
      return { created: true, credential };
    },
  };
}

export const sqliteCredentials: CredentialsRepository = createCredentials({
  manager: () => credentialManagerFor('sqlite'),
  storage: () => credentialStorageFor('sqlite'),
  audit: sqliteAudit,
});
