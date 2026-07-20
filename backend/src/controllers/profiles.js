import { supabaseAdmin } from '../lib/supabaseClient.js';

// ---- Private User Profile (profiles table) ----

export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabaseAdmin.rpc("get_my_profile", {
      user_id_param: userId
    }).maybeSingle();

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error fetching my profile:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const getMyRoles = async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
    if (error) throw error;
    res.json({ data: (data || []).map(r => r.role) });
  } catch (err) {
    console.error('Error fetching my roles:', err);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
};

export const getMyCounts = async (req, res) => {
  try {
    const userId = req.user.id;
    const [
      { count: notificationsCount },
      { count: activeRequestsCount },
      { data: unreadMessagesData }
    ] = await Promise.all([
      supabaseAdmin.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("read", false),
      supabaseAdmin.from("service_requests").select("*", { count: "exact", head: true }).eq("customer_id", userId).not("status", "in", "(completed,cancelled)"),
      supabaseAdmin.rpc("get_unread_message_count", { _user_id: userId })
    ]);
    
    // Note: get_unread_message_count usually uses auth.uid() in supabase, 
    // but here we might need to modify it or we just query conversations manually if it fails
    // Let's assume get_unread_message_count is not modified for admin yet, so let's query it manually:
    // A user's unread messages count is the number of conversations where user_id matches and unread_count > 0
    // Actually, `get_unread_message_count` is a view or RPC. Let's just query `conversations` where user is participant.
    // Wait, the original code did: `supabase.rpc("get_unread_message_count")`. We'll keep it simple and just do it manually.
    
    const { data: convs } = await supabaseAdmin.from("conversations").select("unread_count").or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`);
    const unreadMessagesCount = (convs || []).reduce((acc, c) => acc + (c.unread_count || 0), 0);

    res.json({
      data: {
        notifications: notificationsCount || 0,
        activeRequests: activeRequestsCount || 0,
        unreadMessages: unreadMessagesCount || 0
      }
    });
  } catch (err) {
    console.error('Error fetching my counts:', err);
    res.status(500).json({ error: 'Failed to fetch counts' });
  }
};

export const getMyPostAsOptions = async (req, res) => {
  try {
    const userId = req.user.id;
    const [{ data: me }, { data: sp }, { data: bp }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,full_name,avatar_url").eq("id", userId).maybeSingle(),
      supabaseAdmin.from("service_profiles").select("user_id,business_name,cover_url").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("business_pages").select("id,name,logo_url").eq("owner_id", userId),
    ]);
    res.json({ data: { me, sp, bp } });
  } catch (err) {
    console.error('Error fetching post as options:', err);
    res.status(500).json({ error: 'Failed to fetch options' });
  }
};

export const getProviderContacts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { data } = await supabaseAdmin
      .from("contact_logs")
      .select("customer_id,service_request_id,contact_method,clicked_at")
      .eq("provider_id", userId)
      .order("clicked_at", { ascending: false })
      .limit(100);
      
    const map = new Map();
    for (const r of (data || [])) {
      const key = r.customer_id;
      const existing = map.get(key);
      if (existing) {
        existing.methods.add(r.contact_method);
      } else {
        map.set(key, { 
          customer_id: r.customer_id, 
          service_request_id: r.service_request_id, 
          last_at: r.clicked_at, 
          methods: new Set([r.contact_method]) 
        });
      }
    }
    const list = Array.from(map.values());
    const ids = list.map((r) => r.customer_id);
    const { data: profs } = ids.length
      ? await supabaseAdmin.from("profiles").select("id,full_name,avatar_url").in("id", ids)
      : { data: [] };
    const pm = new Map((profs || []).map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]));
    
    // Transform Sets to arrays for JSON serialization
    const finalData = list.map((r) => ({ 
      ...r, 
      methods: Array.from(r.methods),
      profile: pm.get(r.customer_id) 
    }));
    
    res.json({ data: finalData });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
};

export const getCustomerContacts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 5 } = req.query;
    
    const { data } = await supabaseAdmin
      .from("contact_logs")
      .select("provider_id,service_request_id,contact_method,clicked_at")
      .eq("customer_id", userId)
      .order("clicked_at", { ascending: false })
      .limit(parseInt(limit, 10) || 100);
      
    const map = new Map();
    for (const r of (data || [])) {
      const key = r.provider_id;
      const existing = map.get(key);
      if (existing) {
        existing.methods.add(r.contact_method);
      } else {
        map.set(key, { 
          provider_id: r.provider_id, 
          service_request_id: r.service_request_id, 
          last_at: r.clicked_at, 
          methods: new Set([r.contact_method]) 
        });
      }
    }
    const list = Array.from(map.values()).slice(0, parseInt(limit, 10) || 5);
    const ids = list.map((r) => r.provider_id);
    const { data: profs } = ids.length
      ? await supabaseAdmin.from("profiles").select("id,full_name,avatar_url").in("id", ids)
      : { data: [] };
    const pm = new Map((profs || []).map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]));
    
    // Transform Sets to arrays for JSON serialization
    const finalData = list.map((r) => ({ 
      ...r, 
      methods: Array.from(r.methods),
      profile: pm.get(r.provider_id) 
    }));
    
    res.json({ data: finalData });
  } catch (err) {
    console.error('Error fetching customer contacts:', err);
    res.status(500).json({ error: 'Failed to fetch customer contacts' });
  }
};

export const getMyPublicProfiles = async (req, res) => {
  try {
    const userId = req.user.id;
    const { data: profiles, error: pError } = await supabaseAdmin
      .from("public_profiles")
      .select("id,name,profile_type,category_slug,subcategory,district,town,verified,avatar_url")
      .eq("owner_id", userId)
      .order("created_at", { ascending: true });

    if (pError) throw pError;

    const list = profiles || [];
    const enriched = await Promise.all(
      list.map(async (p) => {
        const [{ count: sc }, { count: pr }, { data: reviewsRes }] = await Promise.all([
          supabaseAdmin.from("profile_services").select("*", { count: "exact", head: true }).eq("profile_id", p.id),
          supabaseAdmin.from("service_requests").select("*", { count: "exact", head: true }).eq("public_profile_id", p.id).eq("status", "requested"),
          supabaseAdmin.from("reviews").select("rating").eq("public_profile_id", p.id),
        ]);
        const ratings = (reviewsRes || []).map((r) => r.rating).filter((n) => typeof n === "number");
        const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
        return {
          ...p,
          serviceCount: sc || 0,
          pendingRequests: pr || 0,
          rating: avg,
          reviewCount: ratings.length,
        };
      })
    );
    res.json({ data: enriched });
  } catch (err) {
    console.error('Error fetching my public profiles:', err);
    res.status(500).json({ error: 'Failed to fetch public profiles' });
  }
};

export const deletePublicProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    // Verify ownership
    const { data: existing, error: err1 } = await supabaseAdmin
      .from("public_profiles")
      .select("owner_id")
      .eq("id", id)
      .single();
      
    if (err1 || existing.owner_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await supabaseAdmin.from("profile_services").delete().eq("profile_id", id);
    const { error } = await supabaseAdmin.from("public_profiles").delete().eq("id", id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting public profile:', err);
    res.status(500).json({ error: 'Failed to delete public profile' });
  }
};

export const browseProfiles = async (req, res) => {
  try {
    const { data: profiles, error: pError } = await supabaseAdmin
      .from("public_profiles")
      .select("id,owner_id,slug,name,profile_type,bio,avatar_url,cover_url,district,town,area,verified,is_featured")
      .eq("suspended", false)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);

    if (pError) throw pError;
    
    let services = [];
    if (profiles && profiles.length > 0) {
      const ids = profiles.map((p) => p.id);
      const { data: ps, error: sError } = await supabaseAdmin
        .from("profile_services")
        .select("id,profile_id,title,is_primary,price_type,price_fixed_ugx,price_min_ugx,price_max_ugx,price_currency")
        .in("profile_id", ids)
        .eq("active", true)
        .order("is_primary", { ascending: false })
        .order("sort_order");
        
      if (!sError) {
        services = ps || [];
      }
    }
    
    res.json({ data: { profiles: profiles || [], services } });
  } catch (err) {
    console.error('Error browsing profiles:', err);
    res.status(500).json({ error: 'Failed to browse profiles' });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const patch = req.body;
    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const updateMyProfileFull = async (req, res) => {
  try {
    const userId = req.user.id;
    const { profilePatch, serviceProfilePatch } = req.body;

    if (profilePatch) {
      const { error: e1 } = await supabaseAdmin.from("profiles").update(profilePatch).eq("id", userId);
      if (e1) throw e1;
    }

    if (serviceProfilePatch) {
      const { error: e2 } = await supabaseAdmin.from("service_profiles").update(serviceProfilePatch).eq("user_id", userId);
      if (e2) throw e2;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating full profile:', err);
    res.status(500).json({ error: 'Failed to update full profile' });
  }
};

export const getMyProfileDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { data: p } = await supabaseAdmin.rpc("get_my_profile", { user_id_param: userId }).maybeSingle();
    
    const [
      { data: f },
      { data: s },
      { count: rc },
      { count: rec }
    ] = await Promise.all([
      supabaseAdmin.from("follows").select("provider_user_id").eq("follower_id", userId),
      supabaseAdmin.from("saved_providers").select("provider_user_id").eq("user_id", userId),
      supabaseAdmin.from("reviews").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabaseAdmin.from("provider_recommendations").select("*", { count: "exact", head: true }).eq("user_id", userId)
    ]);

    const fIds = (f || []).map(x => x.provider_user_id);
    let following = [];
    if (fIds.length) {
      const { data: ps } = await supabaseAdmin.from("profiles").select("id,full_name,avatar_url").in("id", fIds);
      following = ps || [];
    }

    const sIds = (s || []).map(x => x.provider_user_id);
    let saved = [];
    if (sIds.length) {
      const { data: ps } = await supabaseAdmin.from("profiles").select("id,full_name,avatar_url").in("id", sIds);
      saved = ps || [];
    }

    res.json({
      data: {
        profile: p,
        following,
        saved,
        reviewsCount: rc || 0,
        recsCount: rec || 0
      }
    });
  } catch (err) {
    console.error('Error fetching my profile details:', err);
    res.status(500).json({ error: 'Failed to fetch my profile details' });
  }
};

export const getPrivacySettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabaseAdmin
      .from('provider_privacy_settings')
      .select('contact_reveal_policy,phone_visibility')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error fetching privacy settings:', err);
    res.status(500).json({ error: 'Failed to fetch privacy settings' });
  }
};

export const updatePrivacySettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const patch = req.body;
    const { data, error } = await supabaseAdmin
      .from('provider_privacy_settings')
      .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" })
      .select()
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error updating privacy settings:', err);
    res.status(500).json({ error: 'Failed to update privacy settings' });
  }
};

export const getProviderTrustStats = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from('provider_trust_stats')
      .select('*')
      .eq('provider_id', id)
      .maybeSingle();

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error fetching provider trust stats:', err);
    res.status(500).json({ error: 'Failed to fetch trust stats' });
  }
};

// ---- Public Profiles (public_profiles table) ----

export const getProfileById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from('public_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Profile not found' });
    
    res.json({ data });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const createPublicProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const payload = { ...req.body, owner_id: userId };
    
    const { data, error } = await supabaseAdmin
      .from('public_profiles')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    console.error('Error creating public profile:', err);
    res.status(500).json({ error: 'Failed to create public profile' });
  }
};

export const updatePublicProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const payload = req.body;
    
    // Make sure the user owns the profile
    const { data: existing, error: err1 } = await supabaseAdmin
      .from('public_profiles')
      .select('owner_id')
      .eq('id', id)
      .single();
      
    if (err1 || existing.owner_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to update this profile' });
    }

    const { data, error } = await supabaseAdmin
      .from('public_profiles')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error updating public profile:', err);
    res.status(500).json({ error: 'Failed to update public profile' });
  }
};

export const getFullProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const [profileRes, spRes] = await Promise.all([
      supabaseAdmin.rpc("get_profile_card", { _id: id }).maybeSingle(),
      supabaseAdmin.from("service_profiles").select("business_name,subcategory,bio,category_slug,district,town,verified").eq("user_id", id).maybeSingle(),
    ]);

    res.json({ data: { profile: profileRes.data, sp: spRes.data } });
  } catch (err) {
    console.error('Error fetching full profile:', err);
    res.status(500).json({ error: 'Failed to fetch full profile' });
  }
};

export const getPublicProfileBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const { data: p } = await supabaseAdmin
      .from("public_profiles")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
      
    if (!p) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const [{ data: sp }, { data: ownerRow }, { data: mediaRows }, { data: s }, { data: t }, { count: c }] = await Promise.all([
      supabaseAdmin
        .from("service_profiles")
        .select("price_display,price_min,price_max,created_at")
        .eq("user_id", p.owner_id)
        .maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("id,full_name,avatar_url")
        .eq("id", p.owner_id)
        .maybeSingle(),
      supabaseAdmin
        .from("service_media")
        .select("id,kind,url,thumbnail_url,is_cover,sort_order")
        .eq("public_profile_id", p.id)
        .order("is_cover", { ascending: false })
        .order("sort_order"),
      supabaseAdmin
        .from("profile_services")
        .select(
          "id,title,description,price_guidance_ugx,active,is_primary,price_type,price_fixed_ugx,price_min_ugx,price_max_ugx,price_currency,price_note",
        )
        .eq("profile_id", p.id)
        .eq("active", true)
        .order("is_primary", { ascending: false })
        .order("sort_order"),
      supabaseAdmin
        .from("timeline_posts")
        .select("*")
        .eq("public_profile_id", p.id)
        .eq("hidden", false)
        .order("created_at", { ascending: false })
        .limit(30),
      supabaseAdmin
        .from("service_requests")
        .select("*", { count: "exact", head: true })
        .eq("public_profile_id", p.id)
        .eq("status", "completed"),
    ]);

    res.json({
      data: {
        profile: p,
        extras: sp,
        owner: ownerRow,
        media: mediaRows || [],
        services: s || [],
        posts: t || [],
        completedCount: c || 0
      }
    });
  } catch (err) {
    console.error('Error fetching public profile by slug:', err);
    res.status(500).json({ error: 'Failed to fetch public profile by slug' });
  }
};

export const getProviderAuxData = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id; // Optional if public

    let contact = null;
    if (userId) {
      const { data: c } = await supabaseAdmin.rpc("get_provider_contact", { _provider: id }).maybeSingle();
      contact = c || {};
    }

    let services = [];
    let ownerPublicProfileId = null;
    const { data: pubProfiles } = await supabaseAdmin.from("public_profiles").select("id").eq("owner_id", id);
    const pubIds = (pubProfiles || []).map((p) => p.id);
    ownerPublicProfileId = pubIds[0] || null;

    if (pubIds.length) {
      const { data: svcRows } = await supabaseAdmin
        .from("profile_services")
        .select("id,title,description,active,is_primary,price_type,price_fixed_ugx,price_min_ugx,price_max_ugx,price_currency,price_note,price_guidance_ugx")
        .in("profile_id", pubIds)
        .order("is_primary", { ascending: false })
        .order("sort_order", { ascending: true });
      services = userId === id ? svcRows : (svcRows || []).filter((r) => r.active);
    }

    const { data: ps } = await supabaseAdmin.from("timeline_posts").select("*").eq("provider_user_id", id).eq("hidden", false).order("created_at", { ascending: false });
    
    const [fcRes, rRes, vRes] = await Promise.all([
      supabaseAdmin.rpc("get_provider_follower_count", { _provider: id }),
      supabaseAdmin.from("provider_recommendations").select("id,service,message,rating,created_at,user_id").eq("provider_user_id", id).eq("hidden", false).order("created_at", { ascending: false }),
      supabaseAdmin.from("reviews").select("id,rating,text,created_at,user_id").eq("provider_user_id", id).eq("hidden", false).order("created_at", { ascending: false }),
    ]);

    const followers = typeof fcRes.data === "number" ? fcRes.data : 0;
    const ids = Array.from(new Set([...(rRes.data || []).map((r) => r.user_id), ...(vRes.data || []).map((r) => r.user_id)]));
    
    let pm = new Map();
    if (ids.length) {
      const { data: ps2 } = await supabaseAdmin.from("profiles").select("id,full_name,avatar_url").in("id", ids);
      (ps2 || []).forEach(pp => pm.set(pp.id, { full_name: pp.full_name, avatar_url: pp.avatar_url }));
    }

    const recs = (rRes.data || []).map((r) => ({ ...r, profile: pm.get(r.user_id) }));
    const reviews = (vRes.data || []).map((r) => ({ ...r, profile: pm.get(r.user_id) }));

    const { data: fbRes } = await supabaseAdmin.from("service_feedback")
      .select("id,rating,review_text,service_provided,created_at,customer_id,would_recommend")
      .eq("provider_id", id).eq("is_visible", true).order("created_at", { ascending: false });
    
    const fbList = fbRes || [];
    const fbIds = Array.from(new Set(fbList.map((f) => f.customer_id).filter((x) => !pm.has(x))));
    
    if (fbIds.length) {
      const { data: ps3 } = await supabaseAdmin.from("profiles").select("id,full_name,avatar_url").in("id", fbIds);
      (ps3 || []).forEach((p) => pm.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url }));
    }
    const feedback = fbList.map((f) => ({ ...f, profile: pm.get(f.customer_id) }));

    let canReview = false;
    if (userId && userId !== id) {
      const { count: completedCount } = await supabaseAdmin
        .from("service_requests")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", userId)
        .eq("provider_id", id)
        .eq("status", "completed");
      canReview = (completedCount || 0) > 0;
    }

    res.json({
      data: {
        contact, services, posts: ps || [], followers, recs, reviews, feedback, canReview, ownerPublicProfileId
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch aux data' });
  }
};

export const submitProfileReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { profile_kind, profile_id, reason, description } = req.body;
    
    const { error } = await supabaseAdmin.from("profile_reports").insert({
      profile_kind,
      profile_id,
      reporter_id: userId,
      reason,
      description: description || null,
    });
    
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Error submitting profile report:', err);
    res.status(500).json({ error: 'Failed to submit profile report' });
  }
};

export const getSuspendedStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { data } = await supabaseAdmin.from("service_profiles").select("suspended").eq("user_id", userId).maybeSingle();
    res.json({ suspended: !!data?.suspended });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch suspended status' });
  }
};

export const submitClaimRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      service_profile_user_id, full_name, phone_number, whatsapp_number, 
      email, relationship_to_profile, explanation, supporting_file_url 
    } = req.body;
    
    const { error: insertError } = await supabaseAdmin.from("profile_claim_requests").insert({
      service_profile_user_id,
      requester_user_id: userId,
      full_name,
      phone_number,
      whatsapp_number: whatsapp_number || null,
      email: email || null,
      relationship_to_profile,
      explanation,
      supporting_file_url: supporting_file_url || null,
    });
    if (insertError) throw insertError;
    
    const { error: updateError } = await supabaseAdmin.from("service_profiles")
      .update({ seeded_status: "claim_pending" })
      .eq("user_id", service_profile_user_id);
    if (updateError) throw updateError;
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error submitting claim request:', err);
    res.status(500).json({ error: 'Failed to submit claim request' });
  }
};
