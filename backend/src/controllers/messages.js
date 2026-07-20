import { supabaseAdmin } from '../lib/supabaseClient.js';

export const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { data: list, error } = await supabaseAdmin
      .from("conversations")
      .select("id,service_request_id,customer_id,provider_id,status,last_message_at,last_message_preview,customer_unread_count,provider_unread_count")
      .or(`customer_id.eq.${userId},provider_id.eq.${userId}`)
      .order("last_message_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const userIds = Array.from(new Set((list || []).flatMap(r => [r.customer_id, r.provider_id]).filter(id => id !== userId)));
    const reqIds = Array.from(new Set((list || []).map(r => r.service_request_id).filter(x => !!x)));

    const [{ data: profs }, { data: reqs }] = await Promise.all([
      userIds.length ? supabaseAdmin.from("profiles").select("id,full_name,avatar_url").in("id", userIds) : Promise.resolve({ data: [] }),
      reqIds.length ? supabaseAdmin.from("service_requests").select("id,service_needed,title").in("id", reqIds) : Promise.resolve({ data: [] }),
    ]);

    const profilesMap = new Map((profs || []).map(p => [p.id, p]));
    const requestsMap = new Map((reqs || []).map(r => [r.id, r]));

    const result = (list || []).map(r => {
      const otherId = r.customer_id === userId ? r.provider_id : r.customer_id;
      return {
        ...r,
        otherProfile: profilesMap.get(otherId) || null,
        request: r.service_request_id ? requestsMap.get(r.service_request_id) || null : null
      };
    });

    res.json({ data: result });
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

export const getConversationById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { data: c, error: cErr } = await supabaseAdmin
      .from("conversations")
      .select("id,service_request_id,customer_id,provider_id,status,provider_response_id")
      .eq("id", id)
      .maybeSingle();

    if (cErr || !c) return res.status(404).json({ error: 'Conversation not found' });
    if (c.customer_id !== userId && c.provider_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    const otherId = c.customer_id === userId ? c.provider_id : c.customer_id;
    
    const [{ data: prof }, { data: r }, { data: msgs }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,full_name,avatar_url").eq("id", otherId).maybeSingle(),
      c.service_request_id
        ? supabaseAdmin.from("service_requests").select("id,service_needed,title,status,location,budget_range,selected_provider_id,urgent_flag,urgency,public_profile_id").eq("id", c.service_request_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabaseAdmin.from("messages").select("id,conversation_id,sender_id,receiver_id,body,created_at,is_read").eq("conversation_id", id).order("created_at", { ascending: true }),
    ]);

    let serviceProfile = null;
    if (r?.public_profile_id) {
      const { data: sp } = await supabaseAdmin.from("public_profiles").select("id,name").eq("id", r.public_profile_id).maybeSingle();
      serviceProfile = sp;
    }

    res.json({
      data: {
        conv: c,
        other: prof,
        req: r,
        messages: msgs || [],
        serviceProfile
      }
    });
  } catch (err) {
    console.error('Error fetching conversation details:', err);
    res.status(500).json({ error: 'Failed to fetch conversation details' });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { body } = req.body;
    
    if (!body || body.length > 4000) return res.status(400).json({ error: 'Invalid message body' });

    const { data: conv, error: cErr } = await supabaseAdmin.from("conversations").select("*").eq("id", id).maybeSingle();
    if (cErr || !conv) return res.status(404).json({ error: 'Conversation not found' });
    if (conv.customer_id !== userId && conv.provider_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    const receiverId = conv.customer_id === userId ? conv.provider_id : conv.customer_id;
    
    const { data: msg, error: mErr } = await supabaseAdmin.from("messages").insert({
      conversation_id: conv.id,
      sender_id: userId,
      receiver_id: receiverId,
      body,
    }).select().single();

    if (mErr) throw mErr;
    res.json({ data: msg });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

export const reportConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body;

    const { error } = await supabaseAdmin.from("reports").insert({
      reporter_id: userId,
      target_type: "conversation",
      target_id: id,
      reason: (reason || "").slice(0, 1000),
    });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Error reporting conversation:', err);
    res.status(500).json({ error: 'Failed to report conversation' });
  }
};

export const blockUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: otherId } = req.body;

    const { error } = await supabaseAdmin.from("user_blocks").insert({ blocker_id: userId, blocked_id: otherId });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Error blocking user:', err);
    res.status(500).json({ error: 'Failed to block user' });
  }
};

export const startOrGetConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { _customer_id, _provider_id, _service_request_id, _provider_response_id, _initial_message_body } = req.body;
    // ensure caller is one of the parties
    if (userId !== _customer_id && userId !== _provider_id) return res.status(403).json({ error: 'Forbidden' });
    
    const { data, error } = await supabaseAdmin.rpc("start_or_get_conversation", {
      _customer_id, _provider_id, _service_request_id, _provider_response_id, _initial_message_body
    });
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error starting conversation:', err);
    res.status(500).json({ error: 'Failed to start conversation' });
  }
};

export const startDirectConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { _provider_id } = req.body;
    const { data, error } = await supabaseAdmin.rpc("start_direct_conversation", {
      _provider_id
    });
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error starting direct conversation:', err);
    res.status(500).json({ error: 'Failed to start direct conversation' });
  }
};

export const markConversationRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    // Must authenticate as the user to correctly clear their side's unread count using the RPC, wait, RPC uses auth.uid().
    // If backend uses service_key, `auth.uid()` in RPC will be null. We must either pass the caller ID to a custom RPC or manually update the rows.
    // RPC `mark_conversation_read` uses `auth.uid()`. Since we bypass RLS, we should just update it manually here.
    const { data: conv } = await supabaseAdmin.from("conversations").select("customer_id, provider_id").eq("id", id).maybeSingle();
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    
    let updateObj = {};
    if (conv.customer_id === userId) updateObj = { customer_unread_count: 0 };
    else if (conv.provider_id === userId) updateObj = { provider_unread_count: 0 };
    else return res.status(403).json({ error: 'Forbidden' });

    await Promise.all([
      supabaseAdmin.from("conversations").update(updateObj).eq("id", id),
      supabaseAdmin.from("messages").update({ is_read: true }).eq("conversation_id", id).eq("receiver_id", userId).eq("is_read", false)
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error('Error marking conversation read:', err);
    res.status(500).json({ error: 'Failed to mark read' });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    // RPC `get_unread_message_count` also uses `auth.uid()`. Let's query it manually.
    const { count, error } = await supabaseAdmin
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", userId)
      .eq("is_read", false);
    
    if (error) throw error;
    res.json({ data: count || 0 });
  } catch (err) {
    console.error('Error getting unread count:', err);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};

