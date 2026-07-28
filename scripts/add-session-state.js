const { Client } = require("pg");

const PASSWORD = "Code.Club@atria";
const PROJECT_REF = "nylhmyuqgfxobthkntvh";
const HOST = "aws-0-ap-northeast-1.pooler.supabase.com";
const USER = `postgres.${PROJECT_REF}`;

const connectionString = `postgresql://${USER}:${encodeURIComponent(PASSWORD)}@${HOST}:5432/postgres`;

async function run() {
  const client = new Client({ connectionString, connectionTimeoutMillis: 15000 });
  await client.connect();
  console.log("Connected.");

  await client.query(`
    ALTER TABLE game_sessions
    ADD COLUMN IF NOT EXISTS state JSONB NOT NULL DEFAULT '{}';
  `);

  console.log("state column added to game_sessions");
  await client.end();
}

run().catch((e) => console.error("Error:", e.message));
