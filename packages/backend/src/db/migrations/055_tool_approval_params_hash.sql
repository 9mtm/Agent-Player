-- Migration 055: bind an approval to the exact parameters (S1.3 review fix)
-- params_hash = HMAC-SHA256(params_salt, canonical JSON of the parameters).
-- The owner's approve call must send the hash shown in the full view, and the
-- server recomputes it from the decrypted parameters before running.
-- preview_truncated = 1 when the list preview is lossy.
-- Date: 2026-10-14

ALTER TABLE tool_approvals ADD COLUMN params_hash TEXT;
ALTER TABLE tool_approvals ADD COLUMN params_salt TEXT;
ALTER TABLE tool_approvals ADD COLUMN preview_truncated INTEGER DEFAULT 0;
