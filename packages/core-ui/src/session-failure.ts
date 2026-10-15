/** blocked is reserved for a refusal before invoking the wire transport. */
export class SessionFailure extends Error { constructor(readonly code: 'blocked' | 'cancelled' | 'unavailable' | 'deadline') { super(code); } }
