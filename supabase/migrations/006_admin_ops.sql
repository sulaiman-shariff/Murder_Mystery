-- An audit trail for rescues and wipes, so "what did I just do?" has an answer.
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  team_id  UUID REFERENCES teams(id)  ON DELETE SET NULL,
  action   TEXT NOT NULL,
  detail   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_actions_event
  ON admin_actions(event_id, created_at DESC);

-- Service-role only, like every other table (see 004_lock_anon.sql).
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON admin_actions FROM anon;

-- The live monitor sorts a whole event by recent activity.
CREATE INDEX IF NOT EXISTS idx_sessions_event_saved
  ON game_sessions(event_id, last_saved_at DESC);

-- AI health needs to tell a real answer from a fallback. Today a fallback hint
-- is logged byte-identically to a successful one, so a fallback rate would be
-- a guess dressed as a metric.
ALTER TABLE ai_interactions
  ADD COLUMN IF NOT EXISTS outcome TEXT NOT NULL DEFAULT 'ok';
ALTER TABLE ai_interactions DROP CONSTRAINT IF EXISTS ai_interactions_outcome_check;
ALTER TABLE ai_interactions ADD CONSTRAINT ai_interactions_outcome_check
  CHECK (outcome IN ('ok','fallback','unavailable'));
CREATE INDEX IF NOT EXISTS idx_ai_created ON ai_interactions(created_at DESC);
