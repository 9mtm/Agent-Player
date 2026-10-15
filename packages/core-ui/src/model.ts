import { namingKey, validatedDisplayName } from './naming';
export const destinations = ['chat', 'agents', 'memory', 'tasks', 'settings', 'channels'] as const;
export type Destination = typeof destinations[number];
export type Locale = 'en' | 'ar' | 'de';
export type Scenario = 'empty' | 'error' | 'stale';
export type Notice = '' | 'saved' | 'invalid' | 'reserved' | 'exhausted';
export interface State {
  destination: Destination; locale: Locale; theme: 'light' | 'dark'; scenario: Scenario;
  name: string; draft: string; retired: string[]; notice: Notice;
}
export function initialState(): State {
  return { destination: 'chat', locale: 'en', theme: 'light', scenario: 'empty', name: 'Mira', draft: 'Mira', retired: ['Atlas'], notice: '' };
}
const names: Record<Locale, string[]> = { en: ['Nora', 'Lumen', 'Aster'], ar: ['نور', 'سنا', 'مدى'], de: ['Linde', 'Morgen', 'Stern'] };
export const normalized = namingKey;
export type Action = { type: 'navigate'; destination: string } | { type: 'draft'; value: string } | { type: 'generate'; entropy: number } | { type: 'save' | 'cancel' | 'theme' } | { type: 'locale'; value: Locale } | { type: 'scenario'; value: Scenario };
export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'navigate': return destinations.includes(action.destination as Destination) ? { ...state, destination: action.destination as Destination } : state;
    case 'draft': return { ...state, draft: action.value, notice: '' };
    case 'cancel': return { ...state, draft: state.name, notice: '' };
    case 'theme': return { ...state, theme: state.theme === 'light' ? 'dark' : 'light' };
    case 'locale': return { ...state, locale: action.value };
    case 'scenario': return { ...state, scenario: action.value };
    case 'generate': {
      // Invalid entropy is a no-op; randomness is sampled by the event handler.
      if (!Number.isFinite(action.entropy) || action.entropy < 0 || action.entropy >= 1) return state;
      const unavailable = new Set([state.name, state.draft, ...state.retired].map(normalized));
      const eligible = names[state.locale].filter(name => !unavailable.has(normalized(name)));
      if (!eligible.length) return { ...state, notice: 'exhausted' };
      return { ...state, draft: eligible[Math.floor(action.entropy * eligible.length)], notice: '' };
    }
    case 'save': {
      const name = validatedDisplayName(state.draft);
      if (name === null) return { ...state, notice: 'invalid' };
      if (normalized(name) === normalized(state.name)) return { ...state, draft: state.name, notice: '' };
      // Retired names belong to this fixture agent and can be reclaimed.
      return { ...state, name, draft: name, retired: [...state.retired, state.name], notice: 'saved' };
    }
  }
}
export function filterDestinations(query: string, labels: Record<Destination, string>): Destination[] {
  return destinations.filter(key => normalized(labels[key]).includes(normalized(query)));
}
export function isPaletteShortcut(event: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; isComposing: boolean }): boolean {
  return !event.isComposing && !event.altKey && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
}
export function nextResult(index: number, count: number, key: string): number {
  if (!count) return -1;
  return key === 'ArrowDown' ? (index + 1) % count : key === 'ArrowUp' ? (index - 1 + count) % count : index;
}
