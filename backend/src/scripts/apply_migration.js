import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const dbPass = process.env.DATABASE_PASSWORD;
const projectId = process.env.SUPABASE_PROJECT_ID;
if (!dbPass || !projectId) {
  console.error("Missing DATABASE_PASSWORD or SUPABASE_PROJECT_ID");
  process.exit(1);
}

const connectionString = `postgresql://postgres:${encodeURIComponent(dbPass)}@db.${projectId}.supabase.co:5432/postgres`;

const client = new pg.Client({
  connectionString,
});

async function run() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error("Please provide a path to the SQL file.");
    process.exit(1);
  }

  try {
    await client.connect();
    const sqlPath = path.resolve(fileArg);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query(sql);
    console.log("Migration applied successfully!");
  } catch (error) {
    console.error("Error applying migration:", error);
  } finally {
    await client.end();
  }
}

run();
