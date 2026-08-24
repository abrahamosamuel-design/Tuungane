import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

const envStr = fs.readFileSync('c:/Users/USER/Desktop/DATA WORK/Tuungane/backend/.env', 'utf8');
const envObj = dotenv.parse(envStr);

const supabaseUrl = envObj.VITE_SUPABASE_URL || envObj.SUPABASE_URL;
const supabaseKey = envObj.SUPABASE_PUBLISHABLE_KEY || envObj.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: posts, error } = await supabaseAdmin
    .from('timeline_posts')
    .select('id, provider_user_id')
    .is('service_id', null);
    
  console.log('Posts without service:', posts?.length);
  if (posts?.length > 0) {
    const pids = Array.from(new Set(posts.map(p => p.provider_user_id)));
    const { data: services } = await supabaseAdmin
      .from('profile_services')
      .select('id, user_id')
      .in('user_id', pids);
    console.log('Services for these providers:', services);
  }
}

main();
