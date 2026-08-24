import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://bvlbirgazcdibhnawrok.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2bGJpcmdhemNkaWJobmF3cm9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNDE3NTIsImV4cCI6MjA5NTYxNzc1Mn0.HTbKsC4wOrzyDwJdWb5KaN5XVC5KDVJskJ1uoqkWaTk';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('start_or_get_conversation', {
    _provider_id: '08620be9-aaac-4ec0-8f1c-bf5813e29abd',
    _service_request_id: '1b52b0e4-f744-4274-addb-af4cb69c5dee',
    _provider_response_id: null
  });
  console.log('Result with null:', data, error);
}
run();
