-- Migration 062: an approval keeps the scope of the turn that asked (CORE-07b)
-- run_scope = canonical JSON of the non-secret run scope at request time:
-- { memoryDrawers: [...effective drawers of the turn], taskId? }.
-- It is part of the HMAC in params_hash (shown to the owner in the full
-- view), so it cannot be changed after the request. On approve the call
-- re-runs with exactly this scope, intersected with what the policies allow
-- at approval time (never wider). Rows without it keep the old default.
-- Date: 2026-10-14

ALTER TABLE tool_approvals ADD COLUMN run_scope TEXT;
