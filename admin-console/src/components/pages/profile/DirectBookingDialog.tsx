import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { uploadMedia } from "@/lib/upload";

interface ServiceData {
  id: string;
  title: string;
  price_fixed_ugx?: number;
  price_note?: string; // unit of measurement
  category_slug?: string;
  subcategory?: string;
}

interface DirectBookingDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  providerId: string;
  service?: ServiceData;
}

export function DirectBookingDialog({ open, onOpenChange, providerId, service }: DirectBookingDialogProps) {
  const { user } = useAuth();
  const [quantity, setQuantity] = useState<number>(1);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const priceTotal = (service?.price_fixed_ugx || 0) * quantity;
  const unit = service?.price_note || "unit";

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !user) return;
    if (images.length + files.length > 5) { toast.error("Max 5 images"); return; }
    
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(f => uploadMedia(user.id, f, "request-images")));
      setImages(prev => [...prev, ...urls]);
    } catch { toast.error("Image upload failed"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!service) { toast.error("Service required"); return; }
    
    setBusy(true);
    try {
      // Create request payload
      const payload = {
        provider_id: providerId,
        service_needed: service.title,
        category_slug: service.category_slug,
        subcategory: service.subcategory,
        description: description,
        media_urls: images,
        quantity: quantity,
        price_total: priceTotal,
        visibility: "direct",
        urgency: "normal",
      };

      await apiClient("/direct-bookings", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success("Request sent successfully! You can view it in your Messages.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send request");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto w-full top-auto bottom-0 translate-y-0 left-0 translate-x-0 rounded-b-none rounded-t-2xl sm:top-[50%] sm:bottom-auto sm:translate-y-[-50%] sm:left-[50%] sm:translate-x-[-50%] sm:rounded-xl p-6 slide-in-from-bottom-1/2 sm:slide-in-from-bottom-0">
        <DialogHeader>
          <DialogTitle>Request Service: {service?.title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-5 py-2">
          
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700">Quantity ({unit}s)</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:bg-white focus:border-orange focus:ring-2 focus:ring-orange/20 transition-all"
                required
              />
            </div>
            
            {service?.price_fixed_ugx ? (
              <div className="flex-1 text-right pt-6">
                <p className="text-xs text-gray-500 font-medium">Estimated Total</p>
                <p className="text-lg font-bold text-navy">UGX {priceTotal.toLocaleString()}</p>
              </div>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">Description / Details</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide any specific details or instructions..."
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:bg-white focus:border-orange focus:ring-2 focus:ring-orange/20 transition-all min-h-[100px] resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">Add Photos <span className="font-normal text-gray-400">(optional)</span></label>
            <div className="mt-2 flex flex-wrap gap-2">
              {images.map((url, i) => (
                <div key={i} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-200">
                  <img src={url} alt="Upload" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setImages(images.filter((_, idx) => idx !== i))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex h-20 w-20 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 hover:border-orange hover:bg-orange/5 hover:text-orange disabled:opacity-50 transition-all"
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-6 h-6" />}
                </button>
              )}
            </div>
            <input type="file" ref={fileRef} className="hidden" accept="image/*" multiple onChange={handleImagePick} />
          </div>

          <div className="mt-2 flex flex-col gap-2">
            <button type="submit" disabled={busy || uploading} className="w-full rounded-xl bg-orange py-3.5 text-center text-sm font-bold text-white shadow-md hover:bg-orange/90 active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Send Request
            </button>
            <button type="button" onClick={() => onOpenChange(false)} className="w-full rounded-xl bg-gray-100 py-3.5 text-center text-sm font-bold text-gray-700 hover:bg-gray-200 active:scale-[0.98] transition-transform">
              Cancel
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
