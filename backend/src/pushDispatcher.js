import webPush from 'web-push';
import { supabaseAdmin } from './lib/supabaseClient.js';
import dotenv from 'dotenv';
dotenv.config();

// Configure web-push
webPush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Map notification type to push category for checking preferences
function getCategoryForType(type) {
  const JOB_TYPES = new Set([
    'request_new', 'request_accepted', 'request_in_progress', 'request_completed',
    'request_cancelled', 'request_response_new', 'request_response_chosen',
    'dispute_opened'
  ]);
  
  if (JOB_TYPES.has(type)) return 'requests';
  if (type === 'message_new') return 'messages';
  if (['review', 'feedback_received'].includes(type)) return 'reviews';
  if (['follow', 'like', 'comment', 'recommendation'].includes(type)) return 'social';
  if (['credit_received', 'credit_purchase_approved', 'boost_started'].includes(type)) return 'credits';
  return 'official';
}

function getUrlForNotification(n) {
  if (n.type === 'message_new') return `/messages/${n.target_id}`;
  if (getCategoryForType(n.type) === 'requests') return `/requests/${n.target_id || 'browse'}`;
  return `/notifications`;
}

export function startPushDispatcher() {
  console.log('🚀 Starting Push Notification Dispatcher...');

  // Subscribe to INSERTS on public.notifications
  supabaseAdmin
    .channel('public:notifications')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications' },
      async (payload) => {
        const n = payload.new;
        try {
          await handleNewNotification(n);
        } catch (err) {
          console.error('Error handling push for notification:', err);
        }
      }
    )
    .subscribe((status) => {
      console.log('Push Dispatcher subscription status:', status);
    });
}

async function handleNewNotification(n) {
  const category = getCategoryForType(n.type);

  // 1. Check if user explicitly disabled this category
  const { data: pref } = await supabaseAdmin
    .from('notification_push_prefs')
    .select('enabled')
    .eq('user_id', n.user_id)
    .eq('category', category)
    .maybeSingle();

  if (pref && pref.enabled === false) {
    console.log(`Push skipped for user ${n.user_id} (category '${category}' disabled)`);
    return;
  }

  // 2. Fetch active subscriptions for this user
  const { data: subs, error: subsError } = await supabaseAdmin
    .from('notification_push_subscriptions')
    .select('*')
    .eq('user_id', n.user_id);

  if (subsError) {
    console.error('Error fetching push subscriptions:', subsError);
    return;
  }

  if (!subs || subs.length === 0) {
    return; // No active devices
  }

  // 3. Fetch actor details if present
  let title = 'Tuungane';
  if (n.actor_id) {
    const { data: actor } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', n.actor_id)
      .maybeSingle();
    
    if (actor && actor.full_name) {
      title = actor.full_name;
    }
  }

  const pushPayload = JSON.stringify({
    title,
    body: n.message,
    url: getUrlForNotification(n),
    tag: `tuungane-${n.id}`, // groups similar notifications
  });

  // 4. Dispatch to all endpoints
  for (const sub of subs) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webPush.sendNotification(pushSubscription, pushPayload);
      console.log(`Push sent successfully to endpoint for user ${n.user_id}`);
    } catch (error) {
      // If the subscription is no longer valid (e.g. user revoked permission)
      if (error.statusCode === 404 || error.statusCode === 410) {
        console.log(`Subscription expired/revoked. Deleting endpoint...`);
        await supabaseAdmin
          .from('notification_push_subscriptions')
          .delete()
          .eq('endpoint', sub.endpoint);
      } else {
        console.error('Failed to send push notification:', error);
      }
    }
  }
}
