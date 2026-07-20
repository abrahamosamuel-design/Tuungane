import { supabaseAdmin } from "../lib/supabaseClient.js";

export async function getOverviewStats(req, res) {
  try {
    const head = { count: "exact", head: true };
    const [u, p, o, r, rep, dis, cl, cp, po] = await Promise.all([
      supabaseAdmin.from("profiles").select("*", head),
      supabaseAdmin.from("service_profiles").select("*", head),
      supabaseAdmin.from("opportunities").select("*", head).eq("archived", false),
      supabaseAdmin.from("service_requests").select("*", head),
      supabaseAdmin.from("reports").select("*", head).eq("status", "open"),
      supabaseAdmin.from("service_disputes").select("*", head).eq("status", "open"),
      supabaseAdmin.from("profile_claim_requests").select("*", head).eq("status", "pending"),
      supabaseAdmin.from("credit_purchase_requests").select("*", head).eq("status", "pending"),
      supabaseAdmin.from("opportunities").select("*", head).eq("status", "pending"),
    ]);

    res.json({
      data: {
        users: u.count || 0,
        providers: p.count || 0,
        opportunities: o.count || 0,
        requests: r.count || 0,
        openReports: rep.count || 0,
        openDisputes: dis.count || 0,
        pendingClaims: cl.count || 0,
        pendingPurchases: cp.count || 0,
        pendingOpps: po.count || 0,
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function getDisputes(req, res) {
  try {
    const { status } = req.query;
    let q = supabaseAdmin.from("service_disputes").select("*").order("created_at", { ascending: false }).limit(100);
    if (status && status !== "all") {
      q = q.eq("status", status);
    }
    const { data, error } = await q;
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function updateDispute(req, res) {
  try {
    const { id } = req.params;
    const { status, admin_notes, resolved_at } = req.body;
    const patch = { status };
    if (admin_notes !== undefined) patch.admin_notes = admin_notes;
    if (resolved_at !== undefined) patch.resolved_at = resolved_at;
    const { error } = await supabaseAdmin.from("service_disputes").update(patch).eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function getContactAnalytics(req, res) {
  try {
    const { dateFrom, dateTo } = req.query;
    let lq = supabaseAdmin.from("contact_logs").select("*, service_requests!inner(status)").order("clicked_at", { ascending: false }).limit(200);
    if (dateFrom) lq = lq.gte("clicked_at", `${dateFrom}T00:00:00Z`);
    if (dateTo) lq = lq.lte("clicked_at", `${dateTo}T23:59:59Z`);

    let rq = supabaseAdmin.from("contact_reveals").select("*").order("created_at", { ascending: false }).limit(200);
    if (dateFrom) rq = rq.gte("created_at", `${dateFrom}T00:00:00Z`);
    if (dateTo) rq = rq.lte("created_at", `${dateTo}T23:59:59Z`);

    const [l, r, s] = await Promise.all([
      lq,
      rq,
      supabaseAdmin.from("admin_settings").select("id,setting_value").eq("setting_key", "contact_visibility").maybeSingle(),
    ]);

    const logs = l.data || [];
    const reveals = r.data || [];
    
    const ids = Array.from(new Set([...logs.flatMap(x => [x.customer_id, x.provider_id]), ...reveals.flatMap(x => [x.customer_id, x.provider_id])]));
    let profiles = [];
    if (ids.length > 0) {
      const { data } = await supabaseAdmin.from("profiles").select("id,full_name").in("id", ids);
      profiles = data || [];
    }

    res.json({
      data: {
        logs,
        reveals,
        profiles,
        settings: s.data || null
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function saveContactSettings(req, res) {
  try {
    const { settingsId, settings } = req.body;
    if (settingsId) {
      const { error } = await supabaseAdmin.from("admin_settings").update({ setting_value: settings, updated_at: new Date().toISOString() }).eq("id", settingsId);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from("admin_settings").insert({ setting_key: "contact_visibility", setting_value: settings });
      if (error) throw error;
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function getActivityLog(req, res) {
  try {
    const { q, limit, offset, from, to } = req.query;
    const { data, error } = await supabaseAdmin.rpc("admin_search_activity_log", {
      _q: q || undefined,
      _limit: limit ? parseInt(limit) : 200,
      _offset: offset ? parseInt(offset) : 0,
      _from: from || undefined,
      _to: to || undefined,
    });
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function getLocations(req, res) {
  try {
    const [{ data: locs }, { data: setting }] = await Promise.all([
      supabaseAdmin.from("featured_locations").select("*").order("priority", { ascending: false }).order("created_at", { ascending: false }),
      supabaseAdmin.from("admin_settings").select("setting_value").eq("setting_key", "location_expansion").maybeSingle(),
    ]);
    res.json({ data: { locs: locs || [], setting: setting?.setting_value || null } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function addFeaturedLocation(req, res) {
  try {
    const { error } = await supabaseAdmin.from("featured_locations").insert(req.body);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function updateFeaturedLocation(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from("featured_locations").update(req.body).eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function deleteFeaturedLocation(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from("featured_locations").delete().eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function saveLocationSettings(req, res) {
  try {
    const { error } = await supabaseAdmin.from("admin_settings").upsert(
      { setting_key: "location_expansion", setting_value: req.body },
      { onConflict: "setting_key" }
    );
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function getCategories(req, res) {
  try {
    const [{ data: c }, { data: s }] = await Promise.all([
      supabaseAdmin.from("service_categories").select("*").order("sort_order").order("name"),
      supabaseAdmin.from("service_subcategories").select("*").order("sort_order").order("name"),
    ]);
    res.json({ data: { categories: c || [], subcategories: s || [] } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function addCategory(req, res) {
  try {
    const { error } = await supabaseAdmin.from("service_categories").insert(req.body);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from("service_categories").update(req.body).eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from("service_categories").delete().eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function addSubcategory(req, res) {
  try {
    const { error } = await supabaseAdmin.from("service_subcategories").insert(req.body);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function updateSubcategory(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from("service_subcategories").update(req.body).eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function deleteSubcategory(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from("service_subcategories").delete().eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
