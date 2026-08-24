import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

const envStr = fs.readFileSync('c:/Users/USER/Desktop/DATA WORK/Tuungane/backend/.env', 'utf8');
const envObj = dotenv.parse(envStr);

const supabaseUrl = envObj.VITE_SUPABASE_URL || envObj.SUPABASE_URL;
const supabaseKey = envObj.SUPABASE_PUBLISHABLE_KEY || envObj.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function moveService() {
  const { data: bp, error: e1 } = await supabaseAdmin
    .from('public_profiles')
    .select('owner_id')
    .eq('id', '716d2929-eb36-457b-95c3-761355b1f6b0')
    .single();
    
  if (bp && bp.owner_id) {
    const { data, error } = await supabaseAdmin
      .from('profile_services')
      .update({ 
        user_profile_id: bp.owner_id, 
        profile_id: null 
      })
      .eq('id', '919d5010-fc05-439f-82c2-bc3592928e76');
    console.log('Moved service! Data:', data, 'Error:', error);
  } else {
    console.log('Failed to find owner', e1);
  }
}

moveService();
