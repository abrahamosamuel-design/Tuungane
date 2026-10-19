import { useRef, useState } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { uploadMedia } from "@/lib/upload";
import { toast } from "sonner";
import { toastError } from "@/lib/user-errors";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Multi-image uploader used by service request and service listing forms.
 *
 * Uploads each selected file to Supabase Storage and exposes the resulting
 * public URLs through `onChange`. Users can remove an image before submitting.
 */
export function MediaUploader({
  userId,
  folder = "posts",
  value,
  onChange,
  max = 6,
  label = "Add photos (optional)",
  hint = "Up to 6 photos · JPG, PNG, WEBP or HEIC · 8MB each",
}: {
  userId: string;
  folder?: string;
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  label?: string;
  hint?: string;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(0);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const slots = Math.max(0, max - value.length);
    const picked = Array.from(files).slice(0, slots);
    if (picked.length === 0) {
      toast.error(`You can attach up to ${max} photos.`);
      return;
    }
    setUploading((n) => n + picked.length);
    const uploaded: string[] = [];
    for (const file of picked) {
      const isAccepted = ACCEPTED.includes(file.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
      if (!isAccepted) {
        toast.error(`"${file.name}" isn't a supported image. Use JPG, PNG, WEBP or HEIC.`);
        setUploading((n) => Math.max(0, n - 1));
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`"${file.name}" is too large. Please keep each photo under 8MB.`);
        setUploading((n) => Math.max(0, n - 1));
        continue;
      }
      try {
        const url = await uploadMedia(userId, file, folder);
        uploaded.push(url);
      } catch (err) {
        toastError(err, `Couldn't upload "${file.name}"`);
      } finally {
        setUploading((n) => Math.max(0, n - 1));
      }
    }
    if (uploaded.length > 0) onChange([...value, ...uploaded]);
  };

  const removeAt = (i: number) => {
    const next = value.slice();
    next.splice(i, 1);
    onChange(next);
  };

  const remaining = max - value.length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-navy">{label}</label>
        <span className="text-[11px] text-muted-foreground">
          {value.length}/{max}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {value.map((url, i) => (
          <div
            key={url + i}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
          >
            <img src={url} alt={`Attached ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label="Remove photo"
              className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white hover:bg-black/80"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading > 0}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border bg-surface/40 text-xs font-medium text-navy hover:border-orange disabled:opacity-50"
          >
            {uploading > 0 ? (
              <Loader2 className="h-5 w-5 animate-spin text-orange" />
            ) : (
              <Camera className="h-5 w-5 text-orange" />
            )}
            <span>{uploading > 0 ? "Uploading…" : "Add photo"}</span>
          </button>
        )}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{hint}</p>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
