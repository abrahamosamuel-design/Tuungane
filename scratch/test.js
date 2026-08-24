import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

const envStr = fs.readFileSync('c:/Users/USER/Desktop/DATA WORK/Tuungane/backend/.env', 'utf8');
const envObj = dotenv.parse(envStr);

const supabaseUrl = envObj.VITE_SUPABASE_URL || envObj.SUPABASE_URL;
const supabaseKey = envObj.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function test() {
  const id = 'ab516ac3-18d8-4fb1-8073-503bb6b23323';
  console.log('Querying id:', id);
  const { data, error } = await supabaseAdmin
    .from('profile_services')
    .update({ title: "Genesis Car Wash" })
    .eq('id', id)
    .select()
    .single();
  console.log('Data:', data);
  console.log('Error:', error);
}

test();
