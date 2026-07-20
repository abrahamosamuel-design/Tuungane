import { supabaseAdmin } from "../lib/supabaseClient.js";

// Requests
export async function getRequests(req, res) {
  try {
    const [r, f, d] = await Promise.all([
      supabaseAdmin.rpc("admin_list_service_requests", { _limit: 200 }),
      supabaseAdmin.from("service_feedback").select("*").order("created_at", { ascending: false }).limit(100),
      supabaseAdmin.from("service_disputes").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    
    const requests = (r.data || []).map(x => ({ ...x, completion_code: null }));
    
    res.json({
      data: {
        requests,
        feedback: f.data || [],
        disputes: d.data || []
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function setRequestStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { error } = await supabaseAdmin.from("service_requests").update({ status }).eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

// Feedback
export async function hideFeedback(req, res) {
  try {
    const { id } = req.params;
    const { is_visible } = req.body;
    const { error } = await supabaseAdmin.from("service_feedback").update({ is_visible }).eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function deleteFeedback(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from("service_feedback").delete().eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

// Disputes
export async function resolveDispute(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { error } = await supabaseAdmin.from("service_disputes").update({ status, resolved_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
