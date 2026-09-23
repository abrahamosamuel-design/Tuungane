import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'c:/Users/USER/Desktop/DATA WORK/Tuungane/backend/.env' });

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data } = await supabaseAdmin
    .from('v_search_services_enriched')
    .select('business_name, cover_url, final_avatar_url, media_urls, category_slug, avatar_url')
    .ilike('business_name', '%Rabboni%');
  console.log("From v_search_services_enriched:", JSON.stringify(data, null, 2));

  const { data: pData } = await supabaseAdmin
    .from('public_profiles')
    .select('id, name, avatar_url, cover_url')
    .ilike('name', '%Rabboni%');
  console.log("From public_profiles:", JSON.stringify(pData, null, 2));
}

run();
