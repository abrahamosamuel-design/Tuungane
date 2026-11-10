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
    const { action, decision, notes, note } = req.body;
    const finalStatus = decision || action || "approved";
    const finalNote = note || notes || null;
    const now = new Date().toISOString();

    const { data: appeal, error: getErr } = await supabaseAdmin
      .from("profile_trust_appeals")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (getErr) throw getErr;

    const { error } = await supabaseAdmin
      .from("profile_trust_appeals")
      .update({
        status: finalStatus,
        decision_note: finalNote,
        decided_by: req.user?.id || null,
        decided_at: now,
        updated_at: now,
      })
      .eq("id", id);
    if (error) throw error;

    if (finalStatus === "approved" && appeal) {
      if (appeal.appeal_kind === "suspension" || appeal.appeal_kind === "under_review") {
        await Promise.allSettled([
          supabaseAdmin.from("profile_trust_status").update({ manual_level: null, manual_reason: null, updated_at: now }).eq("profile_kind", appeal.profile_kind).eq("profile_id", appeal.profile_id),
          supabaseAdmin.from("service_profiles").update({ suspended: false }).eq("user_id", appeal.profile_id),
          supabaseAdmin.from("public_profiles").update({ suspended: false }).eq("owner_id", appeal.owner_user_id),
          supabaseAdmin.from("profiles").update({ registration_status: null }).eq("id", appeal.owner_user_id),
        ]);
      } else if (appeal.appeal_kind === "rejected_verification" && appeal.related_request_id) {
        await supabaseAdmin.from("profile_verification_requests").update({ status: "pending", updated_at: now }).eq("id", appeal.related_request_id);
      }
    }
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

export async function getOverview(req, res) {
  try {
    const { data: stats } = await supabaseAdmin.from("admin_trust_stats").select("*").maybeSingle();
    const { count: pCount } = await supabaseAdmin.from("profiles").select("*", { count: "exact", head: true });
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
    const { status, decision, admin_notes, admin_note } = req.body;
    const rawDecision = decision || status;
    const statusMap = {
      approve: "approved",
      approved: "approved",
      reject: "rejected",
      rejected: "rejected",
      more_info: "more_info",
      revoke: "revoked",
      revoked: "revoked",
    };
    const nextStatus = statusMap[rawDecision] || rawDecision;
    const note = admin_note ?? admin_notes ?? null;
    const now = new Date().toISOString();

    const { data: vr, error: vrErr } = await supabaseAdmin
      .from("profile_verification_requests")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (vrErr) throw vrErr;

    const { error } = await supabaseAdmin
      .from("profile_verification_requests")
      .update({
        status: nextStatus,
        admin_note: note,
        reviewed_by: req.user?.id || null,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", id);
    if (error) throw error;

    if (vr) {
      const targetUserId = vr.owner_user_id || vr.profile_id;
      if (nextStatus === "approved") {
        await Promise.allSettled([
          supabaseAdmin.from("service_profiles").update({ verified: "verified" }).eq("user_id", targetUserId),
          supabaseAdmin.from("public_profiles").update({ verified: "verified" }).eq("owner_id", targetUserId),
          supabaseAdmin.from("profiles").update({ is_provider: true, registration_status: "verified" }).eq("id", targetUserId),
          supabaseAdmin.from("profile_trust_status").upsert({
            profile_kind: vr.profile_kind || "service_profile",
            profile_id: vr.profile_id,
            owner_user_id: targetUserId,
            auto_level: "new",
            manual_level: vr.requested_type || "verified_provider",
            manual_reason: "Verification request approved",
            manual_set_by: req.user?.id || null,
            manual_set_at: now,
            updated_at: now,
          }, { onConflict: "profile_kind,profile_id" }),
        ]);
      } else if (nextStatus === "revoked") {
        await Promise.allSettled([
          supabaseAdmin.from("service_profiles").update({ verified: "none" }).eq("user_id", targetUserId),
          supabaseAdmin.from("public_profiles").update({ verified: "none" }).eq("owner_id", targetUserId),
          supabaseAdmin.from("profiles").update({ registration_status: null }).eq("id", targetUserId),
          supabaseAdmin.from("profile_trust_status").update({ manual_level: null, manual_reason: null, updated_at: now }).eq("profile_kind", vr.profile_kind).eq("profile_id", vr.profile_id),
        ]);
      }
    }

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
    const { action, resolution } = req.body;
    const raw = resolution || action || "reviewed";
    const map = { dismiss: "dismissed", review: "reviewed", action: "action_taken" };
    const nextStatus = map[raw] || raw;
    const { error } = await supabaseAdmin
      .from("profile_reports")
      .update({ status: nextStatus })
      .eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

export async function setTrustLevel(req, res) {
  try {
    const { kind, id, level, reason } = req.body;
    const now = new Date().toISOString();
    const { data: existing } = await supabaseAdmin
      .from("profile_trust_status")
      .select("*")
      .eq("profile_kind", kind || "service_profile")
      .eq("profile_id", id)
      .maybeSingle();

    const ownerId = existing?.owner_user_id || id;
    const { error } = await supabaseAdmin.from("profile_trust_status").upsert({
      profile_kind: kind || "service_profile",
      profile_id: id,
      owner_user_id: ownerId,
      auto_level: existing?.auto_level || "new",
      manual_level: level,
      manual_reason: reason || null,
      manual_set_by: req.user?.id || null,
      manual_set_at: now,
      updated_at: now,
    }, { onConflict: "profile_kind,profile_id" });
    if (error) throw error;

    // Sync with profiles / service_profiles / public_profiles
    if (level === "suspended") {
      await Promise.allSettled([
        supabaseAdmin.from("service_profiles").update({ suspended: true }).eq("user_id", ownerId),
        supabaseAdmin.from("public_profiles").update({ suspended: true }).eq("owner_id", ownerId),
        supabaseAdmin.from("profiles").update({ registration_status: "suspended" }).eq("id", ownerId),
      ]);
    } else if (level === "verified_provider" || level === "verified_business" || level === "verified_organization") {
      await Promise.allSettled([
        supabaseAdmin.from("service_profiles").update({ verified: "verified", suspended: false }).eq("user_id", ownerId),
        supabaseAdmin.from("public_profiles").update({ verified: "verified", suspended: false }).eq("owner_id", ownerId),
        supabaseAdmin.from("profiles").update({ is_provider: true, registration_status: "verified" }).eq("id", ownerId),
      ]);
    }

    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

export async function getStatus(req, res) {
  try {
    const { search } = req.query;
    let q = supabaseAdmin.from("profile_trust_status").select("*").order("updated_at", { ascending: false }).limit(200);
    if (search) q = q.or(`profile_id.eq.${search},profile_kind.eq.${search}`);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) { res.status(500).json({ error: error.message }); }
}

export async function clearManualLevel(req, res) {
  try {
    const { kind, id } = req.body;
    const { error } = await supabaseAdmin
      .from("profile_trust_status")
      .update({ manual_level: null, manual_reason: null, updated_at: new Date().toISOString() })
      .eq("profile_kind", kind || "service_profile")
      .eq("profile_id", id);
    if (error) throw error;
    await Promise.allSettled([
      supabaseAdmin.from("service_profiles").update({ suspended: false, verified: "none" }).eq("user_id", id),
      supabaseAdmin.from("public_profiles").update({ suspended: false, verified: "none" }).eq("owner_id", id),
      supabaseAdmin.from("profiles").update({ registration_status: null }).eq("id", id),
    ]);
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
    const { error } = await supabaseAdmin.from("profile_admin_notes").insert({
      profile_kind: kind || "service_profile",
      profile_id: id,
      author_id: req.user?.id,
      note,
    });
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
