import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, ImagePlus, X } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { PRICE_TYPE_OPTIONS, validatePriceGuide, type PriceType } from "@/lib/price-guide";
import { useAuth } from "@/hooks/use-auth";
import { uploadMedia } from "@/lib/upload";

export type ServiceForm = {
  id?: string;
  title: string;
  description: string | null;
  active: boolean;
  is_primary: boolean;
  price_type: PriceType | null;
  price_fixed_ugx: number | null;
  price_min_ugx: number | null;
  price_max_ugx: number | null;
  price_note: string | null;
  photos: string[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  profileId: string; // public_profiles.id
  initial?: Partial<ServiceForm>;
  onSaved?: () => void;
};

const empty: ServiceForm = {
  title: "",
  description: "",
  active: true,
  is_primary: false,
  price_type: null,
  price_fixed_ugx: null,
  price_min_ugx: null,
  price_max_ugx: null,
  price_note: "",
  photos: [],
};

const parseNum = (v: string): number | null => {
  const cleaned = v.replace(/[^0-9]/g, "");
  if (!cleaned) return null;
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? null : n;
};

export function ManageServiceDialog({ open, onClose, mode, profileId, initial, onSaved }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState<ServiceForm>({ ...empty, ...(initial ?? {}) });
  const [busy, setBusy] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) setForm({ ...empty, ...(initial ?? {}) }); }, [open, initial]);

  const set = <K extends keyof ServiceForm>(k: K, v: ServiceForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !user) return;
    if (form.photos.length + files.length > 5) { toast.error("Max 5 images"); return; }
    
    const validFiles = files.filter(f => f.size <= 3 * 1024 * 1024);
    if (validFiles.length < files.length) {
      toast.error("Images must be 3MB or less");
    }
    if (validFiles.length === 0) return;

    setUploadingImg(true);
    try {
      const urls = await Promise.all(validFiles.map(f => uploadMedia(user.id, f, "service-images")));
      set("photos", [...form.photos, ...urls]);
    } catch { toast.error("Image upload failed"); }
    finally { setUploadingImg(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error("Service name is required"); return; }
    const v = validatePriceGuide({
      price_type: form.price_type,
      price_fixed_ugx: form.price_fixed_ugx,
      price_min_ugx: form.price_min_ugx,
      price_max_ugx: form.price_max_ugx,
    });
    if (!v.ok) { toast.error(v.error); return; }

    setBusy(true);
    const payload = {
      title: form.title.trim(),
      description: form.description?.trim() || null,
      active: form.active,
      is_primary: form.is_primary,
      price_type: form.price_type,
      price_fixed_ugx: form.price_type === "fixed" ? form.price_fixed_ugx : null,
      price_min_ugx: form.price_type === "starting_from" || form.price_type === "range" ? form.price_min_ugx : null,
      price_max_ugx: form.price_type === "range" ? form.price_max_ugx : null,
      price_currency: "UGX",
      price_note: form.price_type ? (form.price_note?.trim() || null) : null,
      photos: form.photos,
    };
    try {
      if (mode === "create") {
        await apiClient.post(`/services/profile/${profileId}`, payload);
      } else if (form.id) {
        await apiClient.patch(`/services/${form.id}`, payload);
      }
      toast.success(mode === "create" ? "Service added" : "Service updated");
      onSaved?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Could not save changes. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add service" : "Edit service"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Service name</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Full Wash" maxLength={80} />
          </div>
          <div>
            <Label>Short description (optional)</Label>
            <Textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} rows={3} maxLength={500} />
          </div>

          <div>
            <Label>Photos (up to 5)</Label>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {form.photos.map((url, idx) => (
                <div key={idx} className="relative aspect-square overflow-hidden rounded-md border border-border">
                  <img src={url} alt="Service" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => set("photos", form.photos.filter((_, i) => i !== idx))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {form.photos.length < 5 && (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={busy || uploadingImg} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border bg-muted/20 text-muted-foreground hover:bg-muted/50 disabled:opacity-50">
                  {uploadingImg ? <span className="text-xs">Uploading…</span> : <><ImagePlus className="h-6 w-6" /><span className="text-[10px]">Add photo</span></>}
                </button>
              )}
            </div>
            <input type="file" ref={fileRef} accept="image/*" multiple className="hidden" onChange={handleImagePick} />
          </div>

          <div className="rounded-xl border border-border p-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-navy/70">Price guide</Label>
            <select
              value={form.price_type ?? ""}
              onChange={(e) => set("price_type", (e.target.value || null) as PriceType | null)}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">No price guide</option>
              {PRICE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {form.price_type === "fixed" && (
              <div className="mt-2"><Label>Fixed price (UGX)</Label>
                <Input value={form.price_fixed_ugx?.toString() ?? ""} onChange={(e) => set("price_fixed_ugx", parseNum(e.target.value))} placeholder="50000" />
              </div>
            )}
            {form.price_type === "starting_from" && (
              <div className="mt-2"><Label>Starting from (UGX)</Label>
                <Input value={form.price_min_ugx?.toString() ?? ""} onChange={(e) => set("price_min_ugx", parseNum(e.target.value))} placeholder="20000" />
              </div>
            )}
            {form.price_type === "range" && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div><Label>Min (UGX)</Label>
                  <Input value={form.price_min_ugx?.toString() ?? ""} onChange={(e) => set("price_min_ugx", parseNum(e.target.value))} placeholder="20000" />
                </div>
                <div><Label>Max (UGX)</Label>
                  <Input value={form.price_max_ugx?.toString() ?? ""} onChange={(e) => set("price_max_ugx", parseNum(e.target.value))} placeholder="80000" />
                </div>
              </div>
            )}
            {form.price_type && (
              <div className="mt-2"><Label>Note (optional)</Label>
                <Input value={form.price_note ?? ""} onChange={(e) => set("price_note", e.target.value)} placeholder="e.g. excludes materials" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={form.is_primary} onChange={(e) => set("is_primary", e.target.checked)} />
              <span>Mark as main service (shown on your provider card)</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
              <span>Active (visible to customers)</span>
            </label>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={save} disabled={busy || !form.title.trim()}>
            {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {busy ? "Saving…" : mode === "create" ? "Add service" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
