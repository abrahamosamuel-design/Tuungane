const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Tuungane123%40256@db.bvlbirgazcdibhnawrok.supabase.co:5432/postgres' });
async function run() {
  await client.connect();
  try {
    const res = await client.query(`
      INSERT INTO reviews (provider_user_id, user_id, rating, text, public_profile_id)
      VALUES ('ab516ac3-18d8-4fb1-8073-503bb6b23323', 'e6b54133-cbe2-46cc-995a-c6de032488a0', 5, 'test', null)
      ON CONFLICT (provider_user_id, user_id) DO UPDATE SET text = EXCLUDED.text
    `);
    console.log("Success:", res.rowCount);
  } catch (err) {
    console.error("DB Error:", err);
  }
  await client.end();
}
run();
