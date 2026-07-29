const { Client } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

async function run() {
  const client = new Client({ connectionString: DATABASE_URL, connectionTimeoutMillis: 15000 });
  await client.connect();
  console.log("Connected.");

  const eventCode = process.env.EVENT_CODE || "ATRIA";
  const eventName = process.env.EVENT_NAME || "Murder Mystery Night";

  const { rows } = await client.query(
    `INSERT INTO events (name, event_code, status)
     VALUES ($1, $2, 'open')
     ON CONFLICT (event_code) DO UPDATE SET status = 'open'
     RETURNING id, name, event_code, status`,
    [eventName, eventCode]
  );

  console.log("Event:", JSON.stringify(rows[0], null, 2));
  await client.end();
  console.log("Done.");
}

run().catch((e) => console.error("Error:", e.message));
