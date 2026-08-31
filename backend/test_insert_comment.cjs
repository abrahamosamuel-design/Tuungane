const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://bvlbirgazcdibhnawrok.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2bGJpcmdhemNkaWJobmF3cm9rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA0MTc1MiwiZXhwIjoyMDk1NjE3NzUyfQ.sZUOGu9rtmwE__azwRf7m4vsxPT6D7xTnbLZKo93Woc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data, error } = await supabase.from('post_comments').insert({
    post_id: '123e4567-e89b-12d3-a456-426614174000',
    user_id: '123e4567-e89b-12d3-a456-426614174000',
    text: 'Test comment'
  });
  console.log('Error:', error);
  console.log('Data:', data);
}
testInsert();
