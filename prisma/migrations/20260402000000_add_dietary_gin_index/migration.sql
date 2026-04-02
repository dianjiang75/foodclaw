-- GIN index on dietary_flags JSONB for faster dietary filter queries
CREATE INDEX IF NOT EXISTS "dishes_dietary_flags_gin_idx" ON "dishes" USING GIN ("dietary_flags" jsonb_path_ops);
