// Shared strict agent identifier for browser and bridge.
export const validAgentId = x => typeof x === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(x) && !x.includes('..') && !['status', 'name-suggestion'].includes(x.toLowerCase());
