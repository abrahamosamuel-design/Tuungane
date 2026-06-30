import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
  };
  onSaved?: () => void;
};

export function EditProfileDialog({ open, onClose, userId, hasServiceProfile, initial, onSaved }: Props) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setForm(initial); }, [initial, open]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

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
        const { error: e2 } = await supabase.from("service_profiles").update({
          business_name: form.business_name || null,
          bio: form.sp_bio || null,
          town: form.town,
          district: form.district,
          phone: form.phone || null,
          whatsapp: form.whatsapp || null,
          email: form.email || null,
          years_experience: form.years_experience ?? 0,
          availability: form.availability || "flexible",
          areas_served: form.areas_served ?? [],
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
            <div>
              <Label>Service description</Label>
              <Textarea rows={4} value={form.sp_bio ?? ""} onChange={(e) => set("sp_bio", e.target.value)} placeholder="Describe the service you offer" />
            </div>
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
                  <Input type="number" min={0} value={form.years_experience ?? 0} onChange={(e) => set("years_experience", Number(e.target.value))} />
                </div>
                <div>
                  <Label>Availability</Label>
                  <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm capitalize" value={form.availability ?? "flexible"} onChange={(e) => set("availability", e.target.value)}>
                    <option value="flexible">Flexible</option>
                    <option value="weekdays">Weekdays</option>
                    <option value="weekends">Weekends</option>
                    <option value="evenings">Evenings</option>
                    <option value="full_time">Full time</option>
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
