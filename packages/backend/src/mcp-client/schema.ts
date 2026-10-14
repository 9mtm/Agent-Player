/**
 * JSON-schema handling for MCP tool input schemas (M1).
 *
 * An MCP server is third-party code: the schemas it declares are checked and
 * size-limited before they are stored or offered to a model, and every call's
 * arguments are validated against the stored schema before the call is sent.
 *
 * The validator covers the JSON-schema subset tool schemas use in practice:
 * type (incl. type arrays), properties, required, additionalProperties
 * (boolean or schema), items, enum, const, minLength/maxLength,
 * minimum/maximum, exclusiveMinimum/exclusiveMaximum, minItems/maxItems,
 * pattern, anyOf/oneOf/allOf. Unknown keywords are ignored (like any
 * validator). `$ref` is not resolved: a schema that uses it is still stored,
 * but a `$ref` node accepts any value (documented limit).
 */

export const MAX_SCHEMA_BYTES = 32 * 1024;
export const MAX_SCHEMA_DEPTH = 20;
export const MAX_ARGS_BYTES = 256 * 1024;
const MAX_ERRORS = 5;
const MAX_PATTERN_CHARS = 512;

const JSON_TYPES = new Set(['object', 'array', 'string', 'number', 'integer', 'boolean', 'null']);

export class SchemaError extends Error {}

function depthOf(value: unknown, depth = 0): number {
  if (depth > MAX_SCHEMA_DEPTH + 1) return depth;
  if (!value || typeof value !== 'object') return depth;
  let max = depth;
  for (const v of Array.isArray(value) ? value : Object.values(value as object)) {
    max = Math.max(max, depthOf(v, depth + 1));
    if (max > MAX_SCHEMA_DEPTH + 1) break;
  }
  return max;
}

function checkTypes(node: any, path: string): void {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return;
  if (node.type !== undefined) {
    const types = Array.isArray(node.type) ? node.type : [node.type];
    for (const t of types) {
      if (typeof t !== 'string' || !JSON_TYPES.has(t)) throw new SchemaError(`unknown type at ${path || '$'}`);
    }
  }
  if (node.pattern !== undefined) {
    if (typeof node.pattern !== 'string' || node.pattern.length > MAX_PATTERN_CHARS) throw new SchemaError(`invalid pattern at ${path || '$'}`);
    try { new RegExp(node.pattern, 'u'); } catch { throw new SchemaError(`invalid pattern at ${path || '$'}`); }
  }
  if (node.properties !== undefined) {
    if (!node.properties || typeof node.properties !== 'object' || Array.isArray(node.properties)) throw new SchemaError(`properties must be an object at ${path || '$'}`);
    for (const [k, v] of Object.entries(node.properties)) checkTypes(v, `${path}.${k}`);
  }
  if (node.required !== undefined && (!Array.isArray(node.required) || node.required.some((r: unknown) => typeof r !== 'string'))) {
    throw new SchemaError(`required must be an array of strings at ${path || '$'}`);
  }
  if (node.items !== undefined) checkTypes(node.items, `${path}[]`);
  if (node.additionalProperties && typeof node.additionalProperties === 'object') checkTypes(node.additionalProperties, `${path}.*`);
  for (const key of ['anyOf', 'oneOf', 'allOf']) {
    if (node[key] !== undefined) {
      if (!Array.isArray(node[key])) throw new SchemaError(`${key} must be an array at ${path || '$'}`);
      node[key].forEach((s: unknown, i: number) => checkTypes(s, `${path}/${key}[${i}]`));
    }
  }
}

/**
 * Check a tool input schema declared by a server. Returns a deep copy that is
 * safe to store, or throws SchemaError (the tool is then not exposed).
 */
export function sanitizeInputSchema(raw: unknown): Record<string, any> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new SchemaError('inputSchema must be an object');
  let json: string;
  try { json = JSON.stringify(raw); } catch { throw new SchemaError('inputSchema is not JSON'); }
  if (Buffer.byteLength(json, 'utf8') > MAX_SCHEMA_BYTES) throw new SchemaError(`inputSchema is larger than ${MAX_SCHEMA_BYTES} bytes`);
  const copy = JSON.parse(json);
  if (depthOf(copy) > MAX_SCHEMA_DEPTH) throw new SchemaError(`inputSchema is nested deeper than ${MAX_SCHEMA_DEPTH}`);
  if (copy.type !== 'object') throw new SchemaError('inputSchema.type must be "object"');
  checkTypes(copy, '');
  if (copy.properties === undefined) copy.properties = {};
  return copy;
}

function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  return typeof value;
}

function matchesType(value: unknown, t: string): boolean {
  const actual = typeOf(value);
  if (t === 'number') return actual === 'number' || actual === 'integer';
  return actual === t;
}

function equal(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function validateNode(schema: any, value: unknown, path: string, errors: string[], depth: number): void {
  if (errors.length >= MAX_ERRORS) return;
  if (schema === true || schema === undefined || schema === null) return;
  if (schema === false) { errors.push(`${path || '$'} is not allowed`); return; }
  if (typeof schema !== 'object' || depth > MAX_SCHEMA_DEPTH) return;
  const at = path || '$';

  if (schema.type !== undefined) {
    const types: string[] = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesType(value, t))) {
      errors.push(`${at} must be ${types.join(' or ')}`);
      return;
    }
  }
  if (schema.enum !== undefined && Array.isArray(schema.enum) && !schema.enum.some((e: unknown) => equal(e, value))) {
    errors.push(`${at} must be one of the allowed values`);
  }
  if (schema.const !== undefined && !equal(schema.const, value)) errors.push(`${at} must equal the fixed value`);

  if (typeof value === 'string') {
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) errors.push(`${at} is shorter than ${schema.minLength}`);
    if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) errors.push(`${at} is longer than ${schema.maxLength}`);
    // Server-declared patterns only run on short values (limits regex backtracking cost).
    if (typeof schema.pattern === 'string' && schema.pattern.length <= MAX_PATTERN_CHARS && value.length <= 4096) {
      try { if (!new RegExp(schema.pattern, 'u').test(value)) errors.push(`${at} does not match the required pattern`); } catch { /* checked at discovery */ }
    }
  }
  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) errors.push(`${at} must be >= ${schema.minimum}`);
    if (typeof schema.maximum === 'number' && value > schema.maximum) errors.push(`${at} must be <= ${schema.maximum}`);
    if (typeof schema.exclusiveMinimum === 'number' && value <= schema.exclusiveMinimum) errors.push(`${at} must be > ${schema.exclusiveMinimum}`);
    if (typeof schema.exclusiveMaximum === 'number' && value >= schema.exclusiveMaximum) errors.push(`${at} must be < ${schema.exclusiveMaximum}`);
  }
  if (Array.isArray(value)) {
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) errors.push(`${at} needs at least ${schema.minItems} items`);
    if (typeof schema.maxItems === 'number' && value.length > schema.maxItems) errors.push(`${at} allows at most ${schema.maxItems} items`);
    if (schema.items !== undefined && !Array.isArray(schema.items)) {
      value.forEach((v, i) => validateNode(schema.items, v, `${at}[${i}]`, errors, depth + 1));
    }
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const props = (schema.properties && typeof schema.properties === 'object') ? schema.properties : {};
    if (Array.isArray(schema.required)) {
      for (const r of schema.required) if (!Object.prototype.hasOwnProperty.call(obj, r)) errors.push(`${at}.${r} is required`);
    }
    for (const [k, v] of Object.entries(obj)) {
      if (Object.prototype.hasOwnProperty.call(props, k)) validateNode(props[k], v, `${at}.${k}`, errors, depth + 1);
      else if (schema.additionalProperties === false) errors.push(`${at}.${k} is not an allowed property`);
      else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        validateNode(schema.additionalProperties, v, `${at}.${k}`, errors, depth + 1);
      }
    }
  }
  if (Array.isArray(schema.allOf)) for (const s of schema.allOf) validateNode(s, value, path, errors, depth + 1);
  if (Array.isArray(schema.anyOf)) {
    const ok = schema.anyOf.some((s: unknown) => { const e: string[] = []; validateNode(s, value, path, e, depth + 1); return e.length === 0; });
    if (!ok) errors.push(`${at} does not match any allowed form`);
  }
  if (Array.isArray(schema.oneOf)) {
    const n = schema.oneOf.filter((s: unknown) => { const e: string[] = []; validateNode(s, value, path, e, depth + 1); return e.length === 0; }).length;
    if (n !== 1) errors.push(`${at} must match exactly one allowed form`);
  }
}

/** Validate call arguments. Returns a list of short messages (empty = valid). */
export function validateArguments(schema: Record<string, any>, args: unknown): string[] {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return ['arguments must be an object'];
  let size = 0;
  try { size = Buffer.byteLength(JSON.stringify(args), 'utf8'); } catch { return ['arguments are not JSON']; }
  if (size > MAX_ARGS_BYTES) return [`arguments are larger than ${MAX_ARGS_BYTES} bytes`];
  const errors: string[] = [];
  validateNode(schema, args, '', errors, 0);
  return errors.slice(0, MAX_ERRORS);
}
