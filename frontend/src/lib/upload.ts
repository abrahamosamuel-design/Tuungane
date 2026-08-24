import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

function toStorageObjectUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/tuungane-media/${path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

export async function compressImage(file: File, quality = 0.7): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(file);
        
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (!blob) return resolve(file);
          resolve(new File([blob], file.name, {
            type: "image/jpeg",
            lastModified: Date.now(),
          }));
        }, "image/jpeg", quality);
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

export async function uploadMedia(userId: string, file: File, folder = "posts"): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Upload is not configured correctly for this project.");
  }

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
