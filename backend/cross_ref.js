import 'dotenv/config';
import { supabaseAdmin } from './src/lib/supabaseClient.js';

async function crossRefUsers() {
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  const authUsersMap = new Map();
  usersData?.users.forEach(u => authUsersMap.set(u.id, u));

  const { data: profs } = await supabaseAdmin.from('profiles').select('*');
  console.log('--- Profiles & Auth Users Match ---');
  profs?.forEach(p => {
    const authUser = authUsersMap.get(p.id);
    console.log(`Profile [${p.id}]: "${p.full_name}" -> Auth: ${authUser ? `${authUser.email} (confirmed: ${!!authUser.email_confirmed_at}, providers: ${authUser.app_metadata?.providers})` : 'NO auth.users row with this ID!'}`);
  });
}

crossRefUsers();
