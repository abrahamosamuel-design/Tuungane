import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/upload";
import { toast } from "sonner";

const STORAGE_KEY = "tuungane_add_photo_nudge_dismissed_at";
const COOLDOWN_DAYS = 7;

function isDismissedRecently(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (!v) return false;
    const ts = Number(v);
    if (!Number.isFinite(ts)) return false;
    const days = (Date.now() - ts) / 86400000;
    return days < COOLDOWN_DAYS;
  } catch { return false; }
}

type Props = {
  userId: string;
  hasPhoto: boolean;
  onUploaded?: (url: string) => void;
};

/**
 * Dismissible, friendly reminder to add a profile photo.
 * Non-blocking; respects a 7-day cooldown after dismissal.
 */
export function AddPhotoNudge({ userId, hasPhoto, onUploaded }: Props) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVisible(!hasPhoto && !isDismissedRecently());
  }, [hasPhoto]);

  if (!visible) return null;

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* ignore */ }
    setVisible(false);
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be smaller than 8MB");
      return;
    }
    setBusy(true);
    try {
      const url = await uploadMedia(userId, file, "avatars");
      const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
      if (error) throw error;
      toast.success("Profile photo added — looking great!");
      onUploaded?.(url);
      setVisible(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-orange/30 bg-gradient-to-br from-orange/10 via-card to-card p-4">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 rounded-full p-1 text-navy/50 hover:bg-muted hover:text-navy"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange text-orange-foreground">
          <Camera className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-sm font-bold text-navy">Add a profile photo</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Providers with clear profile photos look more trustworthy and receive more requests. You can change or remove it anytime.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-full bg-orange px-3 py-1.5 text-xs font-semibold text-orange-foreground hover:bg-orange/90 disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5" /> {busy ? "Uploading…" : "Add photo"}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-navy/70 hover:border-navy/30"
            >
              Later
            </button>
          </div>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );
}
