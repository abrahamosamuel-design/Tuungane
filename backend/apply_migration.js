import pg from 'pg';
import fs from 'fs';

const connectionString = 'postgresql://postgres:Tuungane123%40256@db.bvlbirgazcdibhnawrok.supabase.co:5432/postgres';

const pool = new pg.Pool({
  connectionString,
});

async function run() {
  const sql = fs.readFileSync('supabase/migrations/20260911114000_perf_optimizations.sql', 'utf8');
  console.log('Running migration...');
  await pool.query(sql);
  console.log('Done!');
  process.exit(0);
}
run().catch(console.error);
