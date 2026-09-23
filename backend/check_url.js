import fetch from 'node-fetch';

async function check() {
  const url = "https://gnahstkkcdkbmdmlkigh.supabase.co/storage/v1/object/public/tuungane-media/b218c635-7e95-44e8-8a70-7c1fbe19777b/avatars/1783075056541-tpb1wb.jpg";
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log("Status:", res.status, res.statusText);
    console.log("Content-Type:", res.headers.get('content-type'));
    console.log("Content-Length:", res.headers.get('content-length'));
  } catch (e) {
    console.error("Error:", e);
  }
}

check();
