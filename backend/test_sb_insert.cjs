const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data, error } = await supabase.from('reviews').upsert({
    provider_user_id: 'ab516ac3-18d8-4fb1-8073-503bb6b23323',
    user_id: 'e6b54133-cbe2-46cc-995a-c6de032488a0',
    rating: 5,
    text: 'test review [MEDIA][]',
    public_profile_id: undefined
  }, { onConflict: "provider_user_id,user_id" });
  console.log("Error:", error);
  console.log("Data:", data);
}

run();
