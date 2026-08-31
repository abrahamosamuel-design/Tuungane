import { supabase } from "@/integrations/supabase/client";
import imageCompression from 'browser-image-compression';
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

let ffmpeg: FFmpeg | null = null;

async function loadFFmpeg() {
  if (ffmpeg) return ffmpeg;
  ffmpeg = new FFmpeg();
  
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  return ffmpeg;
}

export async function compressImage(file: File, onProgress?: (p: number) => void): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return file;
  
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    onProgress,
  };
  
  try {
    const compressedBlob = await imageCompression(file, options);
    return new File([compressedBlob], file.name, {
      type: compressedBlob.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error("Image compression failed:", error);
    return file; // fallback
  }
}

export async function compressVideo(file: File, onProgress?: (p: number) => void): Promise<File> {
  if (!file.type.startsWith("video/")) return file;
  
  try {
    const ffmpegInstance = await loadFFmpeg();
    
    const progressCallback = ({ progress }: { progress: number }) => {
      if (onProgress) onProgress(progress * 100);
    };
    ffmpegInstance.on('progress', progressCallback);
    
    const inputName = 'input' + file.name.substring(file.name.lastIndexOf('.'));
    const outputName = 'output.mp4';
    
    await ffmpegInstance.writeFile(inputName, await fetchFile(file));
    
    // Convert to 720p max, fast preset, crf 28
    await ffmpegInstance.exec([
      '-i', inputName,
      '-vf', "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease",
      '-c:v', 'libx264',
      '-preset', 'ultrafast', // ultrafast minimizes browser freezing
      '-crf', '28',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputName
    ]);
    
    const data = await ffmpegInstance.readFile(outputName);
    const compressedBlob = new Blob([data as Uint8Array], { type: 'video/mp4' });
    
    // Cleanup
    ffmpegInstance.deleteFile(inputName);
    ffmpegInstance.deleteFile(outputName);
    ffmpegInstance.off('progress', progressCallback);
    
    return new File([compressedBlob], file.name.replace(/\.[^/.]+$/, "") + ".mp4", {
      type: "video/mp4",
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error("Video compression failed:", error);
    return file; // fallback to original file
  }
}

export async function uploadMedia(
  userId: string, 
  originalFile: File, 
  folder = "posts",
  onProgress?: (msg: string) => void
): Promise<string> {
  let file = originalFile;
  
  if (file.type.startsWith("image/")) {
    if (onProgress) onProgress("Compressing image...");
    file = await compressImage(file);
  } else if (file.type.startsWith("video/")) {
    if (onProgress) onProgress("Preparing video compression...");
    file = await compressVideo(file, (p) => {
      if (onProgress) onProgress(`Compressing video... ${Math.round(p)}%`);
    });
  }

  if (onProgress) onProgress("Uploading...");

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Your session expired. Please log in again and retry the upload.");
  }

  const baseUrl = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3000/api` : 'http://localhost:3000/api');
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
