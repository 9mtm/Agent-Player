-- B2.1 smoke test for the PostgreSQL rehearsal schema.
-- Throwaway rows only; run against the rehearsal database, which is dropped afterwards.
-- Every block raises an exception on failure (psql -v ON_ERROR_STOP=1 stops there).

\set QUIET on

-- Shared fixtures
INSERT INTO users (id, email, username, password_hash) VALUES ('smoke-user', 'smoke@example.invalid', 'smoke', 'x');
INSERT INTO agents_config (id, name) VALUES ('smoke-agent', 'Smoke Agent');

-- 1. Version trigger (067/076): bumps on listed columns, not on others, never twice.
DO $$
DECLARE v bigint;
BEGIN
  SELECT version INTO v FROM agents_config WHERE id = 'smoke-agent';
  IF v <> 1 THEN RAISE EXCEPTION 'initial version %, expected 1', v; END IF;

  UPDATE agents_config SET name = 'Smoke Agent 2' WHERE id = 'smoke-agent';
  SELECT version INTO v FROM agents_config WHERE id = 'smoke-agent';
  IF v <> 2 THEN RAISE EXCEPTION 'after name update version %, expected 2', v; END IF;

  UPDATE agents_config SET role = 'tester', department = 'qa' WHERE id = 'smoke-agent';
  SELECT version INTO v FROM agents_config WHERE id = 'smoke-agent';
  IF v <> 3 THEN RAISE EXCEPTION 'after role update (076 columns) version %, expected 3', v; END IF;

  UPDATE agents_config SET api_key = 'not-a-secret', cron_enabled = 1 WHERE id = 'smoke-agent';
  SELECT version INTO v FROM agents_config WHERE id = 'smoke-agent';
  IF v <> 3 THEN RAISE EXCEPTION 'unlisted column bumped the version to %', v; END IF;

  -- CAS style: caller sets the version itself -> WHEN (NEW.version = OLD.version) is false, no double bump
  UPDATE agents_config SET system_prompt = 'p', version = version + 1 WHERE id = 'smoke-agent' AND version = 3;
  SELECT version INTO v FROM agents_config WHERE id = 'smoke-agent';
  IF v <> 4 THEN RAISE EXCEPTION 'CAS update gave version %, expected 4', v; END IF;

  -- same value written to a listed column still counts as an update OF that column (SQLite does the same)
  UPDATE agents_config SET model = model WHERE id = 'smoke-agent';
  SELECT version INTO v FROM agents_config WHERE id = 'smoke-agent';
  IF v <> 5 THEN RAISE EXCEPTION 'no-op update of listed column gave version %, expected 5', v; END IF;

  -- RETURNING sees the bumped value (BEFORE trigger)
  UPDATE agents_config SET emoji = 'x' WHERE id = 'smoke-agent' RETURNING version INTO v;
  IF v <> 6 THEN RAISE EXCEPTION 'RETURNING version %, expected 6', v; END IF;
  RAISE NOTICE 'ok 1: version trigger';
END $$;

-- 2. Unique keys used by CAS / version rows.
DO $$
BEGIN
  INSERT INTO agent_personality_versions (agent_id, version, traits, dialect, source, created_by)
    VALUES ('smoke-agent', 1, '{}', 'ar-IQ', 'seed', 'smoke');
  BEGIN
    INSERT INTO agent_personality_versions (agent_id, version, traits, dialect, source, created_by)
      VALUES ('smoke-agent', 1, '{}', 'ar-IQ', 'seed', 'smoke');
    RAISE EXCEPTION 'duplicate (agent_id, version) accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO agent_personality_versions (agent_id, version, traits, dialect, source, created_by)
      VALUES ('smoke-agent', 0, '{}', 'ar-IQ', 'seed', 'smoke');
    RAISE EXCEPTION 'version 0 accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  INSERT INTO memory_versions (id, memory_id, user_id, drawer_kind, drawer_revision, version, change, created_by)
    VALUES ('mv1', 'm1', 'smoke-user', 'notes', 1, 1, 'create', 'smoke');
  BEGIN
    INSERT INTO memory_versions (id, memory_id, user_id, drawer_kind, drawer_revision, version, change, created_by)
      VALUES ('mv2', 'm1', 'smoke-user', 'notes', 1, 1, 'update', 'smoke');
    RAISE EXCEPTION 'duplicate memory_versions (memory_id, version) accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  -- one active run per task (partial unique index 064)
  INSERT INTO task_runs (id, task_id, agent_id, status, max_steps, max_duration_ms) VALUES ('r1', 't1', 'smoke-agent', 'queued', 5, 1000);
  BEGIN
    INSERT INTO task_runs (id, task_id, agent_id, status, max_steps, max_duration_ms) VALUES ('r2', 't1', 'smoke-agent', 'running', 5, 1000);
    RAISE EXCEPTION 'second active run for one task accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  UPDATE task_runs SET status = 'completed' WHERE id = 'r1';
  INSERT INTO task_runs (id, task_id, agent_id, status, max_steps, max_duration_ms) VALUES ('r2', 't1', 'smoke-agent', 'queued', 5, 1000);

  -- import batch operation key: unique only when not null (partial unique index 071)
  INSERT INTO memory_import_batches (id, user_id, source_kind, expires_at, operation_key) VALUES ('b1', 'smoke-user', 'text', 'x', NULL);
  INSERT INTO memory_import_batches (id, user_id, source_kind, expires_at, operation_key) VALUES ('b2', 'smoke-user', 'text', 'x', NULL);
  INSERT INTO memory_import_batches (id, user_id, source_kind, expires_at, operation_key) VALUES ('b3', 'smoke-user', 'text', 'x', 'k');
  BEGIN
    INSERT INTO memory_import_batches (id, user_id, source_kind, expires_at, operation_key) VALUES ('b4', 'smoke-user', 'text', 'x', 'k');
    RAISE EXCEPTION 'duplicate operation_key accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  -- identity column: default id and explicit id both work
  INSERT INTO paid_usage (day, provider, purpose, status, estimated_cents) VALUES ('2026-10-14', 'p', 'smoke', 'reserved', 1);
  INSERT INTO paid_usage (id, day, provider, purpose, status, estimated_cents) VALUES (1000, '2026-10-14', 'p', 'smoke', 'reserved', 1);
  RAISE NOTICE 'ok 2: unique keys';
END $$;

-- 3. CHECK constraints on proposal statuses and lengths.
DO $$
BEGIN
  INSERT INTO personality_proposals (id, agent_id, base_version, base_traits, proposed_traits, reason, source, review_hash, created_by)
    VALUES ('pp1', 'smoke-agent', 1, '{}', '{}', 'why', 'owner', 'h', 'smoke');
  BEGIN
    UPDATE personality_proposals SET status = 'bogus' WHERE id = 'pp1';
    RAISE EXCEPTION 'personality_proposals bogus status accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO personality_proposals (id, agent_id, base_version, base_traits, proposed_traits, reason, source, review_hash, created_by)
      VALUES ('pp2', 'smoke-agent', 1, '{}', '{}', '', 'owner', 'h', 'smoke');
    RAISE EXCEPTION 'empty reason accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO personality_proposals (id, agent_id, base_version, base_traits, proposed_traits, reason, source, review_hash, created_by)
      VALUES ('pp3', 'smoke-agent', 1, '{}', '{}', 'why', 'stranger', 'h', 'smoke');
    RAISE EXCEPTION 'bad source accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  UPDATE personality_proposals SET status = 'approved', decision_note = 'fine' WHERE id = 'pp1';

  INSERT INTO evolution_proposals (id, agent_id, kind, title, proposed_text, reason, base_hash, review_hash, created_by)
    VALUES ('ep1', 'smoke-agent', 'prompt_append', 't', 'text', 'why', 'b', 'h', 'smoke');
  BEGIN
    UPDATE evolution_proposals SET status = 'done' WHERE id = 'ep1';
    RAISE EXCEPTION 'evolution_proposals bad status accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE evolution_proposals SET source = 'owner' WHERE id = 'ep1';
    RAISE EXCEPTION 'evolution_proposals bad source accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE evolution_proposals SET decision_note = repeat('x', 501) WHERE id = 'ep1';
    RAISE EXCEPTION 'decision_note over 500 accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  INSERT INTO memory_file_proposals (id, user_id, agent_id, drawer_kind, base_hash, base_revision, changes, source, created_by)
    VALUES ('mfp1', 'smoke-user', 'smoke-agent', 'notes', 'h', 0, '[]', 'import', 'smoke');
  BEGIN
    UPDATE memory_file_proposals SET status = 'bogus' WHERE id = 'mfp1';
    RAISE EXCEPTION 'memory_file_proposals bad status accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO tool_approvals (id, status, tool_name, params_encrypted, params_iv, params_tag) VALUES ('ta1', 'maybe', 'x', 'e', 'i', 't');
    RAISE EXCEPTION 'tool_approvals bad status accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  RAISE NOTICE 'ok 3: CHECK constraints';
END $$;

-- 4. FK cascades: deleting the agent removes its versions, proposals and grant profile.
DO $$
DECLARE n bigint;
BEGIN
  INSERT INTO agent_grant_profiles (agent_id, source) VALUES ('smoke-agent', 'smoke');
  INSERT INTO agent_tool_grants (agent_id, tool_name) VALUES ('smoke-agent', 'read_file');
  BEGIN
    INSERT INTO personality_proposals (id, agent_id, base_version, base_traits, proposed_traits, reason, source, review_hash, created_by)
      VALUES ('pp-orphan', 'no-such-agent', 1, '{}', '{}', 'why', 'owner', 'h', 'smoke');
    RAISE EXCEPTION 'proposal for a missing agent accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  DELETE FROM agents_config WHERE id = 'smoke-agent';
  SELECT (SELECT count(*) FROM agent_personality_versions WHERE agent_id = 'smoke-agent')
       + (SELECT count(*) FROM personality_proposals WHERE agent_id = 'smoke-agent')
       + (SELECT count(*) FROM evolution_proposals WHERE agent_id = 'smoke-agent')
       + (SELECT count(*) FROM agent_grant_profiles WHERE agent_id = 'smoke-agent')
       + (SELECT count(*) FROM agent_tool_grants WHERE agent_id = 'smoke-agent') INTO n;
  IF n <> 0 THEN RAISE EXCEPTION '% rows left after deleting the agent', n; END IF;

  -- users -> notifications cascade, audit_logs SET NULL
  INSERT INTO notifications (user_id, title) VALUES ('smoke-user', 'hi');
  INSERT INTO audit_logs (event_type, event_category, user_id) VALUES ('smoke', 'test', 'smoke-user');
  DELETE FROM users WHERE id = 'smoke-user';
  IF EXISTS (SELECT 1 FROM notifications WHERE user_id = 'smoke-user') THEN RAISE EXCEPTION 'notification not cascaded'; END IF;
  IF NOT EXISTS (SELECT 1 FROM audit_logs WHERE event_type = 'smoke' AND user_id IS NULL) THEN RAISE EXCEPTION 'audit_logs.user_id not set null'; END IF;

  -- task_runs -> steps cascade
  INSERT INTO task_run_steps (run_id, step_index, kind, idempotency_key, status) VALUES ('r2', 0, 'model', 'k-r2-0', 'started');
  DELETE FROM task_runs WHERE id = 'r2';
  IF EXISTS (SELECT 1 FROM task_run_steps WHERE run_id = 'r2') THEN RAISE EXCEPTION 'task_run_steps not cascaded'; END IF;
  RAISE NOTICE 'ok 4: FK cascades';
END $$;

-- 5. Text timestamp defaults keep the SQLite string formats.
DO $$
DECLARE a text; b text;
BEGIN
  INSERT INTO used_agent_names (name_key, name, agent_id, reason) VALUES ('smoke', 'Smoke', 'x', 'create') RETURNING reserved_at INTO a;
  IF a !~ '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$' THEN RAISE EXCEPTION 'datetime(now) format: %', a; END IF;
  INSERT INTO memory_retention_runs (id, user_id, actor, result) VALUES ('rr1', 'u', 'smoke', '{}') RETURNING created_at INTO b;
  IF b !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$' THEN RAISE EXCEPTION 'strftime ISO format: %', b; END IF;
  RAISE NOTICE 'ok 5: text timestamp formats (% / %)', a, b;
END $$;

-- 6. Random hex ids.
DO $$
DECLARE a text; b text;
BEGIN
  INSERT INTO users (id, email, username, password_hash) VALUES ('smoke-user-2', 's2@example.invalid', 'smoke2', 'x');
  INSERT INTO notifications (user_id, title) VALUES ('smoke-user-2', 'x') RETURNING id INTO a;
  INSERT INTO user_avatars (user_id) VALUES ('smoke-user-2') RETURNING id INTO b;
  IF a !~ '^[0-9a-f]{16}$' THEN RAISE EXCEPTION 'randomblob(8) id: %', a; END IF;
  IF b !~ '^[0-9a-f]{32}$' THEN RAISE EXCEPTION 'randomblob(16) id: %', b; END IF;
  RAISE NOTICE 'ok 6: random hex ids';
END $$;

\echo smoke: all checks passed
