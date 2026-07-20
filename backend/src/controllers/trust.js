import { supabaseAdmin } from '../lib/supabaseClient.js';

export const getMyTrustStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const [sp, bp, ts, pvrPending, pvrRejected, appeals] = await Promise.all([
      supabaseAdmin.from("service_profiles").select("user_id,business_name,subcategory").eq("user_id", userId),
      supabaseAdmin.from("business_pages").select("id,name,org_type").eq("owner_id", userId),
      supabaseAdmin.from("profile_trust_status").select("profile_kind,profile_id,manual_level,auto_level").eq("owner_user_id", userId),
      supabaseAdmin.from("profile_verification_requests").select("profile_kind,profile_id,status").eq("owner_user_id", userId).in("status", ["pending", "more_info"]),
      supabaseAdmin.from("profile_verification_requests").select("id,profile_kind,profile_id,created_at").eq("owner_user_id", userId).eq("status", "rejected").order("created_at", { ascending: false }),
      supabaseAdmin.from("profile_trust_appeals").select("profile_kind,profile_id,appeal_kind,related_request_id,status").eq("owner_user_id", userId).eq("status", "open"),
    ]);

    res.json({
      data: {
        service_profiles: sp.data,
        business_pages: bp.data,
        trust_status: ts.data,
        pending_requests: pvrPending.data,
        rejected_requests: pvrRejected.data,
        open_appeals: appeals.data,
      }
    });
  } catch (err) {
    console.error('Error fetching trust status:', err);
    res.status(500).json({ error: 'Failed to fetch trust status' });
  }
};

export const getTrustChecklist = async (req, res) => {
  try {
    const { kind, id } = req.query;
    if (!kind || !id) {
      return res.status(400).json({ error: 'Missing kind or id' });
    }
    const { data, error } = await supabaseAdmin.rpc('get_profile_trust_checklist', { _kind: kind, _id: id });
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error fetching trust checklist:', err);
    res.status(500).json({ error: 'Failed to fetch trust checklist' });
  }
};

export const getProfileTrustBadge = async (req, res) => {
  try {
    const { kind, id } = req.query;
    if (!kind || !id) {
      return res.status(400).json({ error: 'Missing kind or id' });
    }
    const { data, error } = await supabaseAdmin.rpc('get_profile_trust_badge', { _kind: kind, _id: id });
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trust badge' });
  }
};

export const submitVerifyRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { profile_kind, profile_id, requested_type, full_name, contact_person, business_name, phone, location, experience_summary } = req.body;
    
    const { data, error } = await supabaseAdmin.from("profile_verification_requests").insert({
      profile_kind,
      profile_id,
      owner_user_id: userId,
      requested_type,
      full_name: full_name || null,
      contact_person: contact_person || null,
      business_name: business_name || null,
      phone: phone || null,
      location: location || null,
      experience_summary: experience_summary || null,
    }).select("id").single();
    
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error submitting verify request:', err);
    res.status(500).json({ error: 'Failed to submit verify request' });
  }
};

export const submitVerifyEvidence = async (req, res) => {
  try {
    const userId = req.user.id;
    const { request_id, doc_type, storage_path } = req.body;
    
    const { error } = await supabaseAdmin.from("verification_evidence").insert({
      request_id,
      owner_user_id: userId,
      doc_type,
      storage_path,
    });
    
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit evidence' });
  }
};

export const submitTrustAppeal = async (req, res) => {
  try {
    const { kind, id, appeal_kind, message, related_request_id } = req.body;
    
    const { data, error } = await supabaseAdmin.rpc("submit_trust_appeal", {
      _kind: kind,
      _id: id,
      _appeal_kind: appeal_kind,
      _message: message,
      _related_request_id: related_request_id || null,
    });
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error submitting trust appeal:', err);
    res.status(500).json({ error: 'Failed to submit trust appeal' });
  }
};
