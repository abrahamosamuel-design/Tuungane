import { supabaseAdmin } from '../lib/supabaseClient.js';

export const getJobOpportunities = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('timeline_posts')
      .select('id, provider_user_id, text, location, media_urls, created_at, post_type')
      .eq('hidden', false)
      .eq('post_type', 'opportunity_shared')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching jobs:", error);
      return res.status(500).json({ error: error.message });
    }
    
    const validJobs = (data || []).map(post => {
      try {
        const payload = JSON.parse(post.text);
        if (payload && payload.type === 'job_opportunity') {
           return { ...post, ...payload, text: undefined };
        }
      } catch (e) {
        // Not a JSON job opportunity
      }
      return null;
    }).filter(Boolean);

    res.json({ data: validJobs });
  } catch (err) {
    console.error('getJobOpportunities error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const createJobOpportunity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { job_title, company_name, location, qualification, salary, cover_image_url } = req.body;

    if (!job_title || !company_name || !location) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const payload = {
      type: "job_opportunity",
      job_title,
      company_name,
      location,
      qualification: qualification || "",
      salary: salary || ""
    };

    const media_urls = cover_image_url ? [cover_image_url] : [];

    const { data, error } = await supabaseAdmin
      .from('timeline_posts')
      .insert({
        provider_user_id: userId,
        text: JSON.stringify(payload),
        location,
        category_slug: 'jobs',
        media_urls,
        post_type: 'opportunity_shared'
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating job:", error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ data });
  } catch (err) {
    console.error('createJobOpportunity error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getJobOpportunityById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from('timeline_posts')
      .select('id, provider_user_id, text, location, media_urls, created_at, post_type')
      .eq('id', id)
      .eq('post_type', 'opportunity_shared')
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Job not found' });
    }

    let payload = {};
    try {
      payload = JSON.parse(data.text);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid job data' });
    }

    res.json({ data: { ...data, ...payload, text: undefined } });
  } catch (err) {
    console.error('getJobOpportunityById error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getJobRequests = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('timeline_posts')
      .select('id, provider_user_id, text, location, media_urls, created_at, post_type')
      .eq('hidden', false)
      .eq('post_type', 'opportunity_shared')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching job requests:", error);
      return res.status(500).json({ error: error.message });
    }
    
    // Fetch profiles for job requests
    let enrichedData = [];
    if (data && data.length > 0) {
      const userIds = Array.from(new Set(data.map(p => p.provider_user_id)));
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
        
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      
      enrichedData = data.map(post => {
        try {
          const payload = JSON.parse(post.text);
          if (payload && payload.type === 'job_request') {
             return { 
               ...post, 
               ...payload, 
               text: undefined,
               profile: profileMap.get(post.provider_user_id)
             };
          }
        } catch (e) { }
        return null;
      }).filter(Boolean);
    }

    res.json({ data: enrichedData });
  } catch (err) {
    console.error('getJobRequests error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

  export const createJobRequest = async (req, res) => {
    try {
      const userId = req.user.id;
      const { 
        job_title, 
        resume_summary, 
        experience_years, 
        location, 
        cover_image_url,
        full_name,
        age,
        gender,
        address,
        contact_info,
        academic_qualifications,
        working_experience,
        skills,
        hobbies,
        referees
      } = req.body;
  
      if (!job_title || !resume_summary || !location) {
        return res.status(400).json({ error: "Missing required fields" });
      }
  
      const payload = {
        type: "job_request",
        job_title,
        resume_summary,
        experience_years: experience_years || "",
        location,
        full_name: full_name || "",
        age: age || "",
        gender: gender || "",
        address: address || "",
        contact_info: contact_info || "",
        academic_qualifications: academic_qualifications || "",
        working_experience: working_experience || "",
        skills: skills || "",
        hobbies: hobbies || "",
        referees: referees || ""
      };

    const media_urls = cover_image_url ? [cover_image_url] : [];

    const { data, error } = await supabaseAdmin
      .from('timeline_posts')
      .insert({
        provider_user_id: userId,
        text: JSON.stringify(payload),
        location,
        category_slug: 'jobs',
        media_urls,
        post_type: 'opportunity_shared'
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating job request:", error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ data });
  } catch (err) {
    console.error('createJobRequest error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
