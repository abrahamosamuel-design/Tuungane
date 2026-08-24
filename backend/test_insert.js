import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data, error } = await supabase.from('service_requests').insert({
    customer_id: 'e6b54133-cbe2-46cc-995a-c6de032488a0',
    provider_id: 'ab516ac3-18d8-4fb1-8073-503bb6b23323',
    service_needed: 'Software developement',
    category_slug: 'tech',
    description: 'test',
    quantity: 1,
    price_total: 800000,
    visibility: 'direct'
  });
  console.log(error || "Success!");
}

run();
