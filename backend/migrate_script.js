import pg from 'pg';
const { Client } = pg;

async function migrate() {
  const client = new Client({
    connectionString: "postgresql://postgres:Tuungane123%40256@db.bvlbirgazcdibhnawrok.supabase.co:5432/postgres"
  });
  
  try {
    await client.connect();
    console.log("Connected to DB");
    await client.query("alter table reviews add column if not exists media_urls text[] default '{}'::text[];");
    console.log("Migration successful");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

migrate();
