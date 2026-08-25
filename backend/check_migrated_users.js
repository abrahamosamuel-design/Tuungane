async function checkCoverUrl() {
  const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2bGJpcmdhemNkaWJobmF3cm9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNDE3NTIsImV4cCI6MjA5NTYxNzc1Mn0.HTbKsC4wOrzyDwJdWb5KaN5XVC5KDVJskJ1uoqkWaTk';
  const userId = '3416a4dd-afb4-4f56-b8d7-c8c207871f0d';
  
  try {
    let res = await fetch(`https://bvlbirgazcdibhnawrok.supabase.co/rest/v1/public_profiles?owner_id=eq.${userId}&select=id,name,cover_url,profile_type`, {
      headers: { 'apikey': apikey, 'Authorization': `Bearer ${apikey}` }
    });
    let data = await res.json();
    console.log('public_profiles:', data);

    res = await fetch(`https://bvlbirgazcdibhnawrok.supabase.co/rest/v1/service_profiles?user_id=eq.${userId}&select=cover_url,header_url`, {
      headers: { 'apikey': apikey, 'Authorization': `Bearer ${apikey}` }
    });
    data = await res.json();
    console.log('service_profiles:', data);
  } catch (err) {
    console.error('Error querying:', err);
  }
}

checkCoverUrl();
