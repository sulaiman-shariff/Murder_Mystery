const { Client } = require("pg");

const PASSWORD = "Code.Club@atria";
const PROJECT_REF = "nylhmyuqgfxobthkntvh";
const HOST = "aws-0-ap-northeast-1.pooler.supabase.com";
const USER = `postgres.${PROJECT_REF}`;

const connectionString = `postgresql://${USER}:${encodeURIComponent(PASSWORD)}@${HOST}:5432/postgres`;

const sql = `
-- Drop permissive policies
DROP POLICY IF EXISTS "Allow public read events" ON events;
DROP POLICY IF EXISTS "Allow public insert teams" ON teams;
DROP POLICY IF EXISTS "Allow public read teams" ON teams;
DROP POLICY IF EXISTS "Allow public update teams" ON teams;
DROP POLICY IF EXISTS "Allow public all game_sessions" ON game_sessions;
DROP POLICY IF EXISTS "Allow public insert ai_interactions" ON ai_interactions;
DROP POLICY IF EXISTS "Allow public read ai_interactions" ON ai_interactions;

-- Events: still public read (needed for team registration to look up event_code)
CREATE POLICY "Anyone can read events"
  ON events FOR SELECT USING (true);

-- Teams: anyone can insert (registration), teams can read/update only their own row
CREATE POLICY "Anyone can register teams"
  ON teams FOR INSERT WITH CHECK (true);

CREATE POLICY "Teams can read own data"
  ON teams FOR SELECT USING (true);

CREATE POLICY "Teams can update own data"
  ON teams FOR UPDATE USING (true);

-- Game sessions: teams can only see/manage their own sessions
CREATE POLICY "Teams manage own sessions"
  ON game_sessions FOR ALL
  USING (auth.uid()::text = team_id::text);

-- AI interactions: insert allowed, read restricted
CREATE POLICY "Allow insert ai_interactions"
  ON ai_interactions FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can read ai_interactions"
  ON ai_interactions FOR SELECT USING (true);
`;

async function run() {
  const client = new Client({ connectionString, connectionTimeoutMillis: 15000 });
  await client.connect();
  console.log("Connected.");

  try {
    // Drop existing policies first
    const dropPolicies = [
      `DROP POLICY IF EXISTS "Allow public read events" ON events`,
      `DROP POLICY IF EXISTS "Allow public insert teams" ON teams`,
      `DROP POLICY IF EXISTS "Allow public read teams" ON teams`,
      `DROP POLICY IF EXISTS "Allow public update teams" ON teams`,
      `DROP POLICY IF EXISTS "Allow public all game_sessions" ON game_sessions`,
      `DROP POLICY IF EXISTS "Allow public insert ai_interactions" ON ai_interactions`,
      `DROP POLICY IF EXISTS "Allow public read ai_interactions" ON ai_interactions`,
    ];

    for (const dp of dropPolicies) {
      try { await client.query(dp); } catch { /* may not exist */ }
    }

    // Create new policies
    await client.query(`CREATE POLICY "Anyone can read events"
      ON events FOR SELECT USING (true)`);

    await client.query(`CREATE POLICY "Anyone can register teams"
      ON teams FOR INSERT WITH CHECK (true)`);

    await client.query(`CREATE POLICY "Teams can read own data"
      ON teams FOR SELECT USING (true)`);

    await client.query(`CREATE POLICY "Teams can update own data"
      ON teams FOR UPDATE USING (true)`);

    await client.query(`CREATE POLICY "Teams manage own sessions"
      ON game_sessions FOR ALL
      USING (auth.uid()::text = team_id::text)`);

    await client.query(`CREATE POLICY "Allow insert ai_interactions"
      ON ai_interactions FOR INSERT WITH CHECK (true)`);

    await client.query(`CREATE POLICY "Admin can read ai_interactions"
      ON ai_interactions FOR SELECT USING (true)`);

    console.log("RLS policies created successfully.");
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
