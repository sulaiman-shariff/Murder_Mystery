-- Murder Mystery Game Database Schema
-- Run this in your Supabase SQL editor

-- 1. Events
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    event_code TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'open', 'paused', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    scoring_settings JSONB NOT NULL DEFAULT '{
        "baseScore": 1000,
        "wrongAttemptPenalty": 150,
        "hintPenalty": 100,
        "timePenaltyPerMinute": 10,
        "speedBonusThresholdMinutes": 30,
        "speedBonus": 50,
        "minimumScore": 100
    }',
    current_mystery_limit INT NOT NULL DEFAULT 3
);

-- 2. Teams
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    pin TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(event_id, name)
);

CREATE INDEX IF NOT EXISTS idx_teams_event ON teams(event_id);

-- 3. Game sessions
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    mystery_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_started'
        CHECK (status IN ('not_started', 'in_progress', 'completed', 'failed')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    wrong_attempts INT NOT NULL DEFAULT 0,
    hints_used INT NOT NULL DEFAULT 0,
    score INT NOT NULL DEFAULT 0,
    state JSONB NOT NULL DEFAULT '{}',
    last_saved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_team ON game_sessions(team_id);
CREATE INDEX IF NOT EXISTS idx_sessions_event ON game_sessions(event_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_team_mystery
    ON game_sessions(team_id, mystery_id)
    WHERE status != 'not_started';

-- 4. AI interactions (debug log)
CREATE TABLE IF NOT EXISTS ai_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES game_sessions(id) ON DELETE SET NULL,
    type TEXT NOT NULL
        CHECK (type IN ('murderer_validation', 'motive_validation', 'hint', 'detective_chat')),
    player_input TEXT NOT NULL DEFAULT '',
    ai_output TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_session ON ai_interactions(session_id);

-- 5. Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;

-- 6. Allow public access for game operations
CREATE POLICY "Allow public read events"
    ON events FOR SELECT USING (true);

CREATE POLICY "Allow public insert teams"
    ON teams FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read teams"
    ON teams FOR SELECT USING (true);

CREATE POLICY "Allow public update teams"
    ON teams FOR UPDATE USING (true);

CREATE POLICY "Allow public all game_sessions"
    ON game_sessions FOR ALL USING (true);

CREATE POLICY "Allow public insert ai_interactions"
    ON ai_interactions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read ai_interactions"
    ON ai_interactions FOR SELECT USING (true);
