import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

const envStr = fs.readFileSync('c:/Users/USER/Desktop/DATA WORK/Tuungane/backend/.env', 'utf8');
const envObj = dotenv.parse(envStr);

const supabaseUrl = envObj.VITE_SUPABASE_URL || envObj.SUPABASE_URL;
const supabaseKey = envObj.SUPABASE_PUBLISHABLE_KEY || envObj.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabaseAdmin
    .from('timeline_posts')
    .select('id, text, provider_user_id, service_id, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Recent posts:', data);
  }
}

main();
