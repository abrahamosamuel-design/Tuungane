const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Tuungane123%40256@db.bvlbirgazcdibhnawrok.supabase.co:5432/postgres' });
async function run() {
  await client.connect();
  const res = await client.query("SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE p.proname = 'start_or_get_conversation';");
  console.log(res.rows[0].pg_get_functiondef);
  await client.end();
}
run();
