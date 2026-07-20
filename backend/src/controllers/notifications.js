import { supabaseAdmin } from '../lib/supabaseClient.js';

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { unread } = req.query;

    let query = supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (unread === 'true') {
      query = query.eq("read", false);
    }

    const { data: notifs, error } = await query;

    if (error) throw error;

    const ids = Array.from(new Set((notifs ?? []).map((n) => n.actor_id).filter(Boolean)));
    let pm = new Map();
    
    if (ids.length) {
      const { data: profs } = await supabaseAdmin.from("profiles").select("id,full_name,avatar_url").in("id", ids);
      pm = new Map((profs ?? []).map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]));
    }

    const merged = (notifs ?? []).map((n) => ({ 
      ...n, 
      actor: n.actor_id ? pm.get(n.actor_id) : undefined 
    }));

    res.json({ data: merged });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

export const markNotificationsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking notifications read:', err);
    res.status(500).json({ error: 'Failed to mark notifications read' });
  }
};

export const getNotificationById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const { data: n, error } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!n) return res.status(404).json({ error: 'Notification not found' });

    let actor;
    if (n.actor_id) {
      const { data: a } = await supabaseAdmin
        .from("profiles")
        .select("id,full_name,avatar_url")
        .eq("id", n.actor_id)
        .maybeSingle();
      actor = a;
    }

    res.json({ data: { ...n, actor } });
  } catch (err) {
    console.error('Error fetching notification:', err);
    res.status(500).json({ error: 'Failed to fetch notification' });
  }
};

export const markNotificationReadById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking notification read:', err);
    res.status(500).json({ error: 'Failed to mark notification read' });
  }
};

export const sendTestPushNotification = async (req, res) => {
  try {
    const { error } = await supabaseAdmin.rpc("send_test_push_notification");
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Error sending test push notification:', err);
    res.status(500).json({ error: 'Failed to send test push notification' });
  }
};
