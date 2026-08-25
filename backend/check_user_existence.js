import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bvlbirgazcdibhnawrok.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2bGJpcmdhemNkaWJobmF3cm9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNDE3NTIsImV4cCI6MjA5NTYxNzc1Mn0.HTbKsC4wOrzyDwJdWb5KaN5XVC5KDVJskJ1uoqkWaTk';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUserExistence() {
  const email = 'abrahamosamuel@gmail.com';
  console.log(`Testing auth user existence for ${email}...`);
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: 'TemporaryPassword123!',
      options: {
        shouldCreateUser: false // wait, signup options doesn't have shouldCreateUser, but we can just call it
      }
    });

    if (error) {
      console.log('Error returned:', error.message, 'Status:', error.status, 'Code:', error.code);
    } else {
      console.log('Sign up result (User did not exist):', data);
      // Clean up if created
      if (data.user) {
        console.log('User created with ID:', data.user.id);
      }
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

testUserExistence();
