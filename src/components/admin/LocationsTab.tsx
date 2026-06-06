import { useEffect, useState } from "react";
import { Plus, Trash2, MapPin, Star, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { categories } from "@/data/categories";
import { invalidateFeaturedLocationsCache, type FeaturedLocation } from "@/hooks/use-featured-locations";

type ExpansionSettings = {
  default_radius_km: number;
  min_local_results: number;
  expansion_steps_km: number[];
  default_country: string;
  default_district: string;
  default_town: string;
};

const DEFAULT_EXPANSION: ExpansionSettings = {
  default_radius_km: 10,
  min_local_results: 3,
  expansion_steps_km: [5, 10, 20, 50, 150],
  default_country: "Uganda",
  default_district: "Wakiso",
  default_town: "Entebbe",
};

const blankRow = (): Partial<FeaturedLocation> => ({
  country: "Uganda",
  region: "",
  district: "",
  town: "",
  area: "",
  latitude: null,
  longitude: null,
  category_slug: null,
  priority: 0,
  note: "",
  active: true,
});

export function LocationsTab() {
  const [rows, setRows] = useState<FeaturedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Partial<FeaturedLocation>>(blankRow());
  const [busy, setBusy] = useState(false);

  const [settings, setSettings] = useState<ExpansionSettings>(DEFAULT_EXPANSION);
  const [settingsBusy, setSettingsBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: locs }, { data: setting }] = await Promise.all([
      supabase.from("featured_locations").select("*").order("priority", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("admin_settings").select("setting_value").eq("setting_key", "location_expansion").maybeSingle(),
    ]);
    setRows((locs ?? []) as FeaturedLocation[]);
    if (setting?.setting_value) {
      setSettings({ ...DEFAULT_EXPANSION, ...(setting.setting_value as ExpansionSettings) });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!draft.country?.trim()) {
      toast.error("Country is required");
      return;
    }
    setBusy(true);
    const payload: Partial<FeaturedLocation> = {
      country: draft.country.trim(),
      region: draft.region?.trim() || null,
      district: draft.district?.trim() || null,
      town: draft.town?.trim() || null,
      area: draft.area?.trim() || null,
      latitude: draft.latitude ?? null,
      longitude: draft.longitude ?? null,
      category_slug: draft.category_slug || null,
      priority: Number(draft.priority ?? 0),
      note: draft.note?.trim() || null,
      active: draft.active ?? true,
    };
    const { error } = await supabase.from("featured_locations").insert(payload as never);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidateFeaturedLocationsCache();
    setDraft(blankRow());
    toast.success("Featured location added");
    load();
  };

  const toggleActive = async (row: FeaturedLocation) => {
    const { error } = await supabase.from("featured_locations").update({ active: !row.active }).eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidateFeaturedLocationsCache();
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, active: !r.active } : r)));
  };

  const updatePriority = async (row: FeaturedLocation, priority: number) => {
    const { error } = await supabase.from("featured_locations").update({ priority }).eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidateFeaturedLocationsCache();
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, priority } : r)));
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this featured location?")) return;
    const { error } = await supabase.from("featured_locations").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidateFeaturedLocationsCache();
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success("Removed");
  };

  const saveSettings = async () => {
    setSettingsBusy(true);
    const clean: ExpansionSettings = {
      default_radius_km: Math.max(1, Math.min(500, Number(settings.default_radius_km) || 10)),
      min_local_results: Math.max(0, Math.min(50, Number(settings.min_local_results) || 3)),
      expansion_steps_km: (settings.expansion_steps_km ?? [])
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b),
      default_country: settings.default_country?.trim() || "Uganda",
      default_district: settings.default_district?.trim() || "",
      default_town: settings.default_town?.trim() || "",
    };
    const { error } = await supabase
      .from("admin_settings")
      .upsert({ setting_key: "location_expansion", setting_value: clean as never }, { onConflict: "setting_key" });
    setSettingsBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSettings(clean);
    toast.success("Location settings saved");
  };

  return (
    <div className="space-y-8">
      {/* Default expansion settings */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display text-base font-bold text-navy">Default location & expansion rules</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Controls how content expands when there are too few local results. Applied platform-wide.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Default radius (km)">
            <input
              type="number"
              min={1}
              max={500}
              value={settings.default_radius_km}
              onChange={(e) => setSettings((s) => ({ ...s, default_radius_km: Number(e.target.value) }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Min results before expanding">
            <input
              type="number"
              min={0}
              max={50}
              value={settings.min_local_results}
              onChange={(e) => setSettings((s) => ({ ...s, min_local_results: Number(e.target.value) }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Expansion steps (km, comma-separated)">
            <input
              type="text"
              value={settings.expansion_steps_km.join(", ")}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  expansion_steps_km: e.target.value
                    .split(",")
                    .map((x) => Number(x.trim()))
                    .filter((n) => !Number.isNaN(n)),
                }))
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Default country">
            <input
              type="text"
              value={settings.default_country}
              onChange={(e) => setSettings((s) => ({ ...s, default_country: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Default district">
            <input
              type="text"
              value={settings.default_district}
              onChange={(e) => setSettings((s) => ({ ...s, default_district: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Default town">
            <input
              type="text"
              value={settings.default_town}
              onChange={(e) => setSettings((s) => ({ ...s, default_town: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={saveSettings}
            disabled={settingsBusy}
            className="inline-flex items-center gap-2 rounded-full bg-orange px-4 py-2 text-sm font-semibold text-orange-foreground disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> {settingsBusy ? "Saving…" : "Save settings"}
          </button>
        </div>
      </section>

      {/* Add featured location */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display text-base font-bold text-navy">Add featured location</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Featured locations rank higher in feeds, search and "near you" sections.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Country*">
            <input value={draft.country ?? ""} onChange={(e) => setDraft({ ...draft, country: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="Region">
            <input value={draft.region ?? ""} onChange={(e) => setDraft({ ...draft, region: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="District">
            <input value={draft.district ?? ""} onChange={(e) => setDraft({ ...draft, district: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="Town">
            <input value={draft.town ?? ""} onChange={(e) => setDraft({ ...draft, town: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="Area / suburb">
            <input value={draft.area ?? ""} onChange={(e) => setDraft({ ...draft, area: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="Latitude">
            <input type="number" step="0.000001" value={draft.latitude ?? ""} onChange={(e) => setDraft({ ...draft, latitude: e.target.value === "" ? null : Number(e.target.value) })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="Longitude">
            <input type="number" step="0.000001" value={draft.longitude ?? ""} onChange={(e) => setDraft({ ...draft, longitude: e.target.value === "" ? null : Number(e.target.value) })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="Limit to category (optional)">
            <select
              value={draft.category_slug ?? ""}
              onChange={(e) => setDraft({ ...draft, category_slug: e.target.value || null })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Priority (higher = ranks first)">
            <input type="number" value={draft.priority ?? 0} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="Internal note">
            <input value={draft.note ?? ""} onChange={(e) => setDraft({ ...draft, note: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={add}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-sm font-semibold text-navy-foreground disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> {busy ? "Saving…" : "Add featured location"}
          </button>
        </div>
      </section>

      {/* List */}
      <section className="rounded-2xl border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-display text-base font-bold text-navy">Featured locations</h2>
          <span className="text-xs text-muted-foreground">{rows.length} total</span>
        </header>
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No featured locations yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange/10 text-orange">
                  <Star className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-navy">
                    {[r.area, r.town, r.district, r.region, r.country].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-0.5 inline-flex items-center gap-2 text-[11px] text-muted-foreground">
                    {r.category_slug ? <span className="rounded-full bg-navy/5 px-2 py-0.5 font-semibold text-navy">{r.category_slug}</span> : <span>All categories</span>}
                    {r.latitude != null && r.longitude != null && (
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{r.latitude.toFixed(3)}, {r.longitude.toFixed(3)}</span>
                    )}
                    {r.note && <span className="truncate italic">{r.note}</span>}
                  </p>
                </div>
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  Priority
                  <input
                    type="number"
                    defaultValue={r.priority}
                    onBlur={(e) => {
                      const next = Number(e.target.value);
                      if (next !== r.priority) updatePriority(r, next);
                    }}
                    className="w-16 rounded border border-border bg-background px-2 py-1 text-xs"
                  />
                </label>
                <button
                  onClick={() => toggleActive(r)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${r.active ? "bg-green/15 text-green" : "bg-muted text-muted-foreground"}`}
                >
                  {r.active ? "Active" : "Inactive"}
                </button>
                <button
                  onClick={() => remove(r.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-orange hover:text-orange"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-navy">
      <span>{label}</span>
      {children}
    </label>
  );
}
