import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

const envStr = fs.readFileSync('c:/Users/USER/Desktop/DATA WORK/Tuungane/backend/.env', 'utf8');
const envObj = dotenv.parse(envStr);

const supabaseUrl = envObj.VITE_SUPABASE_URL || envObj.SUPABASE_URL;
const supabaseKey = envObj.SUPABASE_PUBLISHABLE_KEY || envObj.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabaseAdmin
    .from('profile_services')
    .select('id, title, profile_id, user_profile_id')
    .eq('title', 'Graphics design');
  console.log('Data:', data);
  console.log('Error:', error);
}

test();
