const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://bvlbirgazcdibhnawrok.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2bGJpcmdhemNkaWJobmF3cm9rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA0MTc1MiwiZXhwIjoyMDk1NjE3NzUyfQ.sZUOGu9rtmwE__azwRf7m4vsxPT6D7xTnbLZKo93Woc';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Testing auth.identities access...');
  const { data, error } = await supabaseAdmin.from('auth.identities').select('*').limit(5);
  console.log('Result:', { data, error });
}

run();
