import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { uploadMedia } from "@/lib/upload";
import { Avatar } from "@/components/social/Avatar";
import { ProfileStrengthCard } from "@/components/ProfileStrengthCard";
import { RemovePhotoConfirm } from "@/components/RemovePhotoConfirm";
import { computeProfileStrength } from "@/lib/profile-strength";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Save, Camera, Pencil, Star } from "lucide-react";
import { ExpandableText } from "@/components/feed/ExpandableText";
import { PriceGuideChip } from "@/components/PriceGuide";
import { PRICE_TYPE_OPTIONS, validatePriceGuide, type PriceType, type PriceGuide } from "@/lib/price-guide";
import { ServiceMediaManager } from "@/components/service/ServiceMediaManager";

export const Route = createFileRoute("/_authenticated/profiles/$id")({
  head: () => ({ meta: [{ title: "Manage Profile — Tuungane" }] }),
  component: ManageProfile,
});

type PublicProfile = {
  id: string;
  owner_id: string;
  profile_type: "individual" | "business" | "organization";
  name: string;
  category_slug: string | null;
  subcategory: string | null;
  bio: string;
  district: string | null;
  town: string | null;
  phone: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  verified: string;
};

type Service = {
  id: string;
  title: string;
  description: string;
  price_guidance_ugx: number | null;
  active: boolean;
  sort_order: number;
  is_primary: boolean;
  price_type: PriceType | null;
  price_fixed_ugx: number | null;
  price_min_ugx: number | null;
  price_max_ugx: number | null;
  price_currency: string | null;
  price_note: string | null;
};

type Request = {
  id: string;
  title: string | null;
  status: string;
  created_at: string;
  customer_id: string;
};

function ManageProfile() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [tab, setTab] = useState<"details" | "services" | "requests">("services");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: p }, { data: s }, { data: r }] = await Promise.all([
      supabase.from("public_profiles").select("*").eq("id", id).maybeSingle(),
      supabase.from("profile_services").select("id,title,description,price_guidance_ugx,active,sort_order,is_primary,price_type,price_fixed_ugx,price_min_ugx,price_max_ugx,price_currency,price_note").eq("profile_id", id).order("is_primary", { ascending: false }).order("sort_order"),
      supabase.from("service_requests").select("id,title,status,created_at,customer_id").eq("public_profile_id", id).order("created_at", { ascending: false }).limit(50),
    ]);
    setProfile((p as PublicProfile | null) ?? null);
    setServices((s ?? []) as Service[]);
    setRequests((r ?? []) as Request[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  if (!profile) {
    return (
      <Layout>
        <section className="mx-auto max-w-2xl px-4 py-6">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-8 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-10 w-full animate-pulse rounded-xl bg-muted" />
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-card border border-border" />
            ))}
          </div>
        </section>
      </Layout>
    );
  }

  const isOwner = user?.id === profile.owner_id;
  if (!isOwner) {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl px-4 py-6">
          <p className="text-sm text-muted-foreground">You don’t have access to manage this profile.</p>
          <Link to="/dashboard" className="mt-3 inline-block text-sm font-semibold text-orange">← Back to dashboard</Link>
        </div>
      </Layout>
    );
  }

  const saveDetails = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("public_profiles")
      .update({
        name: profile.name,
        bio: profile.bio,
        district: profile.district,
        town: profile.town,
        phone: profile.phone,
        subcategory: profile.subcategory,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  };

  const deleteProfile = async () => {
    if (!confirm("Delete this profile? This will remove all its services. Requests stay in your history.")) return;
    const { error } = await supabase.from("public_profiles").delete().eq("id", profile.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile deleted");
    nav({ to: "/dashboard" });
  };

  return (
    <Layout>
      <section className="mx-auto max-w-2xl px-4 py-6">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm font-medium text-navy/70">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>

        <header className="mt-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <ProfileAvatarUpload profile={profile} onUpdated={load} />
            <div className="min-w-0">
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy/70">
                {profile.profile_type}
              </span>
              <h1 className="mt-1 font-display text-2xl font-bold text-navy">{profile.name}</h1>
              <p className="text-xs text-muted-foreground">
                {profile.subcategory || profile.category_slug || "—"} · {profile.town || profile.district || "Location not set"}
              </p>
            </div>
          </div>
        </header>

        <div className="mt-4">
          <ProfileStrengthCard
            result={computeProfileStrength({
              isProvider: true,
              avatarUrl: profile.avatar_url,
              fullName: profile.name,
              bio: profile.bio,
              district: profile.district,
              town: profile.town,
              phone: profile.phone,
              category: profile.category_slug,
              servicesCount: services.length,
              reviewsCount: 0,
              verified: profile.verified === "verified",
            })}
            primaryAction={{
              label: "Add profile photo",
              onClick: () => document.getElementById(`profile-avatar-${profile.id}`)?.click(),
            }}
          />
        </div>


        <nav className="mt-4 flex gap-1 rounded-xl bg-muted p-1 text-xs font-semibold">
          {(["services", "requests", "details"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg px-3 py-2 capitalize ${tab === t ? "bg-card text-navy shadow-sm" : "text-navy/60"}`}
            >
              {t}{t === "requests" && requests.length > 0 ? ` (${requests.length})` : ""}
            </button>
          ))}
        </nav>

        {tab === "services" && (
          <ServicesTab profileId={profile.id} services={services} onChanged={load} />
        )}

        {tab === "requests" && (
          <RequestsTab requests={requests} />
        )}

        {tab === "details" && (
          <div className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-4">
            <Field label="Profile name" value={profile.name} onChange={(v) => setProfile({ ...profile, name: v })} />
            <Field label="Sub-category" value={profile.subcategory ?? ""} onChange={(v) => setProfile({ ...profile, subcategory: v })} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="District" value={profile.district ?? ""} onChange={(v) => setProfile({ ...profile, district: v })} />
              <Field label="Town" value={profile.town ?? ""} onChange={(v) => setProfile({ ...profile, town: v })} />
            </div>
            <Field label="Phone" value={profile.phone ?? ""} onChange={(v) => setProfile({ ...profile, phone: v })} />
            <div>
              <label className="text-xs font-medium text-navy">Short description</label>
              <textarea
                value={profile.bio ?? ""}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                rows={3}
                className="mt-1 w-full resize-none rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-orange"
              />
            </div>
            <div className="flex justify-between pt-1">
              <button onClick={deleteProfile} className="rounded-xl border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive">
                Delete profile
              </button>
              <button onClick={saveDetails} disabled={saving} className="inline-flex items-center gap-1 rounded-xl bg-orange px-4 py-2 text-sm font-semibold text-orange-foreground disabled:opacity-50">
                <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        )}
      </section>
    </Layout>
  );
}

function ServicesTab({ profileId, services, onChanged }: { profileId: string; services: Service[]; onChanged: () => void }) {
  const [adding, setAdding] = useState(false);

  const remove = async (sid: string) => {
    if (!confirm("Remove this service?")) return;
    const { error } = await supabase.from("profile_services").delete().eq("id", sid);
    if (error) { toast.error(error.message); return; }
    onChanged();
  };

  const toggleActive = async (s: Service) => {
    const { error } = await supabase.from("profile_services").update({ active: !s.active }).eq("id", s.id);
    if (error) toast.error(error.message);
    else onChanged();
  };

  const makePrimary = async (s: Service) => {
    if (s.is_primary) return;
    const { error } = await supabase.from("profile_services").update({ is_primary: true }).eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`"${s.title}" is now your main service`);
    onChanged();
  };

  return (
    <div className="mt-4 space-y-3">
      {services.length === 0 && !adding && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-center text-sm text-muted-foreground">
          No services yet. Add the things customers can request here. The first one you add becomes your main service shown on cards.
        </div>
      )}

      {services.map((s) => (
        <ServiceRow
          key={s.id}
          service={s}
          onChanged={onChanged}
          onRemove={() => remove(s.id)}
          onToggleActive={() => toggleActive(s)}
          onMakePrimary={() => makePrimary(s)}
        />
      ))}

      {adding ? (
        <ServiceEditor
          mode="create"
          profileId={profileId}
          sortOrder={services.length}
          onDone={() => { setAdding(false); onChanged(); }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button onClick={() => setAdding(true)} className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-orange/40 bg-orange/5 px-3 py-3 text-sm font-semibold text-orange">
          <Plus className="h-4 w-4" /> Add service
        </button>
      )}
    </div>
  );
}

function ServiceRow({
  service,
  onChanged,
  onRemove,
  onToggleActive,
  onMakePrimary,
}: {
  service: Service;
  onChanged: () => void;
  onRemove: () => void;
  onToggleActive: () => void;
  onMakePrimary: () => void;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <ServiceEditor
        mode="edit"
        service={service}
        onDone={() => { setEditing(false); onChanged(); }}
        onCancel={() => setEditing(false)}
      />
    );
  }
  return (
    <div className={`rounded-2xl border bg-card p-3 ${service.is_primary ? "border-orange/50 ring-1 ring-orange/20" : "border-border"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="font-semibold text-navy">{service.title}</p>
            {service.is_primary && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-orange/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange">
                <Star className="h-3 w-3 fill-orange" /> Main service
              </span>
            )}
          </div>
          {service.description && <ExpandableText text={service.description} clampLines={3} maxLines={8} className="mt-0.5" />}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <PriceGuideChip guide={service as PriceGuide} />
            {!service.price_type && service.price_guidance_ugx && (
              <span className="inline-flex items-center rounded-full bg-orange/10 px-2 py-0.5 text-[11px] font-semibold text-orange">
                From UGX {service.price_guidance_ugx.toLocaleString()}
              </span>
            )}
            {!service.price_type && !service.price_guidance_ugx && (
              <span className="text-[11px] text-muted-foreground">No price guide set</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button onClick={onToggleActive} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${service.active ? "bg-green/10 text-green" : "bg-muted text-navy/60"}`}>
            {service.active ? "Active" : "Hidden"}
          </button>
          <button onClick={() => setEditing(true)} aria-label="Edit service" className="text-muted-foreground hover:text-navy">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={onRemove} aria-label="Remove service" className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {!service.is_primary && (
        <button
          onClick={onMakePrimary}
          className="mt-2 inline-flex items-center gap-1 rounded-full border border-orange/40 bg-orange/5 px-2.5 py-1 text-[11px] font-semibold text-orange hover:bg-orange/10"
        >
          <Star className="h-3 w-3" /> Set as main service
        </button>
      )}
    </div>
  );
}

function ServiceEditor({
  mode,
  service,
  profileId,
  sortOrder,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  service?: Service;
  profileId?: string;
  sortOrder?: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(service?.title ?? "");
  const [desc, setDesc] = useState(service?.description ?? "");
  const [priceType, setPriceType] = useState<PriceType | "">((service?.price_type ?? "") as PriceType | "");
  const [fixed, setFixed] = useState<string>(service?.price_fixed_ugx?.toString() ?? "");
  const [minP, setMinP] = useState<string>(service?.price_min_ugx?.toString() ?? "");
  const [maxP, setMaxP] = useState<string>(service?.price_max_ugx?.toString() ?? "");
  const [note, setNote] = useState<string>(service?.price_note ?? "");
  const [busy, setBusy] = useState(false);

  const parseNum = (v: string): number | null => {
    const cleaned = v.replace(/[^0-9]/g, "");
    if (!cleaned) return null;
    const n = parseInt(cleaned, 10);
    return isNaN(n) ? null : n;
  };

  const save = async () => {
    if (!title.trim()) { toast.error("Service title required"); return; }
    const guide: PriceGuide = {
      price_type: (priceType || null) as PriceType | null,
      price_fixed_ugx: priceType === "fixed" ? parseNum(fixed) : null,
      price_min_ugx: priceType === "starting_from" || priceType === "range" ? parseNum(minP) : null,
      price_max_ugx: priceType === "range" ? parseNum(maxP) : null,
      price_currency: "UGX",
      price_note: priceType ? (note.trim() || null) : null,
    };
    const validation = validatePriceGuide(guide);
    if (!validation.ok) { toast.error(validation.error); return; }

    setBusy(true);
    const payload = {
      title: title.trim(),
      description: desc,
      price_type: guide.price_type,
      price_fixed_ugx: guide.price_fixed_ugx,
      price_min_ugx: guide.price_min_ugx,
      price_max_ugx: guide.price_max_ugx,
      price_currency: "UGX",
      price_note: guide.price_note,
    };
    if (mode === "create") {
      const { error } = await supabase.from("profile_services").insert({
        ...payload,
        profile_id: profileId!,
        sort_order: sortOrder ?? 0,
      });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Service added");
    } else {
      const { error } = await supabase.from("profile_services").update(payload).eq("id", service!.id);
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Service updated");
    }
    onDone();
  };

  return (
    <div className="space-y-3 rounded-2xl border border-orange/40 bg-card p-4">
      <Field label="Service title" value={title} onChange={setTitle} placeholder="e.g. Engine wash" />
      <div>
        <label className="text-xs font-medium text-navy">Description (optional)</label>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} className="mt-1 w-full resize-none rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-orange" />
      </div>

      <div className="rounded-xl border border-border bg-background/50 p-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-navy/70">Price guide for this service</label>
        <select
          value={priceType}
          onChange={(e) => setPriceType(e.target.value as PriceType | "")}
          className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-orange"
        >
          <option value="">No price guide</option>
          {PRICE_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {priceType === "fixed" && (
          <Field label="Fixed price (UGX)" value={fixed} onChange={setFixed} placeholder="e.g. 50000" />
        )}
        {priceType === "starting_from" && (
          <Field label="Starting from (UGX)" value={minP} onChange={setMinP} placeholder="e.g. 20000" />
        )}
        {priceType === "range" && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Min (UGX)" value={minP} onChange={setMinP} placeholder="20000" />
            <Field label="Max (UGX)" value={maxP} onChange={setMaxP} placeholder="80000" />
          </div>
        )}
        {priceType && (
          <Field label="Note (optional)" value={note} onChange={setNote} placeholder="e.g. excludes materials" />
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-navy">Cancel</button>
        <button onClick={save} disabled={busy} className="rounded-xl bg-orange px-3 py-2 text-xs font-semibold text-orange-foreground disabled:opacity-50">
          {busy ? "Saving…" : mode === "create" ? "Add service" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function RequestsTab({ requests }: { requests: Request[] }) {
  if (requests.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-border bg-card p-5 text-center text-sm text-muted-foreground">
        No requests for this profile yet.
      </div>
    );
  }
  return (
    <ul className="mt-4 space-y-2">
      {requests.map((r) => (
        <li key={r.id}>
          <Link to="/requests/$id" params={{ id: r.id }} className="block rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-semibold text-navy">{r.title || "Service request"}</p>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-navy/70">{r.status}</span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-navy">{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-orange"
      />
    </div>
  );
}

function ProfileAvatarUpload({ profile, onUpdated }: { profile: PublicProfile; onUpdated: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Image must be smaller than 8MB"); return; }
    setBusy(true);
    try {
      const url = await uploadMedia(profile.owner_id, file, "avatars");
      const { error } = await supabase.from("public_profiles").update({ avatar_url: url }).eq("id", profile.id);
      if (error) throw error;
      toast.success("Profile photo updated");
      onUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const { error } = await supabase.from("public_profiles").update({ avatar_url: null }).eq("id", profile.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Photo removed");
    onUpdated();
  };

  return (
    <div className="relative shrink-0">
      <Avatar
        name={profile.name}
        url={profile.avatar_url}
        size={72}
        categorySlug={profile.category_slug}
        verifiedRing={!!profile.avatar_url}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        aria-label={profile.avatar_url ? "Change profile photo" : "Add profile photo"}
        className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-orange text-orange-foreground shadow-md ring-2 ring-card hover:bg-orange/90 disabled:opacity-60"
      >
        <Camera className="h-3.5 w-3.5" />
      </button>
      <input
        ref={fileRef}
        id={`profile-avatar-${profile.id}`}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      {profile.avatar_url && (
        <div className="mt-2 text-center">
          <RemovePhotoConfirm onConfirm={remove} disabled={busy} />
        </div>
      )}
    </div>
  );
}
