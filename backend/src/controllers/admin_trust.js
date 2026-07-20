import { supabaseAdmin } from "../lib/supabaseClient.js";

export async function getAppeals(req, res) {
  try {
    const { status } = req.query;
    let q = supabaseAdmin.from("profile_trust_appeals").select("*").order("created_at", { ascending: false }).limit(100);
    if (status && status !== "all") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

export async function decideAppeal(req, res) {
  try {
    const { id } = req.params;
    const { action, notes } = req.body;
    const { error } = await supabaseAdmin.rpc("admin_decide_trust_appeal", { _id: id, _action: action, _notes: notes });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

export async function getOverview(req, res) {
  try {
    const { data: stats, error: statsErr } = await supabaseAdmin.from("admin_trust_stats").select("*").maybeSingle();
    if (statsErr) throw statsErr;
    const { count: pCount, error: pErr } = await supabaseAdmin.from("profiles").select("*", { count: "exact", head: true });
    if (pErr) throw pErr;
    const { data: pr } = await supabaseAdmin.from("profile_verification_requests").select("id,profile_id,requested_type,created_at").in("status", ["pending", "more_info"]).order("created_at", { ascending: true }).limit(5);
    const { data: ts } = await supabaseAdmin.from("profile_trust_status").select("profile_kind,profile_id,reports_count,manual_level").gt("reports_count", 0).order("reports_count", { ascending: false }).limit(5);
    res.json({ data: { stats, total_profiles: pCount || 0, urgent_requests: pr || [], high_reports: ts || [] } });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

export async function getVerificationRequests(req, res) {
  try {
    const { status } = req.query;
    let q = supabaseAdmin.from("profile_verification_requests").select("*").order("created_at", { ascending: false }).limit(100);
    if (status && status !== "all") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

export async function decideVerificationRequest(req, res) {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    const { error } = await supabaseAdmin.rpc("admin_decide_verification_request", { _id: id, _status: status, _notes: admin_notes });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

export async function getReports(req, res) {
  try {
    const { status } = req.query;
    let q = supabaseAdmin.from("profile_reports").select("*").order("created_at", { ascending: false }).limit(100);
    if (status && status !== "all") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

export async function resolveReport(req, res) {
  try {
    const { id } = req.params;
    const { action, admin_notes, update_trust_level } = req.body;
    const { error } = await supabaseAdmin.rpc("admin_resolve_profile_report", { _id: id, _action: action, _notes: admin_notes, _update_trust_level: update_trust_level });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

export async function setTrustLevel(req, res) {
  try {
    const { kind, id, level, reason } = req.body;
    const { error } = await supabaseAdmin.rpc("admin_set_trust_level", { _kind: kind, _id: id, _level: level, _reason: reason });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

export async function getStatus(req, res) {
  try {
    const { search } = req.query;
    let q = supabaseAdmin.from("profile_trust_status").select("*").order("updated_at", { ascending: false }).limit(200);
    if (search) q = q.or(`profile_id.eq.${search},profile_kind.eq.${search}`); // Not ideal search but basic
    const { data, error } = await q;
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

export async function clearManualLevel(req, res) {
  try {
    const { kind, id } = req.body;
    const { error } = await supabaseAdmin.rpc("admin_clear_manual_trust_level", { _kind: kind, _id: id, _reason: "cleared" });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

export async function getNotes(req, res) {
  try {
    const { search } = req.query;
    let q = supabaseAdmin.from("profile_admin_notes").select("*").order("created_at", { ascending: false }).limit(100);
    if (search) q = q.eq("profile_id", search);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

export async function addNote(req, res) {
  try {
    const { kind, id, note } = req.body;
    const { error } = await supabaseAdmin.rpc("admin_add_profile_note", { _kind: kind, _id: id, _note: note });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

export async function getAuditLog(req, res) {
  try {
    const { action, target } = req.query;
    let q = supabaseAdmin.from("trust_audit_log").select("*").order("created_at", { ascending: false }).limit(200);
    if (action && action !== "all") q = q.eq("action", action);
    if (target) q = q.eq("target_id", target);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

export async function getSettings(req, res) {
  try {
    const { data, error } = await supabaseAdmin.from("trust_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;
    res.json({ data });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

export async function updateSettings(req, res) {
  try {
    const { error } = await supabaseAdmin.from("trust_settings").update(req.body).eq("id", 1);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
}
