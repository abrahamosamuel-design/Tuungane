import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://bvlbirgazcdibhnawrok.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2bGJpcmdhemNkaWJobmF3cm9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNDE3NTIsImV4cCI6MjA5NTYxNzc1Mn0.HTbKsC4wOrzyDwJdWb5KaN5XVC5KDVJskJ1uoqkWaTk'; // Wait, that's the anon key. Is there a service role key in backend/.env? Let's check backend/.env. No, only publishable key.

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Let's test inserting a mock review
  const { data, error } = await supabase.from('reviews').upsert({
    provider_user_id: '123e4567-e89b-12d3-a456-426614174000', // random valid UUID
    user_id: '123e4567-e89b-12d3-a456-426614174000',
    rating: 5,
    text: 'test'
  }, { onConflict: 'provider_user_id,user_id' });
  console.log('Result:', { data, error });
}
run();
