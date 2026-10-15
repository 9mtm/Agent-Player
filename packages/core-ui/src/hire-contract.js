// UI-AGENT-CREATE-01 wire contract: create an agent (role + persona) and set
// its tool permissions. Shared by the browser boundary and the local bridge.
import { validAgentId } from './agent-id.js';
import { traitNames } from './personality-contract.js';

export const roles = ['main', 'manager', 'specialist', 'evaluator'];
export const presets = ['balanced-assistant', 'careful-auditor', 'bold-creative', 'precise-developer', 'strict-evaluator'];
export const dialects = ['ar-IQ', 'ar', 'en', 'de', 'fr', 'es', 'zh', 'ja', 'ko', 'pt-BR', 'ru', 'tr', 'hi'];
export const companySizes = ['solo', 'small', 'medium', 'large'];
export const nameLanguages = ['en', 'ar', 'de', 'fr', 'es', 'zh', 'ja', 'ko', 'pt-BR', 'ru', 'tr', 'hi'];
export const CATALOGUE_PATH = '/api/onboarding/team-catalogue';
export const PLAN_PATH = '/api/onboarding/team-plan';
export const MAX_GRANTS = 500;
export const MAX_AVAILABLE = 2000;

const record = x => !!x && typeof x === 'object' && !Array.isArray(x);
const onlyKeys = (x, keys) => Object.keys(x).every(k => keys.includes(k));
const hidden = /[\u0000-\u001F\u007F-\u009F​-‏‪-‮⁦-⁩]/u;
export const displayName = x => typeof x === 'string' && x.length > 0 && [...x].length <= 60
  && x.normalize('NFKC').replace(/\s+/g, ' ').trim() === x && !hidden.test(x);
export const department = x => typeof x === 'string' && x.length > 0 && x.length <= 64 && x.trim() === x
  && x === x.toLowerCase() && /^[\p{L}\p{N}][\p{L}\p{N} _-]*$/u.test(x);
export const description = x => typeof x === 'string' && x.length <= 500 && !/[\u0000-\u0009\u000B-\u001F\u007F-\u009F‪-‮⁦-⁩]/u.test(x);
export const toolName = x => typeof x === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(x);
const version = x => Number.isSafeInteger(x) && x > 0;
const trait = x => Number.isSafeInteger(x) && x >= 0 && x <= 100;

export function validPersonality(p) {
  if (!record(p) || !onlyKeys(p, ['preset', 'traits', 'dialect']) || !presets.includes(p.preset)) return false;
  if (p.dialect !== undefined && !dialects.includes(p.dialect)) return false;
  if (p.traits === undefined) return true;
  return record(p.traits) && Object.keys(p.traits).length <= traitNames.length
    && Object.entries(p.traits).every(([k, v]) => traitNames.includes(k) && trait(v));
}

/** POST /api/agents body: a role is required; persona is preset-based. */
export function validCreateBody(b) {
  if (!record(b) || !onlyKeys(b, ['name', 'role', 'department', 'description', 'personality'])) return false;
  if (!roles.includes(b.role)) return false;
  if (b.name !== undefined && !displayName(b.name)) return false;
  if (b.department !== undefined && !department(b.department)) return false;
  if (b.description !== undefined && !description(b.description)) return false;
  return b.personality === undefined || validPersonality(b.personality);
}

export function grantsAgentId(path) {
  const m = /^\/api\/agents\/([^/?#]+)\/tool-grants$/.exec(path);
  return m && validAgentId(m[1]) ? m[1] : null;
}

/** PUT /api/agents/:id/tool-grants body: plain tool names only (no scopes from this UI). */
export function validGrantsBody(b) {
  if (!record(b) || Object.keys(b).length !== 2 || !onlyKeys(b, ['grants', 'expectedVersion']) || !version(b.expectedVersion)) return false;
  return Array.isArray(b.grants) && b.grants.length <= MAX_GRANTS && b.grants.every(toolName) && new Set(b.grants).size === b.grants.length;
}

/** POST /api/onboarding/team-plan body: size, 1-12 departments, optional name language. */
export function validPlanBody(b) {
  if (!record(b) || !onlyKeys(b, ['size', 'departments', 'language']) || !companySizes.includes(b.size)) return false;
  if (b.language !== undefined && !nameLanguages.includes(b.language)) return false;
  return Array.isArray(b.departments) && b.departments.length >= 1 && b.departments.length <= 12
    && b.departments.every(department) && new Set(b.departments).size === b.departments.length;
}

export function allowedHire(method, path, body) {
  if (path === CATALOGUE_PATH) return method === 'GET' && body === undefined;
  if (path === PLAN_PATH) return method === 'POST' && validPlanBody(body);
  if (path === '/api/agents') return method === 'POST' && validCreateBody(body);
  if (!grantsAgentId(path)) return false;
  if (method === 'GET') return body === undefined;
  return method === 'PUT' && validGrantsBody(body);
}

/** True when this response belongs to the hire contract (create result or a grants path). */
export function hireRoute(path, status) {
  return path === CATALOGUE_PATH || path === PLAN_PATH || grantsAgentId(path) !== null || (path === '/api/agents' && (status === 201 || status === 400 || status === 403));
}

const fail = () => { throw Error('Invalid hire response'); };
const clip = (x, max) => (typeof x === 'string' ? (x.length > max ? x.slice(0, max) : x) : '');

function createResult(status, body) {
  if (status === 201) {
    const a = record(body) ? body.agent : undefined;
    if (!record(a) || !validAgentId(a.id) || !version(a.version)) fail();
    return displayName(a.name) ? { agent: { id: a.id, name: a.name, version: a.version } } : { agent: { id: a.id, version: a.version, nameUnavailable: true } };
  }
  const code = record(body) ? body.code : undefined;
  if (status === 403 && code === 'read_only_stage') return { code };
  return status === 400 && ['invalid_role', 'invalid_personality'].includes(code) ? { code } : null;
}

function grantsView(agentId, body) {
  if (!record(body) || body.agentId !== agentId || !version(body.version) || !Array.isArray(body.grants) || body.grants.length > MAX_GRANTS) fail();
  const grants = body.grants.map(g => {
    if (!record(g) || !toolName(g.tool)) fail();
    return { tool: g.tool, scoped: g.scopes !== null && g.scopes !== undefined };
  });
  const view = { agentId, version: body.version, grants };
  if (body.available === undefined) return view;
  if (!Array.isArray(body.available) || body.available.length > MAX_AVAILABLE) fail();
  view.available = body.available.filter(t => record(t) && toolName(t.name)).map(t => ({
    name: t.name,
    description: clip(t.description, 300),
    requiresApproval: t.requiresApproval === true,
    allowedByServer: t.allowedByServer !== false,
    execClass: t.execClass === true,
  }));
  return view;
}

function grantsResult(agentId, status, body) {
  if (status === 200) return grantsView(agentId, body);
  const code = record(body) ? body.code : undefined;
  if (status === 409 && code === 'version_conflict') {
    if (!version(body.currentVersion)) fail();
    return { code, currentVersion: body.currentVersion };
  }
  if (status === 403 && code === 'read_only_stage') return { code };
  return status === 400 && code === 'invalid_version' ? { code } : null;
}

/** Project a backend response to the reviewed fields only (never error text). */
function catalogueResult(status, body) {
  if (status !== 200) return null;
  if (!record(body) || !Array.isArray(body.sizes) || !Array.isArray(body.departments) || body.departments.length > 100) fail();
  return {
    sizes: body.sizes.filter(x => record(x) && companySizes.includes(x.id)).map(x => ({ id: x.id, label: clip(x.label, 60) })),
    departments: body.departments.filter(x => record(x) && department(x.id)).map(x => ({ id: x.id, label: clip(x.label, 60), summary: clip(x.summary, 200) })),
  };
}

function planResult(status, body) {
  if (status === 200) {
    if (!record(body) || !companySizes.includes(body.size) || !Array.isArray(body.hires) || body.hires.length > 60) fail();
    return {
      size: body.size,
      hires: body.hires.map(h => {
        if (!record(h) || !department(h.department) || !roles.includes(h.role) || !presets.includes(h.preset) || !displayName(h.name) || !description(h.description)) fail();
        return { department: h.department, departmentLabel: clip(h.departmentLabel, 64), role: h.role, title: clip(h.title, 80), description: h.description, preset: h.preset, name: h.name };
      }),
    };
  }
  const code = record(body) ? body.code : undefined;
  if (status === 403 && code === 'read_only_stage') return { code };
  return status === 400 && code === 'invalid_plan' ? { code } : null;
}

export function hireResponse(path, status, body) {
  if (path === CATALOGUE_PATH) return catalogueResult(status, body);
  if (path === PLAN_PATH) return planResult(status, body);
  if (path === '/api/agents') return createResult(status, body);
  const agentId = grantsAgentId(path);
  if (!agentId) fail();
  return grantsResult(agentId, status, body);
}
