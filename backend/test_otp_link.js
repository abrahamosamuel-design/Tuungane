import 'dotenv/config';
import { supabaseAdmin } from './src/lib/supabaseClient.js';

async function testSignInOtp() {
  const email = 'abrahamosamuel@gmail.com';
  console.log(`Sending magic link via signInWithOtp to ${email}...`);

  try {
    const { data, error } = await supabaseAdmin.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: 'http://localhost:8000/recovery/confirm?legacyOwnerId=5487969e-8eb9-42b8-bffb-2efab66b685f'
      }
    });

    if (error) {
      console.error('signInWithOtp error:', error);
    } else {
      console.log('signInWithOtp success:', data);
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

testSignInOtp();
