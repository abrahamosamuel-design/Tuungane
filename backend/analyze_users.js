import 'dotenv/config';
import { supabaseAdmin } from './src/lib/supabaseClient.js';

async function analyzeAllUsers() {
  console.log('--- Fetching all Auth Users ---');
  const { data: usersData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
  if (userError) {
    console.error('Error listing auth users:', userError);
    return;
  }
  
  console.log(`Total Auth Users: ${usersData.users.length}`);
  usersData.users.forEach((u, i) => {
    console.log(`[${i+1}] ID: ${u.id} | Email: ${u.email} | Confirmed: ${!!u.email_confirmed_at} | Created: ${u.created_at} | Providers: ${u.app_metadata?.providers?.join(',')}`);
  });

  console.log('\n--- Fetching migrated public_profiles ---');
  const { data: legacyPubs } = await supabaseAdmin
    .from('public_profiles')
    .select('id, owner_id, name, email, phone, legacy_source, legacy_ref')
    .not('legacy_source', 'is', null);

  console.log(`Total Migrated public_profiles: ${legacyPubs?.length}`);
  legacyPubs?.forEach((lp, i) => {
    console.log(`[${i+1}] ID: ${lp.id} | Owner: ${lp.owner_id} | Name: ${lp.name} | Email: ${lp.email} | Phone: ${lp.phone} | Source: ${lp.legacy_source}`);
  });

  console.log('\n--- Checking for unconfirmed users matching migrated profiles ---');
  legacyPubs?.forEach(lp => {
    if (lp.email) {
      const match = usersData.users.find(u => u.email?.toLowerCase() === lp.email.toLowerCase());
      console.log(`Profile "${lp.name}" (${lp.email}): Auth user match -> ${match ? `Found (Confirmed: ${!!match.email_confirmed_at})` : 'NOT in auth.users'}`);
    }
  });
}

analyzeAllUsers();
