import { supabaseAdmin } from './src/lib/supabaseClient.js';

async function grantAdmin() {
  const targetEmail = process.argv[2] || 'tcollines004@gmail.com';
  console.log(`Checking for user with email: ${targetEmail}...`);

  // 1. List users from auth
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }

  console.log(`Found ${users.length} total users in Supabase auth.`);
  const user = users.find(u => u.email?.toLowerCase() === targetEmail.toLowerCase());

  if (!user) {
    console.log(`User ${targetEmail} not found in Supabase Auth users.`);
    console.log('Existing emails in Auth:', users.map(u => u.email).filter(Boolean));
    return;
  }

  console.log(`Found user: ${user.id} (${user.email})`);

  // 2. Check current roles in user_roles
  const { data: existingRoles, error: rolesError } = await supabaseAdmin
    .from('user_roles')
    .select('*')
    .eq('user_id', user.id);

  if (rolesError) {
    console.error('Error fetching existing roles:', rolesError);
  } else {
    console.log('Current roles for user:', existingRoles);
  }

  // 3. Insert or upsert 'admin' and 'moderator' roles
  for (const role of ['admin', 'moderator']) {
    const { data, error } = await supabaseAdmin
      .from('user_roles')
      .upsert(
        { user_id: user.id, role: role },
        { onConflict: 'user_id,role' }
      )
      .select();

    if (error) {
      console.error(`Error granting role "${role}":`, error);
    } else {
      console.log(`Successfully ensured role "${role}" for ${targetEmail}:`, data);
    }
  }

  // 4. Verify roles
  const { data: finalRoles } = await supabaseAdmin
    .from('user_roles')
    .select('*')
    .eq('user_id', user.id);

  console.log('Final roles for', targetEmail, ':', finalRoles);
}

grantAdmin().catch(console.error);
