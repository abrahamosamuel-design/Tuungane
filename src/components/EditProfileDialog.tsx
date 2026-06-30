import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { categories } from "@/data/categories";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import {
  PRICE_TYPE_OPTIONS,
  validatePriceGuide,
  type PriceType,
} from "@/lib/price-guide";

type Props = {
  open: boolean;
  onClose: () => void;
  userId: string;
  hasServiceProfile: boolean;
  initial: {
    full_name: string;
    bio: string;
    town: string;
    district: string;
    business_name?: string;
    sp_bio?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    years_experience?: number;
    availability?: string;
    areas_served?: string[];
    category_slug?: string;
    subcategory?: string;
    price_type?: PriceType | null;
    price_fixed_ugx?: number | null;
    price_min_ugx?: number | null;
    price_max_ugx?: number | null;
    price_note?: string | null;
  };
  onSaved?: () => void;
};

export function EditProfileDialog({ open, onClose, userId, hasServiceProfile, initial, onSaved }: Props) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setForm(initial); }, [initial, open]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const subOptions = useMemo(
    () => categories.find((c) => c.slug === form.category_slug)?.subcategories ?? [],
    [form.category_slug],
  );

  const save = async () => {
    if (hasServiceProfile) {
      const v = validatePriceGuide({
        price_type: (form.price_type ?? null) as PriceType | null,
        price_fixed_ugx: form.price_fixed_ugx ?? null,
        price_min_ugx: form.price_min_ugx ?? null,
        price_max_ugx: form.price_max_ugx ?? null,
      });
      if (!v.ok) { toast.error(v.error); return; }
    }
    setBusy(true);
    try {
      const { error: e1 } = await supabase.from("profiles").update({
        full_name: form.full_name,
        bio: form.bio,
        town: form.town,
        district: form.district,
      }).eq("id", userId);
      if (e1) throw e1;

      if (hasServiceProfile) {
        const availability = (form.availability ?? "available") as "available" | "away" | "busy";
        const priceType = form.price_type || null;
        const { error: e2 } = await supabase.from("service_profiles").update({
          business_name: form.business_name || undefined,
          bio: form.sp_bio || undefined,
          town: form.town,
          district: form.district,
          phone: form.phone || undefined,
          whatsapp: form.whatsapp || undefined,
          email: form.email || undefined,
          years_experience: form.years_experience ?? 0,
          availability,
          areas_served: form.areas_served ?? [],
          category_slug: form.category_slug || undefined,
          subcategory: form.subcategory || undefined,
          price_type: priceType,
          price_fixed_ugx: priceType === "fixed" ? (form.price_fixed_ugx ?? null) : null,
          price_min_ugx: priceType === "starting_from" || priceType === "range" ? (form.price_min_ugx ?? null) : null,
          price_max_ugx: priceType === "range" ? (form.price_max_ugx ?? null) : null,
          price_currency: "UGX",
          price_note: form.price_note?.trim() ? form.price_note.trim() : null,
        }).eq("user_id", userId);
        if (e2) throw e2;
      }
      toast.success("Profile updated");
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Edit profile</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Full name</Label>
            <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
          </div>

          {hasServiceProfile && (
            <div>
              <Label>Business name</Label>
              <Input value={form.business_name ?? ""} onChange={(e) => set("business_name", e.target.value)} />
            </div>
          )}

          <div>
            <Label>Bio</Label>
            <Textarea rows={3} value={form.bio} onChange={(e) => set("bio", e.target.value)} placeholder="Tell people a little about yourself" />
          </div>

          {hasServiceProfile && (
            <>
              <div>
                <Label>Service description</Label>
                <Textarea rows={4} value={form.sp_bio ?? ""} onChange={(e) => set("sp_bio", e.target.value)} placeholder="Describe the service you offer" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Category</Label>
                  <select
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.category_slug ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, category_slug: e.target.value, subcategory: "" }))}
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Subcategory</Label>
                  <select
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.subcategory ?? ""}
                    onChange={(e) => set("subcategory", e.target.value)}
                    disabled={!form.category_slug}
                  >
                    <option value="">{form.category_slug ? "Select subcategory" : "Select category first"}</option>
                    {subOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price Guide */}
              <div className="rounded-xl border border-border bg-surface/50 p-3">
                <div className="mb-2">
                  <Label className="text-sm font-semibold text-navy">Price Guide</Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Help customers know what to expect. This is not a final quote unless you choose
                    Fixed price.
                  </p>
                </div>
                <select
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.price_type ?? ""}
                  onChange={(e) => {
                    const v = (e.target.value || null) as PriceType | null;
                    setForm((f) => ({
                      ...f,
                      price_type: v,
                      price_fixed_ugx: v === "fixed" ? f.price_fixed_ugx : null,
                      price_min_ugx: v === "starting_from" || v === "range" ? f.price_min_ugx : null,
                      price_max_ugx: v === "range" ? f.price_max_ugx : null,
                    }));
                  }}
                >
                  <option value="">No price guide</option>
                  {PRICE_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>

                {form.price_type === "fixed" && (
                  <div className="mt-3">
                    <Label className="text-xs">Fixed price (UGX)</Label>
                    <Input
                      type="number" min={0} inputMode="numeric" placeholder="e.g. 15000"
                      value={form.price_fixed_ugx ?? ""}
                      onChange={(e) => set("price_fixed_ugx", e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
                    />
                  </div>
                )}
                {form.price_type === "starting_from" && (
                  <div className="mt-3">
                    <Label className="text-xs">Starting from (UGX)</Label>
                    <Input
                      type="number" min={0} inputMode="numeric" placeholder="e.g. 20000"
                      value={form.price_min_ugx ?? ""}
                      onChange={(e) => set("price_min_ugx", e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
                    />
                  </div>
                )}
                {form.price_type === "range" && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Minimum (UGX)</Label>
                      <Input
                        type="number" min={0} inputMode="numeric" placeholder="20000"
                        value={form.price_min_ugx ?? ""}
                        onChange={(e) => set("price_min_ugx", e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Maximum (UGX)</Label>
                      <Input
                        type="number" min={0} inputMode="numeric" placeholder="50000"
                        value={form.price_max_ugx ?? ""}
                        onChange={(e) => set("price_max_ugx", e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
                      />
                    </div>
                  </div>
                )}
                {form.price_type && (
                  <div className="mt-3">
                    <Label className="text-xs">Note (optional)</Label>
                    <Input
                      placeholder="e.g. Depends on car size, transport may apply"
                      value={form.price_note ?? ""}
                      onChange={(e) => set("price_note", e.target.value)}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>District</Label>
              <Input value={form.district} onChange={(e) => set("district", e.target.value)} />
            </div>
            <div>
              <Label>Town</Label>
              <Input value={form.town} onChange={(e) => set("town", e.target.value)} />
            </div>
          </div>

          {hasServiceProfile && (
            <>
              <div>
                <Label>Areas served (comma separated)</Label>
                <Input value={(form.areas_served ?? []).join(", ")} onChange={(e) => set("areas_served", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Years experience</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 3"
                    value={form.years_experience ? String(form.years_experience) : ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      set("years_experience", v === "" ? undefined : Math.max(0, Number(v)));
                    }}
                  />
                </div>
                <div>
                  <Label>Availability</Label>
                  <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm capitalize" value={form.availability ?? "available"} onChange={(e) => set("availability", e.target.value)}>
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="away">Away</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label>Phone</Label>
                  <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
                </div>
                <div>
                  <Label>WhatsApp</Label>
                  <Input value={form.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
                </div>
              </div>
            </>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={save} disabled={!dirty || busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
