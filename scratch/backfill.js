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
    
  if (error || !posts || posts.length === 0) {
    console.log('No posts to update or error:', error);
    return;
  }
  
  const providerIds = Array.from(new Set(posts.map(p => p.provider_user_id)));
  
  const { data: services } = await supabaseAdmin
    .from('profile_services')
    .select('id, profile_id')
    .in('profile_id', providerIds);
    
  const serviceMap = new Map();
  if (services) {
    services.forEach(s => {
      if (!serviceMap.has(s.profile_id)) {
        serviceMap.set(s.profile_id, s.id);
      }
    });
  }
  
  for (const post of posts) {
    const serviceId = serviceMap.get(post.provider_user_id);
    if (serviceId) {
      await supabaseAdmin
        .from('timeline_posts')
        .update({ service_id: serviceId })
        .eq('id', post.id);
      console.log(`Updated post ${post.id} with service ${serviceId}`);
    } else {
      console.log(`No service found for post ${post.id} belonging to provider ${post.provider_user_id}`);
    }
  }
  
  console.log('Done mapping old posts!');
}

main();
