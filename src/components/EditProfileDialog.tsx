import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { categories } from "@/data/categories";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
