const { Client } = require('pg');

async function run() {
  const connectionString = 'postgresql://postgres:Tuungane123%40256@db.bvlbirgazcdibhnawrok.supabase.co:5432/postgres';
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to db');
    
    // Find orphaned identities
    const res = await client.query('SELECT id, provider_id, user_id, identity_data FROM auth.identities WHERE user_id NOT IN (SELECT id FROM auth.users)');
    console.log('Orphaned identities:', res.rows.length);
    
    for (const row of res.rows) {
      console.log('Deleting orphaned identity:', row);
      await client.query('DELETE FROM auth.identities WHERE id = $1', [row.id]);
    }
    
    console.log('Done');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
