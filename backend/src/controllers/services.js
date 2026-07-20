import { supabaseAdmin } from '../lib/supabaseClient.js';

export const getProfileServices = async (req, res) => {
  try {
    const { profileId } = req.params;
    const { data, error } = await supabaseAdmin
      .from('profile_services')
      .select('*')
      .eq('profile_id', profileId)
      .order('is_primary', { ascending: false })
      .order('sort_order');

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error fetching profile services:', err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
};

export const createProfileService = async (req, res) => {
  try {
    // Note: Should verify ownership of profileId in a real app
    const { profileId } = req.params;
    const payload = { ...req.body, profile_id: profileId };
    
    const { data, error } = await supabaseAdmin
      .from('profile_services')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    console.error('Error creating profile service:', err);
    res.status(500).json({ error: 'Failed to create service' });
  }
};

export const updateProfileService = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    
    const { data, error } = await supabaseAdmin
      .from('profile_services')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error updating profile service:', err);
    res.status(500).json({ error: 'Failed to update service' });
  }
};

export const setPrimaryProfileService = async (req, res) => {
  try {
    const { id } = req.params;
    // In a real app we should check if the user owns this profile_service
    const { data, error } = await supabaseAdmin
      .from('profile_services')
      .update({ is_primary: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error setting primary profile service:', err);
    res.status(500).json({ error: 'Failed to set primary service' });
  }
};

export const deleteProfileService = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('profile_services')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting profile service:', err);
    res.status(500).json({ error: 'Failed to delete service' });
  }
};

export const getServicesMetadata = async (req, res) => {
  try {
    const [{ data: cs }, { data: ss }] = await Promise.all([
      supabaseAdmin.from("service_categories").select("slug,name,icon,blurb,sort_order,active").eq("active", true).order("sort_order").order("name"),
      supabaseAdmin.from("service_subcategories").select("category_slug,name,sort_order,active").eq("active", true).order("sort_order").order("name"),
    ]);

    if (!cs) return res.json({ data: [] });

    const subsBy = new Map();
    (ss || []).forEach((s) => {
      const arr = subsBy.get(s.category_slug) || [];
      arr.push(s.name);
      subsBy.set(s.category_slug, arr);
    });
    
    const data = cs.map((c) => {
      const subs = subsBy.get(c.slug) || [];
      return { 
        slug: c.slug, 
        name: c.name, 
        icon: c.icon || "Wrench", 
        blurb: c.blurb || "", 
        subcategories: subs,
        subCount: subs.length, 
        examples: subs.slice(0, 3).join(" · ") 
      };
    }).sort((a, b) => {
      if (a.slug === "other") return 1;
      if (b.slug === "other") return -1;
      return 0;
    });

    res.json({ data });
  } catch (err) {
    console.error('Error fetching metadata:', err);
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
};

export const getFeaturedLocations = async (req, res) => {
  try {
    const { data } = await supabaseAdmin
      .from("featured_locations")
      .select("id,country,region,district,town,area,category_slug,priority,note,active")
      .eq("active", true)
      .order("priority", { ascending: false });
      
    const base = data || [];
    const ids = base.map((r) => r.id);
    let coordMap = new Map();
    if (ids.length) {
      const { data: coords } = await supabaseAdmin.rpc("get_featured_location_coords", { _ids: ids });
      coordMap = new Map((coords || []).map((c) => [c.id, { latitude: c.latitude, longitude: c.longitude }]));
    }
    
    const list = base.map((r) => ({ 
      ...r, 
      latitude: coordMap.get(r.id)?.latitude || null, 
      longitude: coordMap.get(r.id)?.longitude || null 
    }));
    
    res.json({ data: list });
  } catch (err) {
    console.error('Error fetching featured locations:', err);
    res.status(500).json({ error: 'Failed to fetch featured locations' });
  }
};

export const getHomeNearby = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    const lat = latitude ? parseFloat(latitude) : null;
    const lng = longitude ? parseFloat(longitude) : null;
    const hasCoords = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);

    let reqs = null;
    let provs = null;

    if (hasCoords) {
      const { data: rpcReqs } = await supabaseAdmin.rpc("nearby_service_requests", {
        in_lat: lat,
        in_lng: lng,
        in_radius_km: 50,
        in_limit: 20,
      });
      reqs = rpcReqs || null;
    }

    const [{ data: rRows }, { data: pRows }, { data: spRowsRaw }] = await Promise.all([
      reqs
        ? Promise.resolve({ data: reqs })
        : supabaseAdmin
            .from("service_requests")
            .select("id,title,service_needed,description,budget_range,urgent_flag,created_at,district,town,area,location")
            .eq("visibility", "public")
            .eq("status", "requested")
            .is("provider_id", null)
            .order("created_at", { ascending: false })
            .limit(40),
      supabaseAdmin
        .from("public_profiles")
        .select("id,owner_id,name,subcategory,town,district,area,service_radius_km,areas_served,verified")
        .eq("suspended", false)
        .not("owner_id", "is", null)
        .order("updated_at", { ascending: false })
        .limit(40),
      supabaseAdmin
        .from("service_profiles")
        .select("user_id,business_name,subcategory,town,district,area,service_radius_km,areas_served,verified")
        .eq("suspended", false)
        .order("updated_at", { ascending: false })
        .limit(40),
    ]);
    
    const rRaw = rRows || [];
    const pRaw = pRows || [];
    const spRaw = spRowsRaw || [];
    const ppOwners = new Set(pRaw.map((r) => r.owner_id));
    const spNew = spRaw.filter((r) => !ppOwners.has(r.user_id));

    const [{ data: reqCoords }, { data: provCoords }, { data: spCoords }] = await Promise.all([
      rRaw.length ? supabaseAdmin.rpc("get_service_request_coords", { _ids: rRaw.map((r) => r.id) }) : Promise.resolve({ data: [] }),
      pRaw.length ? supabaseAdmin.rpc("get_public_profile_coords", { _ids: pRaw.map((r) => r.id) }) : Promise.resolve({ data: [] }),
      spNew.length ? supabaseAdmin.rpc("get_service_profile_coords", { _ids: spNew.map((r) => r.user_id) }) : Promise.resolve({ data: [] }),
    ]);

    const reqCoordMap = new Map((reqCoords || []).map((c) => [c.id, c]));
    const provCoordMap = new Map((provCoords || []).map((c) => [c.id, c]));
    const spCoordMap = new Map((spCoords || []).map((c) => [c.user_id, c]));

    reqs = rRaw.map((r) => ({ ...r, latitude: reqCoordMap.get(r.id)?.latitude || null, longitude: reqCoordMap.get(r.id)?.longitude || null }));
    const ppProvs = pRaw.map((r) => ({
      ...r,
      user_id: r.owner_id,
      business_name: r.name,
      latitude: provCoordMap.get(r.id)?.latitude || null,
      longitude: provCoordMap.get(r.id)?.longitude || null,
    }));
    const spProvs = spNew.map((r) => ({
      ...r,
      latitude: spCoordMap.get(r.user_id)?.latitude || null,
      longitude: spCoordMap.get(r.user_id)?.longitude || null,
    }));
    provs = [...ppProvs, ...spProvs];

    const provIds = provs.map((p) => p.user_id);
    const profMap = new Map();
    if (provIds.length) {
      const { data: profs } = await supabaseAdmin.from("profiles").select("id,full_name,avatar_url").in("id", provIds);
      (profs || []).forEach((p) => profMap.set(p.id, p));
    }
    
    provs = provs.map((p) => ({ ...p, profile: profMap.get(p.user_id) || null }));

    res.json({ data: { requests: reqs, providers: provs } });
  } catch (err) {
    console.error('Error fetching home nearby data:', err);
    res.status(500).json({ error: 'Failed to fetch nearby data' });
  }
};

export const searchServices = async (req, res) => {
  try {
    const isGuest = !req.user;
    const filter = req.query.filter || 'all';
    const isRecent = filter === 'recent';

    const ppCols = isGuest
      ? "owner_id,slug,name,subcategory,bio,town,district,areas_served,service_radius_km,category_slug,verified,updated_at,created_at,availability,cover_url,avatar_url"
      : "owner_id,slug,name,subcategory,bio,town,district,area,latitude,longitude,areas_served,service_radius_km,category_slug,verified,updated_at,created_at,availability,cover_url,avatar_url";

    const spCols = isGuest
      ? "user_id,business_name,subcategory,bio,town,district,areas_served,service_radius_km,category_slug,verified,updated_at,created_at,availability,cover_url,seeded_by_official,seeded_status,years_experience,price_type,price_fixed_ugx,price_min_ugx,price_max_ugx,price_currency,price_note,media_urls"
      : "user_id,business_name,subcategory,bio,town,district,area,latitude,longitude,areas_served,service_radius_km,category_slug,verified,updated_at,created_at,availability,cover_url,seeded_by_official,seeded_status,years_experience,price_type,price_fixed_ugx,price_min_ugx,price_max_ugx,price_currency,price_note,media_urls";

    const build = (from, cols) => {
      let q = supabaseAdmin.from(from).select(cols).eq("suspended", false);
      if (from === "public_profiles") q = q.not("owner_id", "is", null);
      q = isRecent ? q.order("created_at", { ascending: false }) : q.order("updated_at", { ascending: false });
      q = q.limit(60);
      if (filter === "featured") q = q.eq("verified", "featured");
      if (filter === "verified") q = q.in("verified", ["verified", "featured"]);
      if (filter === "available") q = q.eq("availability", "available");
      return q;
    };

    const [{ data: ppData }, { data: spData }] = await Promise.all([
      build("public_profiles", ppCols),
      build("service_profiles", spCols),
    ]);

    const ppRows = (ppData || []).map((r) => ({
      ...r,
      user_id: r.owner_id,
      business_name: r.name,
      seeded_by_official: false,
      seeded_status: null,
    }));
    
    const ppOwners = new Set(ppRows.map((r) => r.user_id));
    const spRows = (spData || []).filter((r) => !ppOwners.has(r.user_id));
    const merged = [...ppRows, ...spRows];
    
    const ids = merged.map((p) => p.user_id);
    const profMap = new Map();
    const trustMap = new Map();
    
    if (ids.length) {
      const profsPromise = isGuest
        ? Promise.resolve({ data: [] })
        : supabaseAdmin.from("profiles").select("id,full_name,avatar_url").in("id", ids);
        
      const [profsRes, trustRes] = await Promise.all([
        profsPromise,
        supabaseAdmin.from("provider_trust_stats").select("provider_id,trust_score,average_rating,completed_service_requests,total_verified_reviews,response_rate").in("provider_id", ids),
      ]);
      
      (profsRes.data || []).forEach((p) => profMap.set(p.id, p));
      (trustRes.data || []).forEach((t) => trustMap.set(t.provider_id, {
        trust_score: Number(t.trust_score || 0),
        average_rating: Number(t.average_rating || 0),
        completed_jobs: Number(t.completed_service_requests || 0),
        verified_reviews: Number(t.total_verified_reviews || 0),
        response_rate: Number(t.response_rate || 0),
      }));
    }

    const data = merged.map((p) => ({
      ...p,
      profile: profMap.get(p.user_id) || null,
      trust_score: trustMap.get(p.user_id)?.trust_score || 0,
      average_rating: trustMap.get(p.user_id)?.average_rating || 0,
      completed_jobs: trustMap.get(p.user_id)?.completed_jobs || 0,
      verified_reviews: trustMap.get(p.user_id)?.verified_reviews || 0,
      response_rate: trustMap.get(p.user_id)?.response_rate || 0,
    }));

    res.json({ data });
  } catch (err) {
    console.error('Error searching services:', err);
    res.status(500).json({ error: 'Failed to search services' });
  }
};

export const getCategoryServices = async (req, res) => {
  try {
    const { slug } = req.params;
    const isGuest = !req.user;

    const ppCols = isGuest
      ? "owner_id,slug,name,subcategory,bio,town,district,areas_served,service_radius_km,category_slug,verified,updated_at,created_at,availability,cover_url,avatar_url"
      : "owner_id,slug,name,subcategory,bio,town,district,area,latitude,longitude,areas_served,service_radius_km,category_slug,verified,updated_at,created_at,availability,cover_url,avatar_url";

    const spCols = isGuest
      ? "user_id,business_name,subcategory,bio,town,district,areas_served,service_radius_km,category_slug,verified,updated_at,created_at,availability,cover_url,seeded_by_official,seeded_status,years_experience,price_type,price_fixed_ugx,price_min_ugx,price_max_ugx,price_currency,price_note,media_urls"
      : "user_id,business_name,subcategory,bio,town,district,area,latitude,longitude,areas_served,service_radius_km,category_slug,verified,updated_at,created_at,availability,cover_url,seeded_by_official,seeded_status,years_experience,price_type,price_fixed_ugx,price_min_ugx,price_max_ugx,price_currency,price_note,media_urls";

    const build = (from, cols) => {
      let q = supabaseAdmin.from(from).select(cols).eq("suspended", false).order("updated_at", { ascending: false }).limit(200);
      if (from === "public_profiles") q = q.not("owner_id", "is", null);
      return q;
    };

    const [{ data: ppData }, { data: spData }] = await Promise.all([
      build("public_profiles", ppCols),
      build("service_profiles", spCols),
    ]);

    const ppRows = (ppData || []).map((r) => ({
      ...r,
      user_id: r.owner_id,
      business_name: r.name,
      seeded_by_official: false,
      seeded_status: null,
    }));
    
    const ppOwners = new Set(ppRows.map((r) => r.user_id));
    const spRows = (spData || []).filter((r) => !ppOwners.has(r.user_id));
    const all = [...ppRows, ...spRows];
    
    const ids = all.map((p) => p.user_id);
    const profMap = new Map();
    const trustMap = new Map();
    
    if (ids.length) {
      const profsPromise = isGuest
        ? Promise.resolve({ data: [] })
        : supabaseAdmin.from("profiles").select("id,full_name,avatar_url").in("id", ids);
        
      const [profsRes, trustRes] = await Promise.all([
        profsPromise,
        supabaseAdmin.from("provider_trust_stats").select("provider_id,trust_score,average_rating,completed_service_requests,total_verified_reviews,response_rate").in("provider_id", ids),
      ]);
      
      (profsRes.data || []).forEach((p) => profMap.set(p.id, p));
      (trustRes.data || []).forEach((t) => trustMap.set(t.provider_id, {
        trust_score: Number(t.trust_score || 0),
        average_rating: Number(t.average_rating || 0),
        completed_jobs: Number(t.completed_service_requests || 0),
        verified_reviews: Number(t.total_verified_reviews || 0),
        response_rate: Number(t.response_rate || 0),
      }));
    }

    const enrich = (r) => ({
      ...r,
      full_name: profMap.get(r.user_id)?.full_name || null,
      avatar_url: profMap.get(r.user_id)?.avatar_url || r.cover_url || null,
      rating: trustMap.get(r.user_id)?.average_rating || 0,
    });

    const inCat = all.filter((r) => r.category_slug === slug).map(enrich);
    const outCat = all.filter((r) => r.category_slug !== slug).map(enrich).sort((a, b) => {
      const rA = a.verified === "featured" ? 2 : a.verified === "verified" ? 1 : 0;
      const rB = b.verified === "featured" ? 2 : b.verified === "verified" ? 1 : 0;
      if (rB !== rA) return rB - rA;
      return (b.rating || 0) - (a.rating || 0);
    }).slice(0, 6);

    res.json({ list: inCat, others: outCat });
  } catch (err) {
    console.error('Error fetching category services:', err);
    res.status(500).json({ error: 'Failed to fetch category services' });
  }
};

export const getServiceMedia = async (req, res) => {
  try {
    const { profileId } = req.params;
    const { data, error } = await supabaseAdmin
      .from("service_media")
      .select("id,service_user_id,kind,url,thumbnail_url,sort_order,is_cover,duration_seconds")
      .eq("public_profile_id", profileId)
      .order("is_cover", { ascending: false })
      .order("sort_order");
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error fetching service media:', err);
    res.status(500).json({ error: 'Failed to fetch service media' });
  }
};

export const createServiceMedia = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("service_media").insert(req.body).select().single();
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error creating service media:', err);
    res.status(500).json({ error: 'Failed to create service media' });
  }
};

export const updateServiceMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin.from("service_media").update(req.body).eq("id", id).select().single();
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error updating service media:', err);
    res.status(500).json({ error: 'Failed to update service media' });
  }
};

export const deleteServiceMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from("service_media").delete().eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting service media:', err);
    res.status(500).json({ error: 'Failed to delete service media' });
  }
};

export const unsetServiceMediaCover = async (req, res) => {
  try {
    const { profileId } = req.params;
    const { error } = await supabaseAdmin
      .from("service_media")
      .update({ is_cover: false })
      .eq("public_profile_id", profileId)
      .eq("is_cover", true);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Error unsetting service media cover:', err);
    res.status(500).json({ error: 'Failed to unset service media cover' });
  }
};
