import 'dotenv/config';
import { supabaseAdmin } from './src/lib/supabaseClient.js';

async function confirmUnconfirmedUsers() {
  const { data: usersData, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  for (const user of usersData.users) {
    if (!user.email_confirmed_at && user.email) {
      console.log(`Confirming email for: ${user.email} (ID: ${user.id})...`);
      const { data: updated, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
      );
      if (updateError) {
        console.error(`Failed to confirm ${user.email}:`, updateError);
      } else {
        console.log(`Successfully confirmed ${user.email}!`);
      }
    }
  }
}

confirmUnconfirmedUsers();
