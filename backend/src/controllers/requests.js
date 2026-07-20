import { supabaseAdmin } from '../lib/supabaseClient.js';

export const getRequests = async (req, res) => {
  try {
    const { public_profile_id } = req.query;
    let query = supabaseAdmin
      .from('service_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (public_profile_id) {
      query = query.eq('public_profile_id', public_profile_id);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error fetching requests:', err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
};

export const browseRequests = async (req, res) => {
  try {
    const { cat, chip, urgentOnly, budgetShown, loc, q, myDistrict } = req.query;
    const isGuest = !req.user;
    
    const cols = isGuest
      ? "id,provider_id,category_slug,subcategory,service_needed,title,visibility,district,town,description,preferred_date,preferred_time,urgency,budget_range,media_urls,status,urgent_flag,created_at,updated_at,service_profile_id,posted_as_type,posted_as_name,posted_as_avatar_url,posted_as_ref_type,posted_as_ref_id"
      : "id,customer_id,provider_id,category_slug,subcategory,service_needed,title,visibility,location,district,town,area,description,preferred_date,preferred_time,urgency,budget_range,preferred_contact_method,attachment_url,media_urls,status,urgent_flag,created_at,updated_at,completed_at,cancelled_at,disputed_at,service_profile_id,selected_provider_id,provider_confirmed_completion,customer_confirmed_completion,posted_as_type,posted_as_name,posted_as_avatar_url,posted_as_ref_type,posted_as_ref_id";

    let query = supabaseAdmin
      .from("service_requests")
      .select(cols)
      .eq("visibility", "public")
      .eq("status", "requested")
      .order("created_at", { ascending: false })
      .limit(80);

    if (cat) query = query.eq("category_slug", cat);
    if (chip === "urgent" || urgentOnly === 'true') query = query.eq("urgent_flag", true);
    if (chip === "today") query = query.eq("urgency", "emergency");
    if (chip === "week") query = query.eq("urgency", "urgent");
    if (budgetShown === 'true') query = query.not("budget_range", "is", null);
    if (loc) query = query.or(isGuest
      ? `town.ilike.%${loc}%,district.ilike.%${loc}%`
      : `town.ilike.%${loc}%,district.ilike.%${loc}%,location.ilike.%${loc}%`);
    if (q) query = query.or(`title.ilike.%${q}%,service_needed.ilike.%${q}%,description.ilike.%${q}%`);
    if ((chip === "nearby" || req.query.nearMe === 'true') && myDistrict) query = query.eq("district", myDistrict);

    const { data, error } = await query;
    if (error) throw error;

    let list = data || [];

    if (!isGuest) {
      const customerIds = Array.from(new Set(list.map((r) => r.customer_id).filter(Boolean)));
      const requestIds = list.map((r) => r.id);
      
      const [{ data: profs }, { data: resps }] = await Promise.all([
        customerIds.length
          ? supabaseAdmin.from("profiles").select("id,full_name,avatar_url").in("id", customerIds)
          : Promise.resolve({ data: [] }),
        requestIds.length
          ? supabaseAdmin.from("provider_responses").select("request_id").in("request_id", requestIds)
          : Promise.resolve({ data: [] }),
      ]);
      
      const nameMap = new Map((profs || []).map((p) => [p.id, p.full_name]));
      const avatarMap = new Map((profs || []).map((p) => [p.id, p.avatar_url]));
      const countMap = new Map();
      (resps || []).forEach((r) => countMap.set(r.request_id, (countMap.get(r.request_id) || 0) + 1));
      
      list = list.map((r) => ({
        ...r,
        customer_name: nameMap.get(r.customer_id) || null,
        customer_avatar_url: avatarMap.get(r.customer_id) || null,
        response_count: countMap.get(r.id) || 0,
      }));
    }

    res.json({ data: list });
  } catch (err) {
    console.error('Error browsing requests:', err);
    res.status(500).json({ error: 'Failed to browse requests' });
  }
};

export const getMyRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { role = 'customer' } = req.query;
    
    let query = supabaseAdmin
      .from('service_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (role === 'all') {
      query = query.or(`customer_id.eq.${userId},provider_id.eq.${userId}`);
    } else {
      const col = role === 'customer' ? 'customer_id' : 'provider_id';
      query = query.eq(col, userId);
    }

    const { data: list, error } = await query;

    if (error) throw error;
    
    // We can also join the related items here so the frontend doesn't have to
    const rs = list || [];
    const ids = Array.from(new Set(rs.flatMap(r => [r.customer_id, r.provider_id]).filter(id => !!id)));
    const reqIds = rs.map(r => r.id);
    
    let profs = [];
    let fb = [];
    
    if (ids.length) {
      const { data: p } = await supabaseAdmin.from('profiles').select('id,full_name,avatar_url').in('id', ids);
      profs = p || [];
    }
    if (reqIds.length) {
      const { data: f } = await supabaseAdmin.from('service_feedback').select('service_request_id').in('service_request_id', reqIds);
      fb = f || [];
    }
    
    const pmap = new Map(profs.map(p => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]));
    const fbSet = new Set(fb.map(x => x.service_request_id));
    
    const merged = rs.map(r => ({
      ...r,
      customer: pmap.get(r.customer_id),
      provider: r.provider_id ? pmap.get(r.provider_id) : undefined,
      has_feedback: fbSet.has(r.id)
    }));
    
    res.json({ data: merged });
  } catch (err) {
    console.error('Error fetching my requests:', err);
    res.status(500).json({ error: 'Failed to fetch my requests' });
  }
};

export const getRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from('service_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Request not found' });
    
    res.json({ data });
  } catch (err) {
    console.error('Error fetching request:', err);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
};

export const createRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const payload = { ...req.body, customer_id: userId };
    
    const { data, error } = await supabaseAdmin
      .from('service_requests')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    console.error('Error creating request:', err);
    res.status(500).json({ error: 'Failed to create request' });
  }
};

export const updateRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const payload = req.body;
    
    // Make sure the user owns the request
    const { data: existing, error: err1 } = await supabaseAdmin
      .from('service_requests')
      .select('customer_id')
      .eq('id', id)
      .single();
      
    if (err1 || existing.customer_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to update this request' });
    }

    const { data, error } = await supabaseAdmin
      .from('service_requests')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error updating request:', err);
    res.status(500).json({ error: 'Failed to update request' });
  }
};

export const deleteRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify ownership
    const { data: existing, error: err1 } = await supabaseAdmin
      .from('service_requests')
      .select('customer_id')
      .eq('id', id)
      .single();
      
    if (err1 || existing.customer_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this request' });
    }

    const { error } = await supabaseAdmin
      .from('service_requests')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting request:', err);
    res.status(500).json({ error: 'Failed to delete request' });
  }
};

export const getRequestDetail = async (req, res) => {
  try {
    const { id } = req.params;
    // We pass userId via context (as JWT), but the RPC uses auth.uid() which works if we use RLS or if we just reimplement the logic.
    // For now, let's call the RPC using the user's token or just reimplement the query since we are bypassing RLS with Admin.
    // But since the frontend expects the RPC output, let's just query the table.
    const { data, error } = await supabaseAdmin
      .from('service_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error in getRequestDetail:', err);
    res.status(500).json({ error: 'Failed to fetch request detail' });
  }
};

export const getCompletionCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin.rpc("get_completion_code", { _request_id: id });
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error in getCompletionCode:', err);
    res.status(500).json({ error: 'Failed to fetch completion code' });
  }
};

export const getProviderContact = async (req, res) => {
  try {
    const { provider_id } = req.params;
    const { data, error } = await supabaseAdmin.rpc("get_provider_contact", { _provider: provider_id }).maybeSingle();
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error in getProviderContact:', err);
    res.status(500).json({ error: 'Failed to fetch provider contact' });
  }
};

export const confirmCompletion = async (req, res) => {
  try {
    const { id } = req.params;
    const { code } = req.body;
    const { data, error } = await supabaseAdmin.rpc("confirm_completion", { _request_id: id, _code: code });
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error in confirmCompletion:', err);
    res.status(500).json({ error: err.message || 'Failed to confirm completion' });
  }
};

export const confirmCompletionCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin.rpc("confirm_completion_customer", { _request_id: id });
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error in confirmCompletionCustomer:', err);
    res.status(500).json({ error: err.message || 'Failed to confirm completion' });
  }
};

export const getRequestResponses = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: rsps, error } = await supabaseAdmin
      .from('provider_responses')
      .select('*')
      .eq('request_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const provIds = Array.from(new Set(rsps.map((x) => x.provider_id)));
    let provs = [];
    let stats = [];

    if (provIds.length) {
      const [provRes, statsRes] = await Promise.all([
        supabaseAdmin.from('profiles').select('id,full_name,avatar_url').in('id', provIds),
        supabaseAdmin.from('provider_trust_stats').select('*').in('provider_id', provIds)
      ]);
      provs = provRes.data || [];
      stats = statsRes.data || [];
    }

    const pmap = new Map(provs.map(p => [p.id, p]));
    const smap = new Map(stats.map(s => [s.provider_id, s]));

    const merged = rsps.map(x => ({
      ...x,
      provider: pmap.get(x.provider_id),
      stats: smap.get(x.provider_id)
    }));

    res.json({ data: merged });
  } catch (err) {
    console.error('Error in getRequestResponses:', err);
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
};

export const createResponse = async (req, res) => {
  try {
    const { id } = req.params; // request_id
    const payload = req.body;
    
    const { data, error } = await supabaseAdmin
      .from('provider_responses')
      .insert({ ...payload, request_id: id })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    console.error('Error creating response:', err);
    res.status(500).json({ error: 'Failed to create response' });
  }
};

export const updateResponse = async (req, res) => {
  try {
    const { response_id } = req.params;
    const { status } = req.body;
    
    const { data, error } = await supabaseAdmin
      .from('provider_responses')
      .update({ status })
      .eq('id', response_id)
      .select()
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error updating response:', err);
    res.status(500).json({ error: 'Failed to update response' });
  }
};

export const openDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, against_user_id } = req.body;
    const userId = req.user.id;
    
    await supabaseAdmin.from('service_disputes').insert({
      service_request_id: id,
      raised_by_user_id: userId,
      against_user_id,
      reason: reason.slice(0, 100),
      description: reason.slice(0, 1000)
    });

    const { data, error } = await supabaseAdmin
      .from('service_requests')
      .update({ status: 'disputed' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error opening dispute:', err);
    res.status(500).json({ error: 'Failed to open dispute' });
  }
};

export const checkContactGate = async (req, res) => {
  try {
    const { providerId } = req.params;
    const userId = req.user.id;
    
    const { data } = await supabaseAdmin
      .from("service_requests")
      .select("id,status,selected_provider_id")
      .eq("customer_id", userId)
      .eq("provider_id", providerId)
      .in("status", ["requested", "accepted", "in_progress", "completed"])
      .order("created_at", { ascending: false })
      .limit(1);
      
    res.json({ data: data?.[0] || null });
  } catch (err) {
    console.error('Error checking contact gate:', err);
    res.status(500).json({ error: 'Failed to check contact gate' });
  }
};

export const logContactClick = async (req, res) => {
  try {
    const { customerId, providerId, serviceRequestId, serviceId, source, method } = req.body;
    let serviceJobId = null;
    
    if (serviceRequestId) {
      const { data: r } = await supabaseAdmin
        .from("service_requests")
        .select("status")
        .eq("id", serviceRequestId)
        .maybeSingle();
      if (r && ["accepted", "in_progress", "completed"].includes(r.status)) {
        serviceJobId = serviceRequestId;
      }
    }

    await supabaseAdmin.from("contact_logs").insert({
      customer_id: customerId,
      provider_id: providerId,
      service_request_id: serviceRequestId || null,
      service_job_id: serviceJobId,
      service_id: serviceId || null,
      source: source || null,
      contact_method: method,
      user_agent: req.headers['user-agent']?.slice(0, 500) || null,
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error logging contact click:', err);
    res.status(500).json({ error: 'Failed to log contact click' });
  }
};

export const logContactReveal = async (req, res) => {
  try {
    const { customerId, providerId, serviceRequestId, revealedPhone, revealedWhatsapp, reason } = req.body;
    
    await supabaseAdmin.from("contact_reveals").insert({
      customer_id: customerId,
      provider_id: providerId,
      service_request_id: serviceRequestId,
      revealed_phone: revealedPhone || null,
      revealed_whatsapp: revealedWhatsapp || null,
      reveal_reason: reason || "request_unlocked",
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error logging contact reveal:', err);
    res.status(500).json({ error: 'Failed to record contact reveal' });
  }
};

export const submitFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const payload = {
      ...req.body,
      service_request_id: id,
      customer_id: userId,
      is_verified_review: true,
      is_visible: true,
    };

    const { error } = await supabaseAdmin.from("service_feedback").insert(payload);
    if (error) throw error;
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error submitting feedback:', err);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
};

export const getMatchingRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabaseAdmin.rpc("matching_requests_for_provider", { _provider: userId });
    
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error fetching matching requests:', err);
    res.status(500).json({ error: 'Failed to fetch matching requests' });
  }
};
