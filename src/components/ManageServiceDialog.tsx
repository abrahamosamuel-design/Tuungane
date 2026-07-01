import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PRICE_TYPE_OPTIONS, validatePriceGuide, type PriceType } from "@/lib/price-guide";

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
};

const parseNum = (v: string): number | null => {
  const cleaned = v.replace(/[^0-9]/g, "");
  if (!cleaned) return null;
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? null : n;
};

export function ManageServiceDialog({ open, onClose, mode, profileId, initial, onSaved }: Props) {
  const [form, setForm] = useState<ServiceForm>({ ...empty, ...(initial ?? {}) });
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) setForm({ ...empty, ...(initial ?? {}) }); }, [open, initial]);

  const set = <K extends keyof ServiceForm>(k: K, v: ServiceForm[K]) => setForm((f) => ({ ...f, [k]: v }));

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
    };
    let error: { message: string } | null = null;
    if (mode === "create") {
      const res = await supabase.from("profile_services").insert({ ...payload, profile_id: profileId } as never);
      error = res.error;
    } else if (form.id) {
      const res = await supabase.from("profile_services").update(payload as never).eq("id", form.id);
      error = res.error;
    }
    setBusy(false);
    if (error) { toast.error(error.message || "Could not save changes. Please try again."); return; }
    toast.success(mode === "create" ? "Service added" : "Service updated");
    onSaved?.();
    onClose();
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
