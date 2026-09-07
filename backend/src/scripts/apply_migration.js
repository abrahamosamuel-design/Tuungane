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

const connectionString = `postgresql://postgres.${projectId}:${encodeURIComponent(dbPass)}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

const client = new pg.Client({
  connectionString,
});

async function run() {
  try {
    await client.connect();
    const sqlPath = path.resolve('supabase', 'migrations', '20260903120000_create_job_opportunities.sql');
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
