const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Tuungane123%40256@db.bvlbirgazcdibhnawrok.supabase.co:5432/postgres' });
async function run() {
  await client.connect();
  try {
    const res = await client.query(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'reviews'::regclass;
    `);
    console.log(res.rows);
  } catch (err) {
    console.error("DB Error:", err);
  }
  await client.end();
}
run();
