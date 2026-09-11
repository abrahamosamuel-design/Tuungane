import { supabaseAdmin } from '../lib/supabaseClient.js';
import { createClient } from '@supabase/supabase-js';
import NodeCache from 'node-cache';

// Initialize cache with 30 seconds default TTL to absorb traffic spikes
const apiCache = new NodeCache({ stdTTL: 30, checkperiod: 60 });

const generateCacheKey = (req) => {
  return `${req.baseUrl || ''}${req.path}?${new URLSearchParams(req.query).toString()}`;
};

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
    const cacheKey = generateCacheKey(req);
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

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
      
      // Fetch personal profile for the fallback user
      const { data: personalProf } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', fallback.user_id)
        .maybeSingle();

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
        profile: personalProf ? {
          id: personalProf.id,
          name: personalProf.full_name,
          avatar_url: personalProf.avatar_url,
          isPersonal: true,
          town: fallback.town,
          district: fallback.district,
        } : {
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
    
    // Run independent queries in parallel
    const providerUserId = service.user_profile_id || service.profile?.owner_id || service.profile?.id;
    
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

    let postsQuery = supabaseAdmin
      .from('timeline_posts')
      .select('*')
      .eq('hidden', false)
      .or(`service_id.eq.${service.id}${providerUserId ? `,provider_user_id.eq.${providerUserId}` : ''}`)
      .order('created_at', { ascending: false })
      .limit(30);

    const [
      { data: media },
      { data: rawReviews },
      { data: timeline_posts }
    ] = await Promise.all([
      supabaseAdmin.from('service_media').select('*').eq('service_id', service.id),
      reviewsQuery,
      postsQuery
    ]);

    // Gather all user IDs needed for enrichment
    const reviewUserIds = rawReviews ? Array.from(new Set(rawReviews.map(r => r.user_id))) : [];
    const postUserIds = timeline_posts ? Array.from(new Set(timeline_posts.map(p => p.provider_user_id).filter(Boolean))) : [];
    const allUserIds = Array.from(new Set([...reviewUserIds, ...postUserIds]));

    let userMap = new Map();
    if (allUserIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', allUserIds);
      userMap = new Map((users || []).map(u => [u.id, u]));
    }

    let rating = 0;
    let reviewCount = 0;
    let reviews = [];
    
    if (rawReviews && rawReviews.length > 0) {
      reviewCount = rawReviews.length;
      rating = Number((rawReviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviewCount).toFixed(1));
      
      reviews = rawReviews.map(r => ({
        ...r,
        user: userMap.get(r.user_id) || null
      }));
    }

    let enrichedPosts = [];
    if (timeline_posts && timeline_posts.length > 0) {
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

    const responseData = { data: { ...service, media: media || [], reviews, rating, reviewCount, timeline_posts: enrichedPosts } };
    apiCache.set(cacheKey, responseData, 60); // Cache for 60 seconds
    res.json(responseData);
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
    const cacheKey = generateCacheKey(req);
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

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

    const responseData = { data };
    apiCache.set(cacheKey, responseData, 300); // Metadata changes rarely, cache for 5 minutes
    res.json(responseData);
  } catch (err) {
    console.error('Error fetching metadata:', err);
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
};

export const getFeaturedLocations = async (req, res) => {
  try {
    const cacheKey = generateCacheKey(req);
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

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
    
    const responseData = { data: list };
    apiCache.set(cacheKey, responseData, 300); // 5 mins cache
    res.json(responseData);
  } catch (err) {
    console.error('Error fetching featured locations:', err);
    res.status(500).json({ error: 'Failed to fetch featured locations' });
  }
};

export const getHomeNearby = async (req, res) => {
  try {
    const cacheKey = generateCacheKey(req);
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    const { latitude, longitude, limit = 20, page = 1 } = req.query;
    const lat = latitude ? parseFloat(latitude) : null;
    const lng = longitude ? parseFloat(longitude) : null;
    const limitNum = parseInt(limit, 10);
    const offset = (parseInt(page, 10) - 1) * limitNum;
    const hasCoords = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);

    let reqs = [];
    let provs = [];

    if (hasCoords) {
      const [reqsRes, provsRes] = await Promise.all([
        supabaseAdmin.rpc("nearby_service_requests", {
          in_lat: lat,
          in_lng: lng,
          in_radius_km: 50,
          in_limit: limitNum,
          in_offset: offset,
        }),
        supabaseAdmin.rpc("get_nearby_services", {
          in_lat: lat,
          in_lng: lng,
          in_radius_km: 50,
          in_limit: limitNum,
          in_offset: offset,
        })
      ]);
      reqs = reqsRes.data || [];
      provs = (provsRes.data || []).map(p => ({
        ...p,
        profile: {
          id: p.user_id,
          full_name: p.profile_full_name,
          avatar_url: p.final_avatar_url
        }
      }));
    } else {
      // Fallback without coordinates
      const [reqsRes, provsRes] = await Promise.all([
        supabaseAdmin
          .from("service_requests")
          .select("id,title,service_needed,description,budget_range,urgent_flag,created_at,district,town,area,location")
          .eq("visibility", "public")
          .eq("status", "requested")
          .is("provider_id", null)
          .order("created_at", { ascending: false })
          .range(offset, offset + limitNum - 1),
        supabaseAdmin
          .from("v_search_services_enriched")
          .select("*")
          .order("updated_at", { ascending: false })
          .range(offset, offset + limitNum - 1)
      ]);
      
      reqs = reqsRes.data || [];
      provs = (provsRes.data || []).map(p => ({
        ...p,
        profile: {
          id: p.user_id,
          full_name: p.profile_full_name,
          avatar_url: p.final_avatar_url
        }
      }));
    }

    const responseData = { data: { requests: reqs, providers: provs } };
    apiCache.set(cacheKey, responseData); // 30s default cache
    res.json(responseData);
  } catch (err) {
    console.error('Error fetching home nearby data:', err);
    res.status(500).json({ error: 'Failed to fetch nearby data' });
  }
};

export const searchServices = async (req, res) => {
  try {
    const cacheKey = generateCacheKey(req);
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    const { filter = 'all', limit = 20, page = 1 } = req.query;
    const isRecent = filter === 'recent';
    const limitNum = parseInt(limit, 10);
    const offset = (parseInt(page, 10) - 1) * limitNum;

    let q = supabaseAdmin.from("v_search_services_enriched").select("*");
    
    q = isRecent ? q.order("created_at", { ascending: false }) : q.order("updated_at", { ascending: false });
    q = q.range(offset, offset + limitNum - 1);
    
    if (filter === "featured") q = q.eq("verified", "featured");
    if (filter === "verified") q = q.in("verified", ["verified", "featured"]);
    if (filter === "available") q = q.eq("availability", "available");

    const { data: merged, error } = await q;
    if (error) throw error;

    const data = (merged || []).map((p) => ({
      ...p,
      profile: {
        id: p.user_id,
        full_name: p.profile_full_name,
        avatar_url: p.final_avatar_url
      }
    }));

    const responseData = { data };
    apiCache.set(cacheKey, responseData);
    res.json(responseData);
  } catch (err) {
    console.error('Error searching services:', err);
    res.status(500).json({ error: 'Failed to search services' });
  }
};

export const getCategoryServices = async (req, res) => {
  try {
    const cacheKey = generateCacheKey(req);
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    const { slug } = req.params;
    const { limit = 20, page = 1 } = req.query;
    const limitNum = parseInt(limit, 10);
    const offset = (parseInt(page, 10) - 1) * limitNum;

    const { data: inCatRaw } = await supabaseAdmin
      .from("v_search_services_enriched")
      .select("*")
      .eq("category_slug", slug)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limitNum - 1);

    const inCat = (inCatRaw || []).map(r => ({
      ...r,
      full_name: r.profile_full_name || null,
      avatar_url: r.final_avatar_url || r.cover_url || null,
      rating: r.average_rating || 0,
      profile: {
        id: r.user_id,
        full_name: r.profile_full_name,
        avatar_url: r.final_avatar_url
      }
    }));
    
    let outCat = [];
    if (page == 1) {
      const { data: outCatRaw } = await supabaseAdmin
        .from("v_search_services_enriched")
        .select("*")
        .neq("category_slug", slug)
        .order("trust_score", { ascending: false })
        .limit(6);
        
      outCat = (outCatRaw || []).map(r => ({
        ...r,
        full_name: r.profile_full_name || null,
        avatar_url: r.final_avatar_url || r.cover_url || null,
        rating: r.average_rating || 0,
        profile: {
          id: r.user_id,
          full_name: r.profile_full_name,
          avatar_url: r.final_avatar_url
        }
      }));
    }

    const responseData = { list: inCat, others: outCat };
    apiCache.set(cacheKey, responseData);
    res.json(responseData);
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
