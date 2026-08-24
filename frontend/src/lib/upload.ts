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
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Your session expired. Please log in again and retry the upload.");
  }

  // Request a presigned URL from our backend
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  const presignRes = await fetch(`${baseUrl}/upload/presign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      folder,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
    }),
  });

  if (!presignRes.ok) {
    const errorPayload = await presignRes.json().catch(() => null);
    throw new Error(errorPayload?.error || "Failed to generate secure upload link.");
  }

  const { uploadUrl, publicUrl } = await presignRes.json();

  if (!uploadUrl || !publicUrl) {
    throw new Error("Backend did not return required upload URLs.");
  }

  // PUT the file directly to Cloudflare R2
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error("Failed to upload media to cloud storage.");
  }

  return publicUrl;
}
