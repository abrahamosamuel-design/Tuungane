import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { toastError } from "@/lib/user-errors";
import { useAuth } from "@/hooks/use-auth";
import { useCategories } from "@/hooks/use-categories";
import { budgetBuckets } from "@/data/serviceRequestTypes";
import { PostAsSelector } from "@/components/PostAsSelector";
import { usePostAsOptions, findOption, keyFromRow } from "@/hooks/use-post-as-options";

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
  category_slug: string | null;
  subcategory: string | null;
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
  const { user } = useAuth();
  const { categories } = useCategories();
  const { options: postedAsOptions, loading: loadingPostedAsOptions } = usePostAsOptions(user?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [postedAsKey, setPostedAsKey] = useState<string>("individual");
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
    category_slug: "",
    subcategory: "",
  });

  useEffect(() => {
    if (!open || !requestId) return;
    (async () => {
      try {
        const { data: res } = await apiClient(`/requests/${requestId}`);
        setLoading(false);
        const d = res.data;
        if (!d) throw new Error("No data");

      setF({
        title: d.title ?? "",
        service_needed: d.service_needed ?? "",
        description: d.description ?? "",
        budget_range: d.budget_range ?? "",
        urgency: d.urgency ?? "normal",
        urgent_flag: !!d.urgent_flag,
        preferred_date: d.preferred_date ?? "",
        preferred_time: d.preferred_time ?? "",
        town: d.town ?? "",
        district: d.district ?? "",
        area: d.area ?? "",
        category_slug: d.category_slug ?? "",
        subcategory: d.subcategory ?? "",
      });
      setPostedAsKey(keyFromRow(d));
      } catch (err) {
        setLoading(false);
        toast.error("Couldn't load this request");
        onClose();
      }
    })();
  }, [open, requestId, onClose]);

  const activeCat = useMemo(
    () => categories.find((c) => c.slug === (f.category_slug || "")),
    [categories, f.category_slug],
  );

  const save = async () => {
    if (!requestId) return;
    if (loadingPostedAsOptions) {
      toast.error("Still loading your posting options — please try again in a moment");
      return;
    }
    const postedAs = findOption(postedAsOptions, postedAsKey);
    if (postedAsKey !== "individual" && !postedAs) {
      toast.error("Couldn't find the selected posting identity");
      return;
    }
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
      category_slug: f.category_slug || null,
      subcategory: f.subcategory || null,
      posted_as_type: postedAs?.posted_as_type ?? "individual",
      posted_as_name: postedAs && postedAs.posted_as_type === "business" ? postedAs.name : null,
      posted_as_avatar_url: postedAs && postedAs.posted_as_type === "business" ? postedAs.avatar_url : null,
      posted_as_ref_type: postedAs?.posted_as_ref_type ?? null,
      posted_as_ref_id: postedAs?.posted_as_ref_id ?? null,
    };
    try {
      await apiClient.patch(`/requests/${requestId}`, payload);
      toast.success("Request updated");
      onSaved?.();
      onClose();
    } catch (err: any) {
      toastError(err, "Couldn't update request");
    } finally {
      setSaving(false);
    }
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

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="er-cat">Category</Label>
                <select
                  id="er-cat"
                  value={f.category_slug ?? ""}
                  onChange={(e) => {
                    const nextSlug = e.target.value;
                    const nextCat = categories.find((c) => c.slug === nextSlug);
                    setF({
                      ...f,
                      category_slug: nextSlug,
                      subcategory: nextCat?.subcategories[0] ?? "",
                    });
                  }}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select…</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="er-sub">Subcategory</Label>
                <select
                  id="er-sub"
                  value={f.subcategory ?? ""}
                  onChange={(e) => setF({ ...f, subcategory: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={!activeCat}
                >
                  <option value="">Select…</option>
                  {(activeCat?.subcategories ?? []).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <PostAsSelector
              userId={user?.id ?? null}
              value={postedAsKey}
              onChange={(k) => setPostedAsKey(k)}
            />

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
                <select
                  id="er-budget"
                  value={f.budget_range ?? ""}
                  onChange={(e) => setF({ ...f, budget_range: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Not set</option>
                  {budgetBuckets.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
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
          <Button onClick={save} disabled={saving || loading || loadingPostedAsOptions} className="bg-orange text-orange-foreground hover:brightness-110">
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
