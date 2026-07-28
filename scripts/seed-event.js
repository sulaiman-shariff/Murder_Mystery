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

  // Insert default event
  const { rows } = await client.query(`
    INSERT INTO events (name, event_code, status)
    VALUES ('Murder Mystery Night', 'ATRIA', 'open')
    ON CONFLICT (event_code) DO UPDATE SET status = 'open'
    RETURNING id, name, event_code, status;
  `);

  console.log("Event:", JSON.stringify(rows[0], null, 2));
  await client.end();
  console.log("Done.");
}

run().catch((e) => console.error("Error:", e.message));
