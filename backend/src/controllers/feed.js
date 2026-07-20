import { supabaseAdmin } from '../lib/supabaseClient.js';

// Post types acceptable for homepage community updates.
const ALLOWED_TYPES = [
  "work_update",
  "available",
  "new_service",
  "completed_job",
  "before_after",
  "opportunity_shared",
];

const POPULAR_CATEGORIES = [
  { label: "Plumbing", query: "Plumbers" },
  { label: "Cleaning", query: "Cleaners" },
  { label: "Mechanics", query: "Mechanics" },
  { label: "Beauty", query: "Hairdressers" },
  { label: "Tutoring", query: "Tutors" },
  { label: "Electrical", query: "Electricians" },
];

// Bare-bones phone-like sequence detector (7+ consecutive digits, tolerating spaces/dashes)
const PHONE_RE = /(?:\+?\d[\s\-().]?){7,}\d/;

// Very light quality filter — drop tiny/empty posts w/ no media.
function isQuality(p) {
  const text = (p.text ?? "").trim();
  const hasMedia = (p.media_urls ?? []).length > 0;
  if (!text && !hasMedia) return false;
  if (text && text.length < 12 && !hasMedia) return false;
  if (PHONE_RE.test(text)) return false;
  return true;
}

export const getCommunityUpdates = async (req, res) => {
  try {
    const { data } = await supabaseAdmin
      .from("timeline_posts")
      .select("id,provider_user_id,text,category_slug,location,media_urls,featured,created_at,post_type,district,town,area,latitude,longitude")
      .eq("hidden", false)
      .in("post_type", ALLOWED_TYPES)
      .order("created_at", { ascending: false })
      .limit(40);

    const raw = (data || []).filter(isQuality);
    if (!raw.length) return res.json({ data: [] });

    const ids = Array.from(new Set(raw.map((p) => p.provider_user_id)));
    const [{ data: profs }, { data: sps }, { data: pps }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,full_name,avatar_url,is_provider").in("id", ids),
      supabaseAdmin.from("service_profiles").select("user_id,business_name,verified,suspended,cover_url").in("user_id", ids),
      supabaseAdmin.from("public_profiles").select("owner_id,name,avatar_url,cover_url,verified").in("owner_id", ids),
    ]);
    
    const profMap = new Map((profs || []).map((p) => [p.id, p]));
    const spMap = new Map((sps || []).map((s) => [s.user_id, s]));
    const ppMap = new Map((pps || []).filter((p) => p.owner_id).map((p) => [p.owner_id, p]));

    const counts = await Promise.all(
      raw.map(async (p) => {
        const [{ data: lc }, { count: cc }] = await Promise.all([
          supabaseAdmin.rpc("get_post_like_count", { _post_id: p.id }),
          supabaseAdmin.from("post_comments").select("*", { count: "exact", head: true }).eq("post_id", p.id).eq("hidden", false),
        ]);
        return { id: p.id, likes: typeof lc === "number" ? lc : 0, comments: cc ?? 0 };
      })
    );
    const countMap = new Map(counts.map((c) => [c.id, c]));

    const enriched = raw
      .map((p) => {
        const prof = profMap.get(p.provider_user_id);
        const sp = spMap.get(p.provider_user_id);
        const pp = ppMap.get(p.provider_user_id);
        if (sp?.suspended) return null;
        
        const c = countMap.get(p.id);
        const fullName = sp?.business_name || pp?.name || prof?.full_name || "Service Provider";
        const avatar = prof?.avatar_url || pp?.avatar_url || pp?.cover_url || sp?.cover_url || null;
        const isProvider = !!prof?.is_provider || !!sp || !!pp;
        const isVerified = sp?.verified === "verified" || pp?.verified === "verified";
        
        return {
          ...p,
          author: { full_name: fullName, avatar_url: avatar },
          is_provider: isProvider,
          is_verified: isVerified,
          likes: c?.likes ?? 0,
          comments: c?.comments ?? 0,
        };
      })
      .filter(Boolean);

    res.json({ data: enriched });
  } catch (err) {
    console.error('Error fetching community updates:', err);
    res.status(500).json({ error: 'Failed to fetch community updates' });
  }
};

export const getPopularCategories = async (req, res) => {
  try {
    const entries = await Promise.all(
      POPULAR_CATEGORIES.map(async (c) => {
        const { count } = await supabaseAdmin
          .from("public_profiles")
          .select("id", { count: "exact", head: true })
          .ilike("subcategory", `%${c.query.replace(/s$/, "")}%`);
        return [c.label, count || 0];
      }),
    );
    res.json({ data: Object.fromEntries(entries) });
  } catch (err) {
    console.error('Error fetching popular categories:', err);
    res.status(500).json({ error: 'Failed to fetch popular categories' });
  }
};

// Column lists — guests can only SELECT a safe subset
const SR_COLS_AUTH =
  "id,customer_id,title,service_needed,description,budget_range,urgent_flag,created_at,district,town,area,location,category_slug,subcategory,media_urls,posted_as_type,posted_as_name,posted_as_avatar_url,posted_as_ref_type,posted_as_ref_id";
const SR_COLS_GUEST =
  "id,title,service_needed,description,budget_range,urgent_flag,created_at,district,town,category_slug,subcategory,media_urls,posted_as_type,posted_as_name,posted_as_avatar_url,posted_as_ref_type,posted_as_ref_id";

const SP_COLS_AUTH =
  "user_id,business_name,category_slug,subcategory,bio,town,district,area,service_radius_km,areas_served,verified,availability,years_experience,cover_url,media_urls";
const SP_COLS_GUEST =
  "user_id,business_name,category_slug,subcategory,bio,town,district,service_radius_km,areas_served,verified,availability,years_experience,cover_url,media_urls";
const PP_COLS_AUTH =
  "owner_id,slug,name,category_slug,subcategory,bio,town,district,area,service_radius_km,areas_served,verified,availability,cover_url,avatar_url,updated_at";
const PP_COLS_GUEST =
  "owner_id,slug,name,category_slug,subcategory,bio,town,district,service_radius_km,areas_served,verified,availability,cover_url,avatar_url,updated_at";
const SP_LISTING_COLS_AUTH =
  "user_id,business_name,category_slug,subcategory,bio,town,district,area,verified,availability,cover_url,created_at";
const SP_LISTING_COLS_GUEST =
  "user_id,business_name,category_slug,subcategory,bio,town,district,verified,availability,cover_url,created_at";
const PP_LISTING_COLS_AUTH =
  "id,slug,owner_id,name,category_slug,subcategory,bio,town,district,area,verified,availability,cover_url,avatar_url,created_at";
const PP_LISTING_COLS_GUEST =
  "id,slug,owner_id,name,category_slug,subcategory,bio,town,district,verified,availability,cover_url,avatar_url,created_at";

export const getHomeFeed = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { lat, lng } = req.query;
    const hasCoords = lat != null && lng != null;

    let reqs = null;
    let provs = [];
    let nearbyFlag = false;

    if (hasCoords) {
      const { data: rpcReqs } = await supabaseAdmin.rpc("nearby_service_requests", { in_lat: parseFloat(lat), in_lng: parseFloat(lng), in_radius_km: 50, in_limit: 24 });
      reqs = rpcReqs;
      nearbyFlag = (reqs?.length ?? 0) > 0;
    }

    if (!reqs || reqs.length === 0) {
      const { data } = await supabaseAdmin
        .from("service_requests")
        .select(userId ? SR_COLS_AUTH : SR_COLS_GUEST)
        .eq("visibility", "public")
        .eq("status", "requested")
        .is("provider_id", null)
        .order("urgent_flag", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(12);
      reqs = data || [];
    }

    const [{ data: ppData }, { data: spData }] = await Promise.all([
      supabaseAdmin
        .from("public_profiles")
        .select(userId ? PP_COLS_AUTH : PP_COLS_GUEST)
        .eq("suspended", false)
        .not("owner_id", "is", null)
        .order("verified", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(24),
      supabaseAdmin
        .from("service_profiles")
        .select(userId ? SP_COLS_AUTH : SP_COLS_GUEST)
        .eq("suspended", false)
        .order("verified", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(24),
    ]);
    const ppRows = (ppData || []).map((r) => ({
      ...r,
      user_id: r.owner_id,
      business_name: r.name,
    }));
    const ppOwners = new Set(ppRows.map((r) => r.user_id));
    const spRows = (spData || []).filter((r) => !ppOwners.has(r.user_id));
    provs = [...ppRows, ...spRows];

    const [{ data: listingRows }, { data: spListingRows }] = await Promise.all([
      supabaseAdmin
        .from("public_profiles")
        .select(userId ? PP_LISTING_COLS_AUTH : PP_LISTING_COLS_GUEST)
        .eq("suspended", false)
        .not("owner_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(12),
      supabaseAdmin
        .from("service_profiles")
        .select(userId ? SP_LISTING_COLS_AUTH : SP_LISTING_COLS_GUEST)
        .eq("suspended", false)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);
    const ppListings = (listingRows || []).map((r) => ({
      ...r,
      user_id: r.owner_id,
      business_name: r.name,
    }));
    const ppOwnerSet = new Set(ppListings.map((l) => l.user_id));
    const spListings = (spListingRows || [])
      .filter((r) => !ppOwnerSet.has(r.user_id))
      .map((r) => ({ ...r, id: r.user_id, slug: null }));
    const listings = [...ppListings, ...spListings]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 12);

    let provider = false;
    if (userId) {
      const [{ count: ppCount }, { count: spCount }] = await Promise.all([
        supabaseAdmin.from("public_profiles").select("id", { count: "exact", head: true }).eq("owner_id", userId),
        supabaseAdmin.from("service_profiles").select("user_id", { count: "exact", head: true }).eq("user_id", userId),
      ]);
      provider = ((ppCount || 0) + (spCount || 0)) > 0;
    }

    res.json({
      data: {
        requests: reqs,
        hasNearbyReqs: nearbyFlag,
        providers: provs,
        recentListings: listings,
        isProvider: provider,
      }
    });
  } catch (err) {
    console.error('Error fetching home feed:', err);
    res.status(500).json({ error: 'Failed to fetch home feed' });
  }
};

export const getFeedPosts = async (req, res) => {
  try {
    const { filter, category, postType } = req.query;
    const userId = req.user?.id;
    let providerIds = null;

    if (filter === "following" && userId) {
      const { data } = await supabaseAdmin.from("follows").select("provider_user_id").eq("follower_id", userId);
      providerIds = (data ?? []).map((f) => f.provider_user_id);
      if (providerIds.length === 0) return res.json({ data: [] });
    }

    if (filter === "verified") {
      const { data } = await supabaseAdmin.from("service_profiles").select("user_id").in("verified", ["verified", "featured"]);
      providerIds = (data ?? []).map((p) => p.user_id);
      if (providerIds.length === 0) return res.json({ data: [] });
    }

    if (filter === "nearby") {
      if (!userId) return res.json({ data: [] });
      const { data: me } = await supabaseAdmin.rpc("get_my_profile", { user_id_param: userId }).maybeSingle();
      const district = me?.district?.trim();
      if (!district) return res.json({ data: [] });
      const { data } = await supabaseAdmin.from("service_profiles").select("user_id").eq("district", district);
      providerIds = (data ?? []).map((p) => p.user_id);
      if (providerIds.length === 0) return res.json({ data: [] });
    }

    let q = supabaseAdmin.from("timeline_posts").select("*").eq("hidden", false).order("created_at", { ascending: false }).limit(50);
    if (providerIds) q = q.in("provider_user_id", providerIds);
    if (category) q = q.eq("category_slug", category);
    if (postType) q = q.eq("post_type", postType);
    
    const { data: rows, error: qError } = await q;
    if (qError) throw qError;

    const ids = Array.from(new Set((rows ?? []).map((r) => r.provider_user_id)));
    const profMap = new Map();
    
    if (ids.length) {
      const { data: profs } = await supabaseAdmin.rpc("get_profile_cards", { _ids: ids });
      (profs ?? []).forEach((p) => profMap.set(p.id, { ...p, latitude: null, longitude: null }));
      
      const { data: sps } = await supabaseAdmin.from("service_profiles").select("user_id,business_name").in("user_id", ids);
      (sps ?? []).forEach((sp) => {
        const bn = (sp.business_name ?? "").trim();
        if (!bn) return;
        const cur = profMap.get(sp.user_id);
        if (cur) profMap.set(sp.user_id, { ...cur, full_name: bn });
      });
    }

    let mapped = (rows ?? []).map((r) => ({ ...r, author: profMap.get(r.provider_user_id) }));
    
    if (filter === "popular") {
      const postIds = mapped.map((r) => r.id);
      const { data: likes } = postIds.length
        ? await supabaseAdmin.rpc("get_post_like_counts", { _post_ids: postIds })
        : { data: [] };
      const tally = new Map();
      (likes ?? []).forEach((l) => tally.set(l.post_id, l.cnt));
      mapped = mapped.sort((a, b) => (tally.get(b.id) ?? 0) - (tally.get(a.id) ?? 0));
    }

    res.json({ data: mapped });
  } catch (err) {
    console.error('Error fetching feed posts:', err);
    res.status(500).json({ error: 'Failed to fetch feed posts' });
  }
};

export const getFeedServices = async (req, res) => {
  try {
    const { category } = req.query;
    let q = supabaseAdmin.from("service_profiles").select("user_id,business_name,subcategory,bio,town,district,area,service_radius_km,category_slug,verified,years_experience,areas_served,availability,cover_url,seeded_by_official,seeded_status,suspended,updated_at").eq("suspended", false).order("updated_at", { ascending: false }).limit(50);
    if (category) q = q.eq("category_slug", category);
    
    const { data, error } = await q;
    if (error) throw error;
    
    const ids = (data ?? []).map((p) => p.user_id);
    const profMap = new Map();
    if (ids.length) {
      const { data: profs } = await supabaseAdmin.from("profiles").select("id,full_name,avatar_url").in("id", ids);
      (profs ?? []).forEach((p) => profMap.set(p.id, p));
    }
    
    const result = (data ?? []).map((p) => ({ ...p, profile: profMap.get(p.user_id) }));
    res.json({ data: result });
  } catch (err) {
    console.error('Error fetching feed services:', err);
    res.status(500).json({ error: 'Failed to fetch feed services' });
  }
};

export const getOfficialFeed = async (req, res) => {
  try {
    const { filter } = req.query;
    const [{ data: acct }, { data: ops }] = await Promise.all([
      supabaseAdmin.from("official_accounts").select("*").eq("is_active", true).limit(1).maybeSingle(),
      supabaseAdmin.from("official_posts").select("*").eq("status", "published").order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(filter === "official" ? 30 : 5),
    ]);
    
    res.json({
      data: {
        account: acct,
        posts: ops || []
      }
    });
  } catch (err) {
    console.error('Error fetching official feed:', err);
    res.status(500).json({ error: 'Failed to fetch official feed' });
  }
};

export const getOfficialPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: p } = await supabaseAdmin.from("official_posts").select("*").eq("id", id).maybeSingle();
    if (!p) return res.status(404).json({ error: "Post not found" });

    const { data: a } = await supabaseAdmin.from("official_accounts").select("*").eq("id", p.official_account_id).maybeSingle();

    const { data: cs } = await supabaseAdmin.from("official_post_comments").select("id,text,created_at,user_id").eq("post_id", id).eq("hidden", false).order("created_at", { ascending: true });
    
    const ids = Array.from(new Set((cs || []).map((c) => c.user_id)));
    let pm = new Map();
    if (ids.length) {
      const { data: ps } = await supabaseAdmin.from("profiles").select("id,full_name,avatar_url").in("id", ids);
      pm = new Map((ps || []).map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]));
    }
    
    const comments = (cs || []).map((c) => ({ ...c, profile: pm.get(c.user_id) }));

    res.json({ data: { post: p, account: a, comments } });
  } catch (err) {
    console.error('Error fetching official post:', err);
    res.status(500).json({ error: 'Failed to fetch official post' });
  }
};

export const addOfficialPostComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user.id;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Comment text is required" });
    }

    const { data, error } = await supabaseAdmin.from("official_post_comments").insert({ 
      post_id: id, 
      user_id: userId, 
      text: text.trim() 
    }).select().single();

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error adding official post comment:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};
