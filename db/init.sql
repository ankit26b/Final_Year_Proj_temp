-- db/init.sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Raw events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text,
  session_id text,
  user_id text,
  ts timestamptz,
  page_url text,
  page_path text,
  event_type text,
  x integer,
  y integer,
  scroll_y integer,
  meta jsonb
);

CREATE INDEX IF NOT EXISTS idx_events_page_path ON events (page_path);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events (ts);

-- Heatmap aggregates table
CREATE TABLE IF NOT EXISTS heatmap_aggregates (
  page_path text NOT NULL,
  grid_x int NOT NULL,
  grid_y int NOT NULL,
  count bigint NOT NULL DEFAULT 0,
  last_updated timestamptz,
  PRIMARY KEY (page_path, grid_x, grid_y)
);
