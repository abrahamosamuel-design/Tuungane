import { supabase } from "@/integrations/supabase/client";

export async function uploadMedia(userId: string, file: File, folder = "posts"): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("tuungane-media").upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("tuungane-media").getPublicUrl(path);
  return data.publicUrl;
}
