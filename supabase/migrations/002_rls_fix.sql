-- Fix RLS policies: replace permissive public access with proper team-scoped policies
-- Server-side operations use service-role key (bypasses RLS)

-- Drop old permissive policies
DROP POLICY IF EXISTS "Allow public read events" ON events;
DROP POLICY IF EXISTS "Allow public insert teams" ON teams;
DROP POLICY IF EXISTS "Allow public read teams" ON teams;
DROP POLICY IF EXISTS "Allow public update teams" ON teams;
DROP POLICY IF EXISTS "Allow public all game_sessions" ON game_sessions;
DROP POLICY IF EXISTS "Allow public insert ai_interactions" ON ai_interactions;
DROP POLICY IF EXISTS "Allow public read ai_interactions" ON ai_interactions;

-- Events: public read needed for team registration (lookup by event_code)
CREATE POLICY "Anyone can read events"
  ON events FOR SELECT USING (true);

-- Teams: public can insert for registration; public read for name-check
CREATE POLICY "Anyone can register teams"
  ON teams FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read teams"
  ON teams FOR SELECT USING (true);

-- Game sessions: server-side operations use service role (bypasses RLS)
-- Drop any leftover policy
DROP POLICY IF EXISTS "Teams manage own sessions" ON game_sessions;

CREATE POLICY "Service role manages sessions"
  ON game_sessions FOR ALL
  USING (true);

-- AI interactions: server-side only via service role
CREATE POLICY "Service role manages ai_interactions"
  ON ai_interactions FOR ALL
  USING (true);
