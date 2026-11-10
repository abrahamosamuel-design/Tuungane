import { supabaseAdmin } from "../lib/supabaseClient.js";

export async function getOverviewStats(req, res) {
  try {
    const head = { count: "exact", head: true };
    const [
      u,
      pProfiles,
      allProfilesStatus,
      vss,
      ps,
      tp,
      o,
      r,
      rep,
      profRep,
      dis,
      cl,
      cpReqs,
      verReqs,
      po,
      sp,
      pp,
      pts,
      wallets,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*", head),
      supabaseAdmin.from("profiles").select("*", head).eq("is_provider", true),
      supabaseAdmin.from("profiles").select("id,registration_status"),
      supabaseAdmin.from("v_search_services").select("service_id,user_id"),
      supabaseAdmin.from("profile_services").select("id,user_profile_id,profile_id,active"),
      supabaseAdmin.from("timeline_posts").select("*", head),
      supabaseAdmin.from("opportunities").select("*", head).eq("archived", false),
      supabaseAdmin.from("service_requests").select("*", head),
      supabaseAdmin.from("reports").select("*", head).eq("status", "open"),
      supabaseAdmin.from("profile_reports").select("*", head).eq("status", "open"),
      supabaseAdmin.from("service_disputes").select("*", head).eq("status", "open"),
      supabaseAdmin.from("profile_claim_requests").select("*", head).eq("status", "pending"),
      supabaseAdmin.from("credit_purchase_requests").select("id,user_id,credits_requested,amount_ugx,status"),
      supabaseAdmin.from("profile_verification_requests").select("*", head).in("status", ["pending", "more_info"]),
      supabaseAdmin.from("opportunities").select("*", head).eq("status", "pending"),
      supabaseAdmin.from("service_profiles").select("user_id,verified,suspended"),
      supabaseAdmin.from("public_profiles").select("id,owner_id,verified,suspended"),
      supabaseAdmin.from("profile_trust_status").select("profile_id,owner_user_id,manual_level,manual_reason"),
      supabaseAdmin.from("credit_wallets").select("balance"),
    ]);

    const uniqueProviders = new Set((vss.data || []).map((x) => x.user_id).filter(Boolean));
    for (const row of sp.data || []) if (row.user_id) uniqueProviders.add(row.user_id);
    for (const row of pp.data || []) if (row.owner_id) uniqueProviders.add(row.owner_id);
    const providerCount = Math.max(uniqueProviders.size, pProfiles.count || 0);

    // Total unique services posted across profile_services and v_search_services
    const uniqueServiceIds = new Set();
    for (const row of ps.data || []) if (row.id) uniqueServiceIds.add(row.id);
    for (const row of vss.data || []) if (row.service_id) uniqueServiceIds.add(row.service_id);
    const totalServices = uniqueServiceIds.size;

    // Count verified providers & suspended users
    const verifiedSet = new Set();
    const suspendedSet = new Set();
    for (const row of allProfilesStatus.data || []) {
      if (row.registration_status === "suspended") suspendedSet.add(row.id);
      if (row.registration_status === "verified" || row.registration_status === "featured") verifiedSet.add(row.id);
    }
    for (const row of sp.data || []) {
      if (row.suspended) suspendedSet.add(row.user_id);
      if (row.verified === "verified" || row.verified === "featured") verifiedSet.add(row.user_id);
    }
    for (const row of pp.data || []) {
      if (row.suspended && row.owner_id) suspendedSet.add(row.owner_id);
      if ((row.verified === "verified" || row.verified === "featured") && row.owner_id) verifiedSet.add(row.owner_id);
    }
    for (const row of pts.data || []) {
      const uid = row.owner_user_id || row.profile_id;
      if (!uid) continue;
      if (row.manual_level === "suspended") suspendedSet.add(uid);
      if (
        row.manual_level === "verified_provider" ||
        row.manual_level === "verified_business" ||
        row.manual_level === "verified_organization"
      ) {
        verifiedSet.add(uid);
      }
    }

    // Credit & revenue stats
    const allPurchaseReqs = cpReqs.data || [];
    const paidReqs = allPurchaseReqs.filter((x) => x.status === "paid" || x.status === "approved");
    const pendingReqs = allPurchaseReqs.filter((x) => x.status === "pending");

    const creditsBoughtTotal = paidReqs.reduce((sum, x) => sum + Number(x.credits_requested || 0), 0);
    const creditRevenueUgx = paidReqs.reduce((sum, x) => sum + Number(x.amount_ugx || 0), 0);
    const pendingCreditRevenueUgx = pendingReqs.reduce((sum, x) => sum + Number(x.amount_ugx || 0), 0);
    const uniqueCreditBuyers = new Set(paidReqs.map((x) => x.user_id)).size;
    const totalWalletBalance = (wallets.data || []).reduce((sum, w) => sum + Number(w.balance || 0), 0);

    res.json({
      data: {
        users: u.count || 0,
        suspendedUsers: suspendedSet.size,
        providers: providerCount,
        verifiedProviders: verifiedSet.size,
        services: totalServices,
        profileServices: (ps.data || []).length,
        posts: tp.count || 0,
        opportunities: o.count || 0,
        requests: r.count || 0,
        openReports: (rep.count || 0) + (profRep.count || 0),
        openDisputes: dis.count || 0,
        pendingClaims: cl.count || 0,
        pendingPurchases: pendingReqs.length,
        pendingVerifications: verReqs.count || 0,
        pendingOpps: po.count || 0,
        creditsBoughtTotal,
        creditRevenueUgx,
        pendingCreditRevenueUgx,
        paidPurchasesCount: paidReqs.length,
        uniqueCreditBuyers,
        totalWalletBalance,
      },
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
    const params = {
      _q: q || null,
      _limit: limit ? parseInt(limit) : 200,
      _offset: offset ? parseInt(offset) : 0,
      _from: from || null,
      _to: to || null,
    };
    const { data, error } = await supabaseAdmin.rpc("admin_search_activity_log", params);
    if (error) {
      const { data: directData, error: directErr } = await supabaseAdmin
        .from("admin_activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (directErr) throw directErr;
      return res.json({ data: directData || [] });
    }
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
