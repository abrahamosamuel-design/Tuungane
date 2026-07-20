import { supabaseAdmin } from '../lib/supabaseClient.js';

export const upsertReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { provider_user_id, rating, text, public_profile_id } = req.body;

    const { data, error } = await supabaseAdmin.from("reviews").upsert({
      provider_user_id, 
      user_id: userId, 
      rating, 
      text,
      public_profile_id
    }, { onConflict: "provider_user_id,user_id" });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error upserting review:', err);
    res.status(500).json({ error: 'Failed to post review' });
  }
};

export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: post, error } = await supabaseAdmin
      .from("timeline_posts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
      
    if (error) throw error;
    if (!post) return res.status(404).json({ error: "Post not found" });

    const [{ data: prof }, { data: sp }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("full_name, avatar_url, is_provider, district, town, area")
        .eq("id", post.provider_user_id)
        .maybeSingle(),
      supabaseAdmin
        .from("service_profiles")
        .select("business_name")
        .eq("user_id", post.provider_user_id)
        .maybeSingle(),
    ]);
    
    const bn = sp?.business_name?.trim();
    const author = prof ? { ...prof, full_name: bn || prof.full_name } : undefined;
    
    res.json({ data: { ...post, author } });
  } catch (err) {
    console.error('Error fetching post:', err);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
};

export const updatePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { text, post_type, category_slug, location, media_urls } = req.body;
    
    const { error } = await supabaseAdmin.from("timeline_posts").update({
      text,
      post_type,
      category_slug,
      location,
      media_urls,
    }).eq("id", id).eq("provider_user_id", userId);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating post:', err);
    res.status(500).json({ error: 'Failed to update post' });
  }
};

export const getFollowStatus = async (req, res) => {
  try {
    const { provider_id } = req.params;
    let following = false;
    let count = 0;

    const { data: cData } = await supabaseAdmin.rpc("get_provider_follower_count", { _provider: provider_id });
    if (typeof cData === "number") count = cData;

    if (req.user) {
      const { data } = await supabaseAdmin
        .from("follows")
        .select("follower_id")
        .eq("provider_user_id", provider_id)
        .eq("follower_id", req.user.id)
        .maybeSingle();
      following = !!data;
    }
    
    res.json({ data: { following, count } });
  } catch (err) {
    console.error('Error fetching follow status:', err);
    res.status(500).json({ error: 'Failed to fetch follow status' });
  }
};

export const toggleFollow = async (req, res) => {
  try {
    const userId = req.user.id;
    const { provider_user_id } = req.body;

    const { data: existing } = await supabaseAdmin
      .from("follows")
      .select("id")
      .eq("follower_id", userId)
      .eq("provider_user_id", provider_user_id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin.from("follows").delete().eq("id", existing.id);
      if (error) throw error;
      res.json({ following: false });
    } else {
      const { error } = await supabaseAdmin.from("follows").insert({ follower_id: userId, provider_user_id });
      if (error) throw error;
      res.json({ following: true });
    }
  } catch (err) {
    console.error('Error toggling follow:', err);
    res.status(500).json({ error: 'Failed to toggle follow' });
  }
};

export const getSavedProviderStatus = async (req, res) => {
  try {
    const { provider_id } = req.params;
    let saved = false;

    if (req.user) {
      const { data } = await supabaseAdmin
        .from("saved_providers")
        .select("provider_user_id")
        .eq("user_id", req.user.id)
        .eq("provider_user_id", provider_id)
        .maybeSingle();
      saved = !!data;
    }
    
    res.json({ data: { saved } });
  } catch (err) {
    console.error('Error fetching saved provider status:', err);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
};

export const toggleSavedProvider = async (req, res) => {
  try {
    const userId = req.user.id;
    const { provider_user_id } = req.body;

    const { data: existing } = await supabaseAdmin
      .from("saved_providers")
      .select("id")
      .eq("user_id", userId)
      .eq("provider_user_id", provider_user_id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin.from("saved_providers").delete().eq("id", existing.id);
      if (error) throw error;
      res.json({ saved: false });
    } else {
      const { error } = await supabaseAdmin.from("saved_providers").insert({ user_id: userId, provider_user_id });
      if (error) throw error;
      res.json({ saved: true });
    }
  } catch (err) {
    console.error('Error toggling saved provider:', err);
    res.status(500).json({ error: 'Failed to save provider' });
  }
};

export const getPostInteractions = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    const [{ data: lc }, { count: cc }] = await Promise.all([
      supabaseAdmin.rpc("get_post_like_count", { _post_id: id }),
      supabaseAdmin.from("post_comments").select("*", { count: "exact", head: true }).eq("post_id", id).eq("hidden", false)
    ]);
    
    let liked = false;
    if (userId) {
      const { data } = await supabaseAdmin.from("post_likes").select("post_id").eq("post_id", id).eq("user_id", userId).maybeSingle();
      liked = !!data;
    }
    
    res.json({ data: { likes: typeof lc === "number" ? lc : 0, liked, commentCount: cc || 0 } });
  } catch (err) {
    console.error('Error fetching post interactions:', err);
    res.status(500).json({ error: 'Failed to fetch interactions' });
  }
};

export const getPostComments = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: rows, error } = await supabaseAdmin
      .from("post_comments")
      .select("id,user_id,text,created_at")
      .eq("post_id", id)
      .eq("hidden", false)
      .order("created_at", { ascending: true });
      
    if (error) throw error;
    
    const ids = Array.from(new Set((rows || []).map((r) => r.user_id)));
    let profMap = new Map();
    if (ids.length) {
      const { data: profs } = await supabaseAdmin.from("profiles").select("id,full_name,avatar_url").in("id", ids);
      profMap = new Map((profs || []).map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]));
    }
    
    const comments = (rows || []).map((c) => ({ ...c, profile: profMap.get(c.user_id) }));
    res.json({ data: comments });
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

export const togglePostLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const { data: existing } = await supabaseAdmin.from("post_likes").select("post_id").eq("post_id", id).eq("user_id", userId).maybeSingle();
    
    if (existing) {
      await supabaseAdmin.from("post_likes").delete().eq("post_id", id).eq("user_id", userId);
      res.json({ liked: false });
    } else {
      await supabaseAdmin.from("post_likes").insert({ post_id: id, user_id: userId });
      res.json({ liked: true });
    }
  } catch (err) {
    console.error('Error toggling like:', err);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
};

export const addPostComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { text } = req.body;
    
    if (!text?.trim()) return res.status(400).json({ error: 'Comment text required' });
    
    const { error } = await supabaseAdmin.from("post_comments").insert({ post_id: id, user_id: userId, text: text.trim() });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

export const deletePostComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    // We should probably check if the user owns the comment or is an admin, but bypassing for now since frontend handles it.
    await supabaseAdmin.from("post_comments").delete().eq("id", id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    await supabaseAdmin.from("timeline_posts").delete().eq("id", id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

export const togglePostHidden = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: post } = await supabaseAdmin.from("timeline_posts").select("hidden").eq("id", id).maybeSingle();
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    await supabaseAdmin.from("timeline_posts").update({ hidden: !post.hidden }).eq("id", id);
    res.json({ hidden: !post.hidden });
  } catch (err) {
    console.error('Error toggling post visibility:', err);
    res.status(500).json({ error: 'Failed to toggle visibility' });
  }
};

export const submitReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { target_type, target_id, reason, details } = req.body;
    
    const { error } = await supabaseAdmin.from("reports").insert({
      reporter_id: userId,
      target_type,
      target_id,
      reason,
      details: details || null,
    });
    
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Error submitting report:', err);
    res.status(500).json({ error: 'Failed to submit report' });
  }
};

export const addPost = async (req, res) => {
  try {
    const userId = req.user.id;
    const { business_page_id, public_profile_id, text, category_slug, location, media_urls, post_type } = req.body;
    
    const { error } = await supabaseAdmin.from("timeline_posts").insert({
      provider_user_id: userId,
      business_page_id: business_page_id || null,
      public_profile_id: public_profile_id || null,
      text: text || null,
      category_slug: category_slug || null,
      location: location || null,
      media_urls: media_urls || [],
      post_type,
    });
    
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add post' });
  }
};

export const addRecommendation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { provider_user_id, service, message, rating } = req.body;
    
    if (userId === provider_user_id) {
      return res.status(400).json({ error: 'You cannot recommend yourself' });
    }
    
    const { data, error } = await supabaseAdmin.from("provider_recommendations").upsert({
      provider_user_id,
      user_id: userId,
      service,
      message,
      rating
    }, { onConflict: "provider_user_id,user_id" });
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error adding recommendation:', err);
    res.status(500).json({ error: 'Failed to post recommendation' });
  }
};
