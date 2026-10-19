import { supabaseAdmin } from "../lib/supabaseClient.js";

// Users
export async function getUsers(req, res) {
  try {
    const { data: baseList, error } = await supabaseAdmin.from("profiles")
      .select("id,full_name,is_provider,created_at")
      .order("created_at", { ascending: false }).limit(200);
    if (error) throw error;
    
    const ids = (baseList || []).map(r => r.id);
    let cards = [], contacts = [], roles = [];
    
    if (ids.length > 0) {
      const [cardsRes, contactsRes, rolesRes] = await Promise.all([
        supabaseAdmin.rpc("get_profile_cards", { _ids: ids }),
        supabaseAdmin.rpc("admin_list_user_contacts", { _ids: ids }),
        supabaseAdmin.rpc("admin_list_user_roles", { _ids: ids })
      ]);
      cards = cardsRes.data || [];
      contacts = contactsRes.data || [];
      roles = rolesRes.data || [];
    }

    const locMap = new Map(cards.map(c => [c.id, { district: c.district, town: c.town }]));
    const list = baseList.map(r => ({
      ...r,
      district: locMap.get(r.id)?.district || null,
      town: locMap.get(r.id)?.town || null
    }));

    const cmap = {};
    for (const c of contacts) cmap[c.id] = { email: c.email, phone: c.phone };
    
    const rmap = {};
    for (const r of roles) {
      if (["admin", "moderator", "finance_admin"].includes(r.role)) {
        (rmap[r.user_id] ||= []).push(r.role);
      }
    }

    res.json({ data: { users: list, contacts: cmap, roles: rmap } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function toggleRole(req, res) {
  try {
    const { id: userId, role } = req.params;
    const { has } = req.body;
    const fn = has ? "admin_revoke_role" : "admin_grant_role";
    const { error } = await supabaseAdmin.rpc(fn, { _user_id: userId, _role: role });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

// Providers
export async function getProviders(req, res) {
  try {
    const [spRes, pubPRes, vssRes, provProfilesRes] = await Promise.all([
      supabaseAdmin.from('service_profiles').select('user_id, business_name, subcategory, verified, suspended'),
      supabaseAdmin.from('public_profiles').select('id, owner_id, name, subcategory, verified, suspended, avatar_url'),
      supabaseAdmin.from('v_search_services_enriched').select('user_id, business_name, subcategory, verified, profile_full_name, final_avatar_url'),
      supabaseAdmin.from('profiles').select('id, full_name, avatar_url, is_provider').eq('is_provider', true)
    ]);

    const map = new Map();

    const getOrSet = (userId) => {
      if (!map.has(userId)) {
        map.set(userId, {
          user_id: userId,
          business_name: null,
          subcategory: 'General Services',
          verified: 'none',
          suspended: false,
          services_count: 0,
          profile: { full_name: 'Unnamed Provider', avatar_url: null }
        });
      }
      return map.get(userId);
    };

    // 1. Add from v_search_services_enriched (active directory listings)
    for (const s of (vssRes.data || [])) {
      if (!s.user_id) continue;
      const p = getOrSet(s.user_id);
      p.services_count++;
      if (!p.business_name && s.business_name) p.business_name = s.business_name;
      if ((!p.subcategory || p.subcategory === 'General Services') && s.subcategory) p.subcategory = s.subcategory;
      if (s.verified && s.verified !== 'none' && s.verified !== 'unverified') p.verified = s.verified;
      if (s.profile_full_name && p.profile.full_name === 'Unnamed Provider') p.profile.full_name = s.profile_full_name;
      if (s.final_avatar_url && !p.profile.avatar_url) p.profile.avatar_url = s.final_avatar_url;
    }

    // 2. Add / enrich from public_profiles
    for (const pb of (pubPRes.data || [])) {
      if (!pb.owner_id) continue;
      const p = getOrSet(pb.owner_id);
      if (!p.business_name && pb.name) p.business_name = pb.name;
      if ((!p.subcategory || p.subcategory === 'General Services') && pb.subcategory) p.subcategory = pb.subcategory;
      if (pb.verified && pb.verified !== 'none') p.verified = pb.verified;
      if (pb.suspended) p.suspended = true;
      if (pb.avatar_url && !p.profile.avatar_url) p.profile.avatar_url = pb.avatar_url;
    }

    // 3. Add / enrich from service_profiles
    for (const sp of (spRes.data || [])) {
      if (!sp.user_id) continue;
      const p = getOrSet(sp.user_id);
      if (!p.business_name && sp.business_name) p.business_name = sp.business_name;
      if ((!p.subcategory || p.subcategory === 'General Services') && sp.subcategory) p.subcategory = sp.subcategory;
      if (sp.verified && sp.verified !== 'none') p.verified = sp.verified;
      if (sp.suspended) p.suspended = true;
    }

    // 4. Enrich with provider user profiles
    for (const up of (provProfilesRes.data || [])) {
      if (!up.id) continue;
      const p = getOrSet(up.id);
      if (up.full_name && (p.profile.full_name === 'Unnamed Provider' || !p.profile.full_name)) {
        p.profile.full_name = up.full_name;
      }
      if (up.avatar_url && !p.profile.avatar_url) {
        p.profile.avatar_url = up.avatar_url;
      }
    }

    // Fetch full_name for any providers still unnamed
    const missingNames = Array.from(map.values())
      .filter(p => !p.profile.full_name || p.profile.full_name === 'Unnamed Provider')
      .map(p => p.user_id);

    if (missingNames.length > 0) {
      const { data: profs } = await supabaseAdmin.from('profiles').select('id, full_name, avatar_url').in('id', missingNames);
      for (const pr of (profs || [])) {
        const p = map.get(pr.id);
        if (p) {
          if (pr.full_name) p.profile.full_name = pr.full_name;
          if (pr.avatar_url && !p.profile.avatar_url) p.profile.avatar_url = pr.avatar_url;
        }
      }
    }

    const result = Array.from(map.values()).sort((a, b) => {
      const rank = { featured: 3, verified: 2, none: 1, unverified: 1 };
      const rA = rank[a.verified] || 1;
      const rB = rank[b.verified] || 1;
      if (rA !== rB) return rB - rA;
      return b.services_count - a.services_count;
    });

    res.json({ data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function updateProviderStatus(req, res) {
  try {
    const { id } = req.params;
    const { verified, suspended } = req.body;
    const updates = {};
    if (verified !== undefined) updates.verified = verified;
    if (suspended !== undefined) updates.suspended = suspended;
    
    // Update across service_profiles, public_profiles, and profiles
    await Promise.allSettled([
      supabaseAdmin.from("service_profiles").update(updates).eq("user_id", id),
      supabaseAdmin.from("public_profiles").update(updates).eq("owner_id", id),
      verified === "verified" || verified === "featured"
        ? supabaseAdmin.from("profiles").update({ is_provider: true }).eq("id", id)
        : Promise.resolve()
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

// Posts
export async function getPosts(req, res) {
  try {
    const { data: p, error } = await supabaseAdmin.from("timeline_posts").select("*").order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    
    const ids = Array.from(new Set((p || []).map(x => x.provider_user_id)));
    let pm = [];
    if (ids.length > 0) {
      const { data } = await supabaseAdmin.from("profiles").select("id,full_name,avatar_url").in("id", ids);
      pm = data || [];
    }
    
    const map = new Map(pm.map(x => [x.id, { full_name: x.full_name, avatar_url: x.avatar_url }]));
    const result = (p || []).map(x => ({ ...x, author: map.get(x.provider_user_id) }));
    
    res.json({ data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function updatePost(req, res) {
  try {
    const { id } = req.params;
    const { featured } = req.body;
    const { error } = await supabaseAdmin.from("timeline_posts").update({ featured }).eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

// Recs
export async function getRecs(req, res) {
  try {
    const { data, error } = await supabaseAdmin.from("provider_recommendations").select("*").order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function updateRec(req, res) {
  try {
    const { id } = req.params;
    const { hidden } = req.body;
    const { error } = await supabaseAdmin.from("provider_recommendations").update({ hidden }).eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

// Reports
export async function getReports(req, res) {
  try {
    const { status } = req.query;
    let q = supabaseAdmin.from("reports").select("*").order("created_at", { ascending: false }).limit(100);
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

export async function updateReport(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { error } = await supabaseAdmin.from("reports").update({ status }).eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

// Official
export async function getOfficialData(req, res) {
  try {
    const [a, p, sp, c] = await Promise.all([
      supabaseAdmin.from("official_accounts").select("*").order("created_at").limit(1).maybeSingle(),
      supabaseAdmin.from("official_posts").select("*").order("created_at", { ascending: false }).limit(100),
      supabaseAdmin.from("service_profiles").select("user_id,business_name,subcategory,seeded_status,verified").eq("seeded_by_official", true),
      supabaseAdmin.from("profile_claim_requests").select("id,service_profile_user_id,requester_user_id,full_name,relationship_to_profile,explanation,status,created_at").order("created_at", { ascending: false }),
    ]);
    res.json({
      data: {
        account: a.data || null,
        posts: p.data || [],
        seeded: sp.data || [],
        claims: c.data || []
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function revealClaimContact(req, res) {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin.rpc("get_profile_claim_contact", { _id: id });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    res.json({ data: row });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function updateOfficialPost(req, res) {
  try {
    const { id } = req.params;
    const payload = req.body;
    // Check if it's the { field, value } format or the full payload format
    let patch;
    if (payload.field !== undefined && payload.value !== undefined) {
      patch = { [payload.field]: payload.value };
    } else {
      patch = payload;
    }
    const { error } = await supabaseAdmin.from("official_posts").update(patch).eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function createOfficialPost(req, res) {
  try {
    const payload = req.body;
    const { error } = await supabaseAdmin.from("official_posts").insert(payload);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export const deleteOfficialPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from("official_posts").delete().eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export const getOfficialPostInteractions = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    const [{ data: lc }, { count: cc }] = await Promise.all([
      supabaseAdmin.rpc("get_official_post_like_count", { _post_id: id }),
      supabaseAdmin.from("official_post_comments").select("*", { count: "exact", head: true }).eq("post_id", id)
    ]);
    
    let liked = false;
    if (userId) {
      const { data } = await supabaseAdmin.from("official_post_likes").select("post_id").eq("post_id", id).eq("user_id", userId).maybeSingle();
      liked = !!data;
    }
    
    res.json({ data: { likes: typeof lc === "number" ? lc : 0, liked, commentCount: cc || 0 } });
  } catch (err) {
    console.error('Error fetching official post interactions:', err);
    res.status(500).json({ error: 'Failed to fetch interactions' });
  }
};

export const toggleOfficialPostLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const { data: existing } = await supabaseAdmin.from("official_post_likes").select("post_id").eq("post_id", id).eq("user_id", userId).maybeSingle();
    
    if (existing) {
      await supabaseAdmin.from("official_post_likes").delete().eq("post_id", id).eq("user_id", userId);
      res.json({ liked: false });
    } else {
      await supabaseAdmin.from("official_post_likes").insert({ post_id: id, user_id: userId });
      res.json({ liked: true });
    }
  } catch (err) {
    console.error('Error toggling official post like:', err);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
};

export async function updateSeededStatus(req, res) {
  try {
    const { id: uid } = req.params;
    const { seeded_status } = req.body;
    const { error } = await supabaseAdmin.from("service_profiles").update({ seeded_status, seeded_by_official: true }).eq("user_id", uid);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function reviewClaim(req, res) {
  try {
    const { id } = req.params;
    const { requester_user_id, service_profile_user_id, decision } = req.body;
    
    await supabaseAdmin.from("profile_claim_requests").update({ status: decision, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (decision === "approved") {
      await supabaseAdmin.from("service_profiles").update({ seeded_status: "claimed", user_id: requester_user_id }).eq("user_id", service_profile_user_id);
    } else {
      await supabaseAdmin.from("service_profiles").update({ seeded_status: "unclaimed" }).eq("user_id", service_profile_user_id);
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
