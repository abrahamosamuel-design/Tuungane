import 'dotenv/config';
import { supabaseAdmin } from './src/lib/supabaseClient.js';

async function checkAccount() {
  const email = 'abrahamosamuel@gmail.com';
  console.log(`Checking account: ${email}`);

  // 1. Check in auth.users
  const { data: usersData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
  if (userError) {
    console.error('Error listing auth users:', userError);
  } else {
    const user = usersData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (user) {
      console.log('Found in auth.users:', {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        app_metadata: user.app_metadata,
        user_metadata: user.user_metadata,
        identities: user.identities
      });
    } else {
      console.log('NOT found in auth.users');
    }
  }

  // 2. Check in public.profiles
  const { data: profile, error: profErr } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .ilike('email', email);
  console.log('Found in profiles by email:', profile, profErr);

  // 3. Check in public_profiles
  const { data: pubProf, error: pubErr } = await supabaseAdmin
    .from('public_profiles')
    .select('*')
    .ilike('email', email);
  console.log('Found in public_profiles by email:', pubProf, pubErr);

  // 4. Check in service_profiles by email
  const { data: sp, error: spErr } = await supabaseAdmin
    .from('service_profiles')
    .select('*')
    .ilike('email', email);
  console.log('Found in service_profiles by email:', sp, spErr);

  // 5. Check all users in public_profiles with legacy_source
  const { data: legacyProfiles, error: legErr } = await supabaseAdmin
    .from('public_profiles')
    .select('id, owner_id, name, email, phone, legacy_source, legacy_ref')
    .not('legacy_source', 'is', null)
    .limit(10);
  console.log('Sample legacy/migrated public_profiles:', legacyProfiles, legErr);
}

checkAccount();
