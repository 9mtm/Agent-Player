/**
 * Safe fields of an error for server logs (FU-01).
 *
 * CLI and provider errors can carry stderr, the prompt, file paths or tokens
 * in their message, stack, `stderr`, `stdout` or `cmd`. Logs get only the
 * fields below, and each one is checked against a strict shape, so free text
 * never reaches the log.
 */

export interface SafeErrorFields {
  name: string;
  code?: string | number;
  status?: number;
  signal?: string;
  killed?: boolean;
  durationMs?: number;
}

const NAME_RE = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const CODE_RE = /^[A-Z][A-Z0-9_]{1,39}$/;
const SIGNAL_RE = /^SIG[A-Z0-9]{1,16}$/;

function intIn(v: unknown, min: number, max: number): number | undefined {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : undefined;
}

/** Error name, exit code / error code, HTTP status, signal and duration only. */
export function safeErrorFields(err: unknown, startedAt?: number): SafeErrorFields {
  const e = (err && typeof err === 'object' ? err : {}) as Record<string, unknown>;
  const out: SafeErrorFields = {
    name: typeof e.name === 'string' && NAME_RE.test(e.name) ? e.name : 'Error',
  };
  const numCode = intIn(e.code, -1_000_000, 1_000_000);
  if (numCode !== undefined) out.code = numCode;
  else if (typeof e.code === 'string' && CODE_RE.test(e.code)) out.code = e.code;
  const status = intIn(e.status, 100, 599) ?? intIn(e.statusCode, 100, 599);
  if (status !== undefined) out.status = status;
  if (typeof e.signal === 'string' && SIGNAL_RE.test(e.signal)) out.signal = e.signal;
  if (e.killed === true) out.killed = true;
  if (typeof startedAt === 'number') out.durationMs = Math.max(0, Date.now() - startedAt);
  return out;
}
