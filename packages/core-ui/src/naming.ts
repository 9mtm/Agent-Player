/** CORE-02 suggestion contract. No default transport or persistence is provided. */
export const namingLanguages = ['en', 'ar', 'de', 'fr', 'es', 'zh', 'ja', 'ko', 'pt-BR', 'ru', 'tr', 'hi'] as const;
export type NamingLanguage = typeof namingLanguages[number];
export interface Suggestion { name: string; language: NamingLanguage; exhausted: boolean }
export interface SuggestionRequest {
  readonly method: 'POST';
  readonly path: '/api/agents/name-suggestion';
  readonly body: { readonly language: NamingLanguage; readonly exclude: readonly string[] };
}
/** The future reviewed transport owns authentication, response decoding and origin policy. */
export type NamingTransport = (request: SuggestionRequest) => Promise<{ status: number; body: unknown }>;
export type NamingFailure = 'invalid-input' | 'unauthenticated' | 'forbidden' | 'conflict' | 'malformed-response' | 'unavailable';
export type SuggestionResult = { ok: true; value: Suggestion } | { ok: false; error: NamingFailure };
const isLanguage = (value: unknown): value is NamingLanguage => namingLanguages.includes(value as NamingLanguage);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Display normalization and limits at the inspected CORE-02 revision; not uniqueness enforcement. */
export function validatedDisplayName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (!name || [...name].length > 60 || /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/u.test(name)) return null;
  return name;
}
export function namingKey(name: string): string {
  return name.normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627').replace(/\u0649/g, '\u064A')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

export function createSuggestionAdapter(transport: NamingTransport) {
  return async (language: NamingLanguage, draft: string): Promise<SuggestionResult> => {
    // exclude uses UTF-16 length, unlike the display-name code-point limit.
    if (!isLanguage(language) || typeof draft !== 'string' || draft.length > 200) return { ok: false, error: 'invalid-input' };
    try {
      const response = await transport({ method: 'POST', path: '/api/agents/name-suggestion', body: { language, exclude: [draft] } });
      if (!isRecord(response) || !Number.isInteger(response.status)) return { ok: false, error: 'malformed-response' };
      if (response.status !== 200) {
        const error: NamingFailure = response.status === 401 ? 'unauthenticated' : response.status === 403 ? 'forbidden'
          : response.status === 400 ? 'invalid-input' : response.status === 409 ? 'conflict' : 'unavailable';
        return { ok: false, error };
      }
      const body = response.body;
      if (!isRecord(body) || typeof body.name !== 'string' || validatedDisplayName(body.name) !== body.name
        || body.language !== language || !isLanguage(body.language) || typeof body.exhausted !== 'boolean'
        || namingKey(body.name) === namingKey(draft)) return { ok: false, error: 'malformed-response' };
      return { ok: true, value: { name: body.name, language: body.language, exhausted: body.exhausted } };
    } catch {
      // No automatic retries, and never expose transport exception text.
      return { ok: false, error: 'unavailable' };
    }
  };
}

export interface NamingContext {
  agentId: string;
  language: NamingLanguage;
  savedName: string;
  /** Owner-only UI choice pending Q-20(b). API admits owner/admin; adapter accepts either valid 200. */
  access: 'owner' | 'unavailable';
}
export interface NamingSnapshot extends NamingContext {
  draft: string;
  status: 'idle' | 'loading' | 'suggested' | 'error';
  error: NamingFailure | null;
  exhausted: boolean;
}

/** Independent draft controller; deliberately has no rename/Save operation. */
export function createNamingController(transport: NamingTransport, context: NamingContext) {
  const suggest = createSuggestionAdapter(transport);
  let generation = 0;
  let disposed = false;
  let state: NamingSnapshot = { ...context, draft: context.savedName, status: 'idle', error: null, exhausted: false };
  const invalidate = () => { generation++; state = { ...state, status: 'idle', error: null, exhausted: false }; };
  return {
    snapshot: (): Readonly<NamingSnapshot> => Object.freeze({ ...state }),
    edit(draft: string) { if (!disposed) { invalidate(); state = { ...state, draft }; } },
    cancel() { if (!disposed) { invalidate(); state = { ...state, draft: state.savedName }; } },
    setContext(next: NamingContext) {
      if (disposed) return;
      invalidate();
      state = { ...next, draft: next.savedName, status: 'idle', error: null, exhausted: false };
    },
    dispose() { invalidate(); disposed = true; },
    async generate(): Promise<void> {
      if (disposed) return;
      const ticket = ++generation;
      if (state.access !== 'owner') { state = { ...state, status: 'error', error: 'forbidden', exhausted: false }; return; }
      state = { ...state, status: 'loading', error: null, exhausted: false };
      const result = await suggest(state.language, state.draft);
      if (disposed || ticket !== generation) return;
      state = result.ok
        ? { ...state, draft: result.value.name, status: 'suggested', error: null, exhausted: result.value.exhausted }
        : { ...state, status: 'error', error: result.error, exhausted: false };
    },
  };
}
