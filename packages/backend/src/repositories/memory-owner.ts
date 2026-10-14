/**
 * The owner's memory maintenance (B1.6, part of the memory repository):
 * weekly summary (CORE-05), retention and forget-all (CORE-07), embedding
 * status / re-embed (CORE-06) and the safe import pipeline (CLI-02).
 *
 * Scope: the owner account only, always on the owner's own memory (system
 * code may act too). Admins, users, guests, agent runs and channel turns are
 * refused (403; no actor 401). Input errors stay the modules' own errors
 * (RetentionInputError, ImportError, DrawerInputError) for the routes.
 */

import type { Actor } from './actor.js';
import { memoryOwner } from './memory-actor.js';
import { buildWeeklyDigest, latestWeeklySummary, listWeeklySummaries, renderDigest, runWeeklySummary } from '../memory/weekly-summary.js';
import { forgetAll } from '../memory/forget.js';
import type { DrawerRef } from '../memory/drawers.js';
import { embeddingStatus, reembedUserMemories } from '../memory/reembed.js';
import { getRetentionConfig, listRetentionRuns, runRetention, setRetentionConfig } from '../memory/retention.js';
import {
  cancelImport,
  commitPreview,
  createPreview,
  getImportSettings,
  getPreview,
  listImports,
  revisePreview,
  setImportSettings,
} from '../memory/import/pipeline.js';

type Ret<F extends (...args: any) => any> = Awaited<ReturnType<F>>;
type A = Actor | null | undefined;

export interface MemoryOwnerRepository {
  /** Latest stored summary (or a fresh, unstored digest) + history. */
  weeklySummary(actor: A): Promise<{ stored: boolean; summary: unknown; history: unknown[] }>;
  runWeeklySummary(actor: A): Promise<Ret<typeof runWeeklySummary>>;
  embeddingStatus(actor: A): Promise<Ret<typeof embeddingStatus>>;
  reembed(actor: A, limit?: number): Promise<Ret<typeof reembedUserMemories>>;
  forgetAll(actor: A, drawer: DrawerRef | null): Promise<Ret<typeof forgetAll>>;
  retention(actor: A): Promise<{ config: Ret<typeof getRetentionConfig>; runs: any[] }>;
  setRetention(actor: A, input: Record<string, unknown>): Promise<Ret<typeof setRetentionConfig>>;
  runRetention(actor: A, dryRun: boolean): Promise<Ret<typeof runRetention>>;
  importSettings(actor: A): Promise<Ret<typeof getImportSettings>>;
  setImportSettings(actor: A, input: Record<string, unknown>): Promise<Ret<typeof setImportSettings>>;
  importPreview(actor: A, input: Parameters<typeof createPreview>[1]): Promise<Ret<typeof createPreview>>;
  imports(actor: A): Promise<any[]>;
  importView(actor: A, id: string, version?: number): Promise<Ret<typeof getPreview>>;
  reviseImport(actor: A, id: string, input: Parameters<typeof revisePreview>[2]): Promise<Ret<typeof revisePreview>>;
  commitImport(actor: A, id: string, input: Parameters<typeof commitPreview>[2]): Promise<Ret<typeof commitPreview>>;
  cancelImport(actor: A, id: string): Promise<Ret<typeof cancelImport>>;
}

export const sqliteMemoryOwner: MemoryOwnerRepository = {
  async weeklySummary(actor) {
    const ownerId = memoryOwner(actor);
    const latest = latestWeeklySummary(ownerId);
    const history = listWeeklySummaries(ownerId).map((r) => ({ id: r.id, periodStart: r.periodStart, periodEnd: r.periodEnd, totals: r.digest.totals }));
    if (latest) return { stored: true, summary: latest, history };
    const digest = buildWeeklyDigest(ownerId);
    return { stored: false, summary: { digest, text: renderDigest(digest), modelText: null, model: null }, history };
  },

  async runWeeklySummary(actor) {
    const ownerId = memoryOwner(actor);
    return runWeeklySummary(ownerId, { actor: ownerId });
  },

  async embeddingStatus(actor) {
    return embeddingStatus(memoryOwner(actor));
  },

  async reembed(actor, limit) {
    return reembedUserMemories(memoryOwner(actor), { limit });
  },

  async forgetAll(actor, drawer) {
    const ownerId = memoryOwner(actor);
    return forgetAll(ownerId, ownerId, drawer);
  },

  async retention(actor) {
    const ownerId = memoryOwner(actor);
    return { config: getRetentionConfig(ownerId), runs: listRetentionRuns(ownerId) };
  },

  async setRetention(actor, input) {
    const ownerId = memoryOwner(actor);
    return setRetentionConfig(ownerId, input, ownerId);
  },

  async runRetention(actor, dryRun) {
    const ownerId = memoryOwner(actor);
    return runRetention(ownerId, { dryRun, actor: ownerId });
  },

  async importSettings(actor) {
    return getImportSettings(memoryOwner(actor));
  },

  async setImportSettings(actor, input) {
    return setImportSettings(memoryOwner(actor), input);
  },

  async importPreview(actor, input) {
    return createPreview(memoryOwner(actor), input);
  },

  async imports(actor) {
    return listImports(memoryOwner(actor));
  },

  async importView(actor, id, version) {
    return getPreview(memoryOwner(actor), id, version);
  },

  async reviseImport(actor, id, input) {
    return revisePreview(memoryOwner(actor), id, input);
  },

  async commitImport(actor, id, input) {
    return commitPreview(memoryOwner(actor), id, input);
  },

  async cancelImport(actor, id) {
    return cancelImport(memoryOwner(actor), id);
  },
};
