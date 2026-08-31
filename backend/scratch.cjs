const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Tuungane123%40256@db.bvlbirgazcdibhnawrok.supabase.co:5432/postgres' });
async function run() {
  await client.connect();
  const res = await client.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'post_comments'");
  console.log(res.rows);
  await client.end();
}
run();
