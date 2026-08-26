import 'dotenv/config';
import { supabaseAdmin } from './src/lib/supabaseClient.js';

async function checkAllTables() {
  const { data: sps } = await supabaseAdmin.from('service_profiles').select('user_id, business_name, email, phone');
  console.log('service_profiles count:', sps?.length, sps);

  const { data: bps } = await supabaseAdmin.from('business_pages').select('id, owner_id, name, email, phone');
  console.log('business_pages count:', bps?.length, bps);

  const { data: profs } = await supabaseAdmin.from('profiles').select('id, full_name');
  console.log('profiles count:', profs?.length, profs);

  const { data: pubs } = await supabaseAdmin.from('public_profiles').select('id, owner_id, name, email, phone');
  console.log('public_profiles count:', pubs?.length, pubs);
}

checkAllTables();
