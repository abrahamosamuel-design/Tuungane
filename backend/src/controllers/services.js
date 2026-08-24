import { supabaseAdmin } from '../lib/supabaseClient.js';
import { createClient } from '@supabase/supabase-js';

const getSupabaseUserClient = (req) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  const token = req.headers.authorization?.split(' ')[1];
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
};


export const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    let { data: service, error: serviceError } = await supabaseAdmin
      .from('profile_services')
      .select(`
        *,
        profile:public_profiles!profile_services_profile_id_fkey (
          id, owner_id, name, avatar_url, verified,
          town, district, area, slug
        ),
        user_profile:profiles!profile_services_user_profile_id_fkey (
          id, full_name, avatar_url
        )
      `)
      .eq('id', id)
      .single();

    if (serviceError) {
      // Fallback: If not found in profile_services, try v_search_services (for legacy public_profiles / service_profiles)
      const { data: fallback, error: fallbackErr } = await supabaseAdmin
        .from('v_search_services')
        .select('*')
        .eq('service_id', id)
        .single();
        
      if (fallbackErr) throw fallbackErr;
      
      service = {
        id: fallback.service_id,
        title: fallback.business_name,
        description: fallback.bio,
        subcategory: fallback.subcategory,
        category_slug: fallback.category_slug,
        profile_id: fallback.user_id,
        user_profile_id: fallback.user_id,
        price_type: fallback.price_type,
        price_fixed_ugx: fallback.price_fixed_ugx,
        price_min_ugx: fallback.price_min_ugx,
        price_max_ugx: fallback.price_max_ugx,
        price_currency: fallback.price_currency,
        price_note: fallback.price_note,
        profile: {
          id: fallback.user_id,
          owner_id: fallback.user_id,
          name: fallback.business_name,
          avatar_url: fallback.avatar_url,
          cover_url: fallback.cover_url,
          verified: fallback.verified,
          town: fallback.town,
          district: fallback.district,
          slug: fallback.slug
        }
      };
    }
    
    // Normalize the profile data for the frontend (for standard profile_services)
    if (!service.profile && service.user_profile) {
      service.profile = {
        id: service.user_profile.id,
        name: service.user_profile.full_name,
        avatar_url: service.user_profile.avatar_url,
        isPersonal: true
      };
    }
    
    // Fetch associated media using the service's own ID
    let mediaQuery = supabaseAdmin
      .from('service_media')
      .select('*')
      .eq('service_id', service.id);
      
    const { data: media } = await mediaQuery;

    // Fetch reviews for the provider
    let reviewsQuery = supabaseAdmin
      .from('reviews')
      .select('id, rating, text, created_at, user_id')
      .eq('hidden', false)
      .order('created_at', { ascending: false });
      
    if (service.profile_id) {
      reviewsQuery = reviewsQuery.eq('public_profile_id', service.profile_id);
    } else {
      reviewsQuery = reviewsQuery.eq('provider_user_id', service.user_profile_id);
    }
    const { data: rawReviews } = await reviewsQuery;
    
    let rating = 0;
    let reviewCount = 0;
    let reviews = [];
    
    if (rawReviews && rawReviews.length > 0) {
      reviewCount = rawReviews.length;
      rating = Number((rawReviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviewCount).toFixed(1));
      
      const userIds = Array.from(new Set(rawReviews.map(r => r.user_id)));
      const { data: users } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
        
      const userMap = new Map((users || []).map(u => [u.id, u]));
      
      reviews = rawReviews.map(r => ({
        ...r,
        user: userMap.get(r.user_id) || null
      }));
    }

    // Fetch timeline posts for the provider (including posts explicitly linked to this service, and general provider posts)
    const providerUserId = service.user_profile_id || service.profile?.owner_id || service.profile?.id;
    let postsQuery = supabaseAdmin
      .from('timeline_posts')
      .select('*')
      .eq('hidden', false)
      .or(`service_id.eq.${service.id}${providerUserId ? `,provider_user_id.eq.${providerUserId}` : ''}`)
      .order('created_at', { ascending: false })
      .limit(30);
    const { data: timeline_posts } = await postsQuery;
    
    let enrichedPosts = [];
    if (timeline_posts && timeline_posts.length > 0) {
      const userIds = [...new Set(timeline_posts.map(p => p.provider_user_id).filter(Boolean))];
      let userMap = new Map();
      if (userIds.length > 0) {
        const { data: users } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);
        userMap = new Map((users || []).map(u => [u.id, u]));
      }

      enrichedPosts = timeline_posts.map(p => {
        const user = userMap.get(p.provider_user_id);
        return {
          ...p,
          service_title: service.title,
          author: {
            full_name: user?.full_name || service.profile?.name || service.title,
            avatar_url: user?.avatar_url || service.profile?.avatar_url,
            is_provider: true,
            district: service.profile?.district,
            town: service.profile?.town,
            area: service.profile?.area
          }
        };
      });
    }

    res.json({ data: { ...service, media: media || [], reviews, rating, reviewCount, timeline_posts: enrichedPosts } });
  } catch (err) {
    console.error('Error fetching service:', err);
    res.status(500).json({ error: 'Failed to fetch service' });
  }
};

export const getMyServices = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // First, get all public profiles owned by the user
    const { data: profiles } = await supabaseAdmin
      .from('public_profiles')
      .select('id, name, avatar_url, slug')
      .eq('owner_id', userId);
      
    const profileIds = profiles ? profiles.map(p => p.id) : [];
    
    // Then get all services that belong to these profiles OR the user directly
    let query = supabaseAdmin.from('profile_services').select('*');
    
    if (profileIds.length > 0) {
      query = query.or(`profile_id.in.(${profileIds.join(',')}),user_profile_id.eq.${userId}`);
    } else {
      query = query.eq('user_profile_id', userId);
    }
    
    const { data: userServices, error: servError } = await query.order('created_at', { ascending: false });
    
    if (servError) throw servError;
    
    // Fetch personal profile details if there are personal services
    const hasPersonalServices = userServices.some(s => s.user_profile_id);
    let personalProfile = null;
    if (hasPersonalServices) {
      const { data: pp } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', userId)
        .single();
      personalProfile = pp;
    }
    
    const enrichedServices = userServices.map(s => {
      let profileData = null;
      if (s.profile_id && profiles) {
        profileData = profiles.find(p => p.id === s.profile_id);
      } else if (s.user_profile_id && personalProfile) {
        profileData = {
          id: personalProfile.id,
          name: personalProfile.full_name,
          avatar_url: personalProfile.avatar_url,
          isPersonal: true
        };
      }
      return {
        ...s,
        profile: profileData
      };
    });
    
    res.json({ data: enrichedServices });
  } catch (err) {
    console.error('Error fetching my services:', err);
    res.status(500).json({ error: 'Failed to fetch my services' });
  }
};

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
    
    console.log('--- updateProfileService ---');
    console.log('ID:', id);
    console.log('Payload:', payload);
    
    const supabaseUser = getSupabaseUserClient(req);
    const { data, error } = await supabaseUser
      .from('profile_services')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update Error:', error);
      throw error;
    }
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

    // We use the new unified v_search_services view which combines profile_services, public_profiles, and service_profiles.
    let q = supabaseAdmin.from("v_search_services").select("*");
    
    q = isRecent ? q.order("created_at", { ascending: false }) : q.order("updated_at", { ascending: false });
    q = q.limit(60);
    
    if (filter === "featured") q = q.eq("verified", "featured");
    if (filter === "verified") q = q.in("verified", ["verified", "featured"]);
    if (filter === "available") q = q.eq("availability", "available");

    const { data: merged, error } = await q;
    if (error) throw error;

    const ids = (merged || []).map((p) => p.user_id).filter(Boolean);
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

    const data = (merged || []).map((p) => ({
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
