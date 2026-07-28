const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const PASSWORD = "Code.Club@atria";
const PROJECT_REF = "nylhmyuqgfxobthkntvh";
const HOST = "aws-0-ap-northeast-1.pooler.supabase.com";
const USER = `postgres.${PROJECT_REF}`;

const connectionString = `postgresql://${USER}:${encodeURIComponent(PASSWORD)}@${HOST}:5432/postgres`;

async function run() {
  const sqlPath = path.join(__dirname, "..", "supabase", "migrations", "001_schema.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  const client = new Client({ connectionString, connectionTimeoutMillis: 15000 });
  await client.connect();
  console.log("Connected to Supabase PostgreSQL (ap-northeast-1)");

  try {
    await client.query(sql);
    console.log("Migration ran successfully!");
  } catch (err) {
    console.error("Migration error:", err.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log("Disconnected");
  }
}

run();
