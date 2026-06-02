import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

function toStorageObjectUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/tuungane-media/${path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

export async function uploadMedia(userId: string, file: File, folder = "posts"): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Your session expired. Please log in again and retry the upload.");
  }

  const response = await fetch(toStorageObjectUrl(path), {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "x-upsert": "false",
      "content-type": file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.message || payload?.error || "Upload failed";
    throw new Error(
      message.includes("row-level security policy")
        ? "Upload failed because your sign-in session was not attached correctly. Please refresh and try again."
        : message,
    );
  }

  const { data } = supabase.storage.from("tuungane-media").getPublicUrl(path);
  return data.publicUrl;
}
