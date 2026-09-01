-- Close public access to the tables.
--
-- Migrations 001 and 002 left every table readable with `USING (true)`, so
-- anyone holding the publishable (anon) key — which ships in the browser —
-- could read the whole teams table, PINs included.
--
-- The application never uses the anon key: src/lib/supabase/server-admin.ts is
-- the only Supabase client in the codebase, it runs server-side, and it uses
-- the service-role key, which bypasses RLS entirely. Dropping these policies
-- therefore removes anon access without affecting the game.

DROP POLICY IF EXISTS "Allow public read events" ON events;
DROP POLICY IF EXISTS "Allow public insert teams" ON teams;
DROP POLICY IF EXISTS "Allow public read teams" ON teams;
DROP POLICY IF EXISTS "Allow public update teams" ON teams;
DROP POLICY IF EXISTS "Allow public all game_sessions" ON game_sessions;
DROP POLICY IF EXISTS "Allow public insert ai_interactions" ON ai_interactions;
DROP POLICY IF EXISTS "Allow public read ai_interactions" ON ai_interactions;

DROP POLICY IF EXISTS "Anyone can read events" ON events;
DROP POLICY IF EXISTS "Anyone can register teams" ON teams;
DROP POLICY IF EXISTS "Anyone can read teams" ON teams;
DROP POLICY IF EXISTS "Teams manage own sessions" ON game_sessions;
DROP POLICY IF EXISTS "Service role manages sessions" ON game_sessions;
DROP POLICY IF EXISTS "Service role manages ai_interactions" ON ai_interactions;

-- RLS stays enabled with no policies: anon and authenticated roles get
-- nothing, the service role is unaffected.
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;

-- Belt and braces: remove the table grants the anon role inherits by default.
REVOKE ALL ON events FROM anon;
REVOKE ALL ON teams FROM anon;
REVOKE ALL ON game_sessions FROM anon;
REVOKE ALL ON ai_interactions FROM anon;
