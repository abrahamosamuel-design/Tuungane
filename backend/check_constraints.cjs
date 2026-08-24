const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Tuungane123%40256@db.bvlbirgazcdibhnawrok.supabase.co:5432/postgres' });
async function run() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name
      FROM
          information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
      WHERE
          tc.table_name = 'reviews' AND tc.constraint_type = 'UNIQUE';
    `);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
