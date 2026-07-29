const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

async function run() {
  const migrationArg = process.argv[2];
  const sqlPath = migrationArg
    ? path.resolve(migrationArg)
    : path.join(__dirname, "..", "supabase", "migrations", "001_schema.sql");

  if (!fs.existsSync(sqlPath)) {
    console.error(`Migration file not found: ${sqlPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, "utf-8");

  const client = new Client({ connectionString: DATABASE_URL, connectionTimeoutMillis: 15000 });
  await client.connect();
  console.log("Connected to database");

  try {
    await client.query(sql);
    console.log(`Migration ran successfully: ${path.basename(sqlPath)}`);
  } catch (err) {
    console.error("Migration error:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
