-- Add full-text search on dishes (name + description)
ALTER TABLE "dishes" ADD COLUMN IF NOT EXISTS "search_vector" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))) STORED;

CREATE INDEX IF NOT EXISTS "dishes_search_vector_idx" ON "dishes" USING GIN ("search_vector");
