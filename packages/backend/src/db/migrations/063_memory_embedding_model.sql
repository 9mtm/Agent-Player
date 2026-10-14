-- Migration 063: embedding model per stored vector (CORE-06)
-- embedding_model: e.g. 'ollama:qwen3-embedding:0.6b' or 'hash-v2'; NULL =
-- a vector from before CORE-06 (100-dim 'hash-v1'). embedding_dims: length.
-- Vectors of different models are never compared; rows of another model are
-- re-embedded lazily during search or by the owner job
-- POST /api/memory/embeddings/reembed.
-- Date: 2026-10-14

ALTER TABLE memories ADD COLUMN embedding_model TEXT;
ALTER TABLE memories ADD COLUMN embedding_dims INTEGER;
