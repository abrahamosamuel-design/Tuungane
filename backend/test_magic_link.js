import 'dotenv/config';
import { supabaseAdmin } from './src/lib/supabaseClient.js';

async function testMagicLink() {
  const email = 'abrahamosamuel@gmail.com';
  console.log(`Testing magic link generation for ${email}...`);

  try {
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: 'http://localhost:8000/recovery/confirm?legacyOwnerId=5487969e-8eb9-42b8-bffb-2efab66b685f'
      }
    });

    if (error) {
      console.error('generateLink error:', error);
    } else {
      console.log('generateLink success:', {
        action_link: data.properties?.action_link,
        hashed_token: data.properties?.hashed_token,
        email_otp: data.properties?.email_otp,
        user_id: data.user?.id
      });
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

testMagicLink();
