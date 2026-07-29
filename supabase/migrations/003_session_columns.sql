-- Add columns for elapsed time and configurable attempt limits
ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS elapsed_seconds INT NOT NULL DEFAULT 0;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS max_attempts INT NOT NULL DEFAULT 10;
