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
    .from('timeline_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);
  console.log('Data:', data);
  console.log('Error:', error);
}

test();
