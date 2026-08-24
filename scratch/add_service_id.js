import pg from 'pg';

const connectionString = 'postgresql://postgres:Tuungane123%40256@db.bvlbirgazcdibhnawrok.supabase.co:5432/postgres';

const pool = new pg.Pool({ connectionString });

async function main() {
  const client = await pool.connect();
  try {
    await client.query('ALTER TABLE timeline_posts ADD COLUMN service_id UUID REFERENCES profile_services(id) ON DELETE CASCADE;');
    console.log('Added service_id to timeline_posts');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

main();
