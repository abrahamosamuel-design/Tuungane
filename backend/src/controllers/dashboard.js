import { supabaseAdmin } from '../lib/supabaseClient.js';

export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: profile } = await supabaseAdmin.from("profiles").select("full_name,avatar_url,is_provider").eq("id", userId).maybeSingle();
    const { data: sp } = await supabaseAdmin.rpc("get_my_service_profile", { user_id_param: userId }).maybeSingle();

    const { data: posts } = await supabaseAdmin.from("timeline_posts").select("*").eq("provider_user_id", userId).order("created_at", { ascending: false });
    const postIds = (posts || []).map(r => r.id);

    let providerStats = { followers: 0, posts: posts?.length || 0, recs: 0, likes: 0, comments: 0, reviews: 0, saves: 0, opps: 0 };
    
    if (profile?.is_provider) {
      const [
        { count: f }, { count: r }, 
        likesRes, commentsRes, 
        { count: rv }, { count: sv }, { count: op }
      ] = await Promise.all([
        supabaseAdmin.from("follows").select("*", { count: "exact", head: true }).eq("provider_user_id", userId),
        supabaseAdmin.from("provider_recommendations").select("*", { count: "exact", head: true }).eq("provider_user_id", userId),
        postIds.length ? supabaseAdmin.from("post_likes").select("*", { count: "exact", head: true }).in("post_id", postIds) : Promise.resolve({ count: 0 }),
        postIds.length ? supabaseAdmin.from("post_comments").select("*", { count: "exact", head: true }).in("post_id", postIds) : Promise.resolve({ count: 0 }),
        supabaseAdmin.from("reviews").select("*", { count: "exact", head: true }).eq("provider_user_id", userId),
        supabaseAdmin.from("saved_providers").select("*", { count: "exact", head: true }).eq("provider_user_id", userId),
        supabaseAdmin.from("opportunities").select("*", { count: "exact", head: true }).eq("poster_id", userId),
      ]);
      
      providerStats = {
        followers: f || 0,
        posts: posts?.length || 0,
        recs: r || 0,
        likes: likesRes.count || 0,
        comments: commentsRes.count || 0,
        reviews: rv || 0,
        saves: sv || 0,
        opps: op || 0
      };
    }

    const [
      { count: fol }, { count: sp2 }, { count: so }, { count: rw }, { count: rg }
    ] = await Promise.all([
      supabaseAdmin.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
      supabaseAdmin.from("saved_providers").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabaseAdmin.from("saved_opportunities").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabaseAdmin.from("reviews").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabaseAdmin.from("provider_recommendations").select("*", { count: "exact", head: true }).eq("user_id", userId),
    ]);
    
    const customerStats = {
      following: fol || 0,
      saved: sp2 || 0,
      savedOpps: so || 0,
      reviewsWritten: rw || 0,
      recsGiven: rg || 0
    };

    res.json({
      data: {
        profile,
        serviceProfile: sp,
        posts: (posts || []).map(r => ({ ...r, author: profile })),
        providerStats,
        customerStats
      }
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

export const updateServiceProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const payload = req.body;
    
    const { data, error } = await supabaseAdmin.from("service_profiles").upsert({
      user_id: userId,
      ...payload
    }).select().single();
    
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update service profile' });
  }
};

export const getDashboardFeed = async (req, res) => {
  try {
    const [{ data: pData }, { data: jData }, { data: rData }] = await Promise.all([
      supabaseAdmin
        .from("public_profiles")
        .select("owner_id, name, avatar_url, slug")
        .eq("suspended", false)
        .order("verified", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("public_profiles")
        .select("owner_id, name, cover_url")
        .not("cover_url", "is", null)
        .eq("suspended", false)
        .order("created_at", { ascending: false })
        .limit(6),
      supabaseAdmin
        .from("service_requests")
        .select("id, customer_id, title, description, created_at, town, area, media_urls, posted_as_name, posted_as_avatar_url")
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(10)
    ]);
    
    res.json({
      profiles: pData || [],
      topJobs: jData || [],
      posts: rData || [],
    });
  } catch (err) {
    console.error('Error fetching dashboard feed:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard feed' });
  }
};
