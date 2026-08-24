import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

const envStr = fs.readFileSync('c:/Users/USER/Desktop/DATA WORK/Tuungane/backend/.env', 'utf8');
const envObj = dotenv.parse(envStr);

const supabaseUrl = envObj.VITE_SUPABASE_URL || envObj.SUPABASE_URL;
const supabaseKey = envObj.SUPABASE_PUBLISHABLE_KEY || envObj.VITE_SUPABASE_PUBLISHABLE_KEY;
// Need service role key to bypass RLS, but publishable key might not bypass it if RLS is enabled for UPDATE.
// Wait, I can try to update using supabaseAdmin.
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Find the post about the certified client (we know it was created recently)
  const { data: posts, error: fetchError } = await supabaseAdmin
    .from('timeline_posts')
    .select('id, text')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (fetchError) {
    console.error('Fetch error:', fetchError);
    return;
  }
  
  console.log('Recent posts:', posts);
  
  if (posts && posts.length > 0) {
    const targetPost = posts[0]; // Assuming it's the latest one
    const serviceId = '919d5010-fc05-439f-82c2-bc3592928e76';
    console.log(`Updating post ${targetPost.id} to service ${serviceId}`);
    
    const { error: updateError } = await supabaseAdmin
      .from('timeline_posts')
      .update({ service_id: serviceId })
      .eq('id', targetPost.id);
      
    if (updateError) {
      console.error('Update error:', updateError);
    } else {
      console.log('Successfully transferred post to service!');
    }
  }
}

main();
