const { Client } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

async function run() {
  const client = new Client({ connectionString: DATABASE_URL, connectionTimeoutMillis: 15000 });
  await client.connect();

  const tables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
  );
  console.log("Tables in public schema:");
  tables.rows.forEach((r) => console.log("  -", r.table_name));

  const policies = await client.query(
    "SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename"
  );
  console.log("\nRLS policies:");
  policies.rows.forEach((r) => console.log(`  ${r.tablename}: ${r.policyname}`));

  await client.end();
}

run().catch((e) => console.error("Error:", e.message));
