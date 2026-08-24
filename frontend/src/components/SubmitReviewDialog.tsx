import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, Loader2, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { Avatar } from "@/components/social/Avatar";
import { uploadMedia } from "@/lib/upload";
import { useAuth } from "@/hooks/use-auth";
import { useRef } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
  providerName: string;
  providerAvatar: string | null;
  serviceTitle: string;
};

export function SubmitReviewDialog({ open, onOpenChange, providerId, providerName, providerAvatar, serviceTitle }: Props) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState("");
  const [media, setMedia] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating.");
      return;
    }
    
    setSubmitting(true);
    try {
      await apiClient.post("/social/reviews", {
        provider_user_id: providerId,
        rating,
        text,
        media_urls: media,
      });
      toast.success("Review submitted successfully!");
      onOpenChange(false);
      setRating(0);
      setText("");
      setMedia([]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = async (files: FileList | null) => {
    if (!files || !user) return;
    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const f of Array.from(files).slice(0, 4 - media.length)) {
        if (!f.type.startsWith("image/")) {
          toast.error(`${f.name} is not an image`);
          continue;
        }
        const url = await uploadMedia(user.id, f, "reviews");
        newUrls.push(url);
      }
      setMedia((m) => [...m, ...newUrls].slice(0, 4));
    } catch (e) {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (idx: number) => {
    setMedia((m) => m.filter((_, i) => i !== idx));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-auto bottom-0 sm:top-[50%] sm:bottom-auto !translate-y-0 sm:!-translate-y-1/2 rounded-t-[2rem] rounded-b-none sm:rounded-2xl max-w-md p-6 gap-6 pt-8 pb-10 border-b-0">
        <DialogHeader className="flex flex-col items-center">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted/50 sm:hidden" />
          <div className="flex justify-center mb-2">
            <Avatar name={providerName} url={providerAvatar} size={80} />
          </div>
          <DialogTitle className="text-center text-xl text-navy">{providerName}</DialogTitle>
          <p className="text-center text-sm text-muted-foreground mt-1">
            For <span className="font-bold text-foreground">{serviceTitle}</span>
          </p>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6">
          <div className="flex gap-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="focus:outline-none transition-transform active:scale-90"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={`h-11 w-11 ${
                    (hoverRating || rating) >= star
                      ? "fill-orange text-orange"
                      : "fill-muted text-muted/50"
                  } transition-colors`}
                />
              </button>
            ))}
          </div>

          <div className="relative w-full">

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share your experience with this service provider (optional)"
              className="w-full rounded-2xl border border-border bg-muted/10 p-4 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange min-h-[120px] resize-none pb-12"
            />
            
            <div className="absolute bottom-2 left-2 flex items-center gap-2">
              <input 
                type="file" 
                ref={fileRef} 
                className="hidden" 
                accept="image/*"
                multiple
                onChange={(e) => handleFileChange(e.target.files)}
              />
              <button 
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || media.length >= 4}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
              </button>
            </div>
          </div>
          
          {media.length > 0 && (
            <div className="flex w-full gap-2 overflow-x-auto pb-2">
              {media.map((url, i) => (
                <div key={i} className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
                  <img src={url} alt="Attached image" className="h-full w-full object-cover" />
                  <button
                    onClick={() => removeMedia(i)}
                    className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-black"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="w-full flex justify-center items-center gap-2 rounded-full bg-navy py-4 text-sm font-bold text-white transition-colors hover:bg-navy/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Review"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
