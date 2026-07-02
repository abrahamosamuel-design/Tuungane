import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { toastError } from "@/lib/user-errors";

type EditableFields = {
  title: string | null;
  service_needed: string | null;
  description: string | null;
  budget_range: string | null;
  urgency: string | null;
  urgent_flag: boolean | null;
  preferred_date: string | null;
  preferred_time: string | null;
  town: string | null;
  district: string | null;
  area: string | null;
};

export function EditRequestDialog({
  open,
  onClose,
  requestId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  requestId: string | null;
  onSaved?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<EditableFields>({
    title: "",
    service_needed: "",
    description: "",
    budget_range: "",
    urgency: "normal",
    urgent_flag: false,
    preferred_date: "",
    preferred_time: "",
    town: "",
    district: "",
    area: "",
  });

  useEffect(() => {
    if (!open || !requestId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("service_requests")
        .select("title,service_needed,description,budget_range,urgency,urgent_flag,preferred_date,preferred_time,town,district,area")
        .eq("id", requestId)
        .maybeSingle();
      setLoading(false);
      if (error || !data) {
        toast.error("Couldn't load this request");
        onClose();
        return;
      }
      setF({
        title: data.title ?? "",
        service_needed: data.service_needed ?? "",
        description: data.description ?? "",
        budget_range: data.budget_range ?? "",
        urgency: data.urgency ?? "normal",
        urgent_flag: !!data.urgent_flag,
        preferred_date: data.preferred_date ?? "",
        preferred_time: data.preferred_time ?? "",
        town: data.town ?? "",
        district: data.district ?? "",
        area: data.area ?? "",
      });
    })();
  }, [open, requestId, onClose]);

  const save = async () => {
    if (!requestId) return;
    setSaving(true);
    const payload = {
      title: f.title?.trim() || null,
      service_needed: f.service_needed?.trim() || null,
      description: f.description?.trim() || null,
      budget_range: f.budget_range?.trim() || null,
      urgency: f.urgency || "normal",
      urgent_flag: !!f.urgent_flag,
      preferred_date: f.preferred_date || null,
      preferred_time: f.preferred_time || null,
      town: f.town?.trim() || null,
      district: f.district?.trim() || null,
      area: f.area?.trim() || null,
    };
    const { error } = await supabase.from("service_requests").update(payload as never).eq("id", requestId);
    setSaving(false);
    if (error) return toastError(error, "Couldn't update request");
    toast.success("Request updated");
    onSaved?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit your request</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor="er-title">Title</Label>
              <Input id="er-title" value={f.title ?? ""} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Need a plumber to fix leaking sink" />
            </div>
            <div>
              <Label htmlFor="er-service">Service needed</Label>
              <Input id="er-service" value={f.service_needed ?? ""} onChange={(e) => setF({ ...f, service_needed: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="er-desc">Description</Label>
              <Textarea id="er-desc" rows={4} value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="er-budget">Budget</Label>
                <Input id="er-budget" value={f.budget_range ?? ""} onChange={(e) => setF({ ...f, budget_range: e.target.value })} placeholder="e.g. UGX 100,000 - 200,000" />
              </div>
              <div>
                <Label htmlFor="er-urgency">Urgency</Label>
                <select
                  id="er-urgency"
                  value={f.urgency ?? "normal"}
                  onChange={(e) => setF({ ...f, urgency: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="normal">Flexible</option>
                  <option value="urgent">This week</option>
                  <option value="emergency">Today</option>
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="er-date">Preferred date</Label>
                <Input id="er-date" type="date" value={f.preferred_date ?? ""} onChange={(e) => setF({ ...f, preferred_date: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="er-time">Preferred time</Label>
                <Input id="er-time" value={f.preferred_time ?? ""} onChange={(e) => setF({ ...f, preferred_time: e.target.value })} placeholder="e.g. Morning" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="er-town">Town</Label>
                <Input id="er-town" value={f.town ?? ""} onChange={(e) => setF({ ...f, town: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="er-district">District</Label>
                <Input id="er-district" value={f.district ?? ""} onChange={(e) => setF({ ...f, district: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="er-area">Area</Label>
                <Input id="er-area" value={f.area ?? ""} onChange={(e) => setF({ ...f, area: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!f.urgent_flag} onChange={(e) => setF({ ...f, urgent_flag: e.target.checked })} />
              Mark as urgent
            </label>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving || loading} className="bg-orange text-orange-foreground hover:brightness-110">
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
