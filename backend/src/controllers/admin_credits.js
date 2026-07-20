import { supabaseAdmin } from "../lib/supabaseClient.js";

export async function getCreditsInfo(req, res) {
  try {
    const [r, w, b] = await Promise.all([
      supabaseAdmin.from("credit_purchase_requests").select("*").order("created_at", { ascending: false }).limit(100),
      supabaseAdmin.from("credit_wallets").select("user_id,balance").order("balance", { ascending: false }).limit(100),
      supabaseAdmin.from("boosts").select("*").eq("status", "active").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(100),
    ]);
    const ids = (w.data || []).map((x) => x.user_id);
    let pm = [];
    if (ids.length > 0) {
      const { data } = await supabaseAdmin.from("profiles").select("id,full_name").in("id", ids);
      pm = data || [];
    }
    const map = new Map(pm.map((p) => [p.id, p.full_name]));
    
    res.json({
      data: {
        reqs: r.data || [],
        wallets: (w.data || []).map(x => ({ ...x, profile: { full_name: map.get(x.user_id) || x.user_id.slice(0, 8) } })),
        boosts: b.data || []
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function approveRequest(req, res) {
  try {
    const { id } = req.params;
    const { payment_reference } = req.body;
    const { error } = await supabaseAdmin.rpc("approve_purchase_request", { _request_id: id, _payment_reference: payment_reference || undefined });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function rejectRequest(req, res) {
  try {
    const { id } = req.params;
    const { admin_note } = req.body;
    const { error } = await supabaseAdmin.rpc("reject_purchase_request", { _request_id: id, _admin_note: admin_note || undefined });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function addCredits(req, res) {
  try {
    const { user_id, amount, reason } = req.body;
    const { error } = await supabaseAdmin.rpc("admin_add_credits", { _user_id: user_id, _amount: Number(amount), _reason: reason || "" });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function expireBoost(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.rpc("admin_expire_boost", { _boost_id: id });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
