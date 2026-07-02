import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { categories as staticCategories } from "@/data/categories";
import { useCategories } from "@/hooks/use-categories";
import {
  budgetBuckets,
  contactMethods,
  urgencyOptions,
  visibilityOptions,
  type ContactMethodValue,
  type UrgencyValue,
  type VisibilityValue,
} from "@/data/serviceRequestTypes";
import { MediaUploader } from "@/components/feed/MediaUploader";
import { toast } from "sonner";
import { toastError } from "@/lib/user-errors";
import { Loader2, MapPin, ShieldAlert, Sparkles, ArrowRight, Pencil, ChevronDown } from "lucide-react";
import { REQUESTS_SAFETY_TEXT } from "@/data/requestTypes";
import { useUserLocation } from "@/hooks/use-user-location";
import { AreaAutocomplete } from "@/components/AreaAutocomplete";
import { MapPicker } from "@/components/MapPicker";
import { findDistrictBounds, type Bounds } from "@/lib/geocoding";
import { suggestCategory } from "@/lib/api/suggest-category.functions";
import { PostAsSelector } from "@/components/PostAsSelector";
import { usePostAsOptions, findOption } from "@/hooks/use-post-as-options";



const s = (v: unknown) => (typeof v === "string" ? v : "");

export const Route = createFileRoute("/_authenticated/requests/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    providerId: s(search.providerId),
    profileId: s(search.profileId),
    serviceId: s(search.serviceId),
    // Prefill (used by "Request again")
    category: s(search.category),
    subcategory: s(search.subcategory),
    title: s(search.title),
    location: s(search.location),
    district: s(search.district),
    town: s(search.town),
    area: s(search.area),
  }),
  head: () => ({ meta: [{ title: "Post a Service Request — Tuungane" }] }),
  component: NewRequest,
});

function NewRequest() {
  const search = useSearch({ from: "/_authenticated/requests/new" });
  const { user, loading } = useAuth();
  const { location: profileLoc, requestingGeo, requestBrowserLocation } = useUserLocation();
  const { categories } = useCategories();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [autofilled, setAutofilled] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [districtBounds, setDistrictBounds] = useState<Bounds | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [postedAsKey, setPostedAsKey] = useState<string>("individual");
  const { options: postedAsOptions } = usePostAsOptions(user?.id ?? null);
  const [f, setF] = useState({
    title: search.title || "",
    category_slug: search.category || staticCategories[0].slug,
    subcategory: search.subcategory || staticCategories[0].subcategories[0],
    description: "",
    location: search.location || "",
    district: search.district || "",
    town: search.town || "",
    area: search.area || "",
    urgency: "normal" as UrgencyValue,
    urgent_flag: false,
    budget_range: "",
    preferred_date: "",
    preferred_time: "",
    preferred_contact_method: "any" as ContactMethodValue,
    visibility: "public" as VisibilityValue,
    customer_phone: "",
    customer_whatsapp: "",
  });


  // Targeted profile context (from /p/$slug "Request" button)
  const [targetProfile, setTargetProfile] = useState<{ id: string; owner_id: string; name: string; profile_type: string; category_slug: string | null; subcategory: string | null } | null>(null);
  const [targetService, setTargetService] = useState<{ id: string; title: string } | null>(null);

  // "Describe first" smart intake — skipped when the form is prefilled
  // (Request again / coming from a provider profile).
  const skipDescribeStep = useMemo(
    () => Boolean(search.profileId || search.providerId || search.category || search.title),
    [search.profileId, search.providerId, search.category, search.title],
  );
  const [step, setStep] = useState<"describe" | "form">(skipDescribeStep ? "form" : "describe");
  const [describeText, setDescribeText] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<{ category_slug: string; subcategory: string; confidence: "low" | "medium" | "high"; title: string } | null>(null);

  const runSuggest = async () => {
    const text = describeText.trim();
    if (text.length < 6) {
      toast.error("Add a few more details so we can help");
      return;
    }
    setSuggesting(true);
    try {
      const result = await suggestCategory({ data: { description: text } });
      if (result) {
        setSuggestion(result);
        setF((s) => ({
          ...s,
          description: s.description || text,
          title: s.title || result.title,
          category_slug: result.category_slug,
          subcategory: result.subcategory,
        }));
      } else {
        toast.error("Couldn't auto-categorise — pick a category yourself");
        setF((s) => ({ ...s, description: s.description || text }));
      }
      setStep("form");
    } catch (err) {
      console.error(err);
      toast.error("Suggestion failed — continuing to the full form");
      setF((s) => ({ ...s, description: s.description || text }));
      setStep("form");
    } finally {
      setSuggesting(false);
    }
  };

  const skipToForm = () => {
    if (describeText.trim()) setF((s) => ({ ...s, description: s.description || describeText.trim() }));
    setStep("form");
  };

  useEffect(() => {
    if (!search.profileId) return;
    (async () => {
      const { data: p } = await supabase
        .from("public_profiles")
        .select("id,owner_id,name,profile_type,category_slug,subcategory")
        .eq("id", search.profileId)
        .maybeSingle();
      if (!p) return;
      setTargetProfile(p as typeof targetProfile);
      setF((s) => ({
        ...s,
        category_slug: p.category_slug || s.category_slug,
        subcategory: p.subcategory || s.subcategory,
      }));
      if (search.serviceId) {
        const { data: svc } = await supabase
          .from("profile_services")
          .select("id,title")
          .eq("id", search.serviceId)
          .maybeSingle();
        if (svc) {
          setTargetService(svc as { id: string; title: string });
          setF((s) => ({ ...s, title: s.title || `${svc.title} — ${p.name}` }));
        }
      }
    })();
  }, [search.profileId, search.serviceId]);

  useEffect(() => {
    if (!loading && !user) {
      nav({ to: "/login", search: { tab: "signup", redirect: "/requests/new" } as never });
    }
  }, [loading, user, nav]);

  // Autofill location fields from the user's saved profile location the first
  // time it becomes available — but never clobber anything the user has typed.
  useEffect(() => {
    if (autofilled || !profileLoc) return;
    setF((s) => {
      const composed = [profileLoc.area, profileLoc.town, profileLoc.district]
        .map((v) => (v ?? "").trim())
        .filter(Boolean)
        .join(", ");
      return {
        ...s,
        location: s.location || composed,
        district: s.district || (profileLoc.district ?? ""),
        town: s.town || (profileLoc.town ?? ""),
        area: s.area || (profileLoc.area ?? ""),
      };
    });
    setAutofilled(true);
  }, [profileLoc, autofilled]);

  const useBrowserGeo = async () => {
    const next = await requestBrowserLocation();
    if (!next || next.latitude == null) {
      toast.error("Location permission denied or unavailable");
      return;
    }
    setF((s) => {
      const composed = [next.area, next.town, next.district]
        .map((v) => (v ?? "").trim())
        .filter(Boolean)
        .join(", ");
      return {
        ...s,
        location: s.location || composed,
        district: s.district || (next.district ?? ""),
        town: s.town || (next.town ?? ""),
        area: s.area || (next.area ?? ""),
      };
    });
    toast.success("Location detected");
  };

  const update = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const cat = categories.find((c) => c.slug === f.category_slug) ?? staticCategories[0];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!f.title.trim() || !f.description.trim() || !f.location.trim()) {
      toast.error("A few things are missing", {
        description: "Add a title, description, and location so providers can help.",
      });
      return;
    }
    setBusy(true);
    const allMedia = mediaUrls;
    const attachment_url: string | null = allMedia[0] ?? null;



    // If the request targets a public profile, infer the provider for individual profiles.
    const targetedProvider =
      search.providerId ||
      (targetProfile && targetProfile.profile_type === "individual" ? targetProfile.owner_id : null);
    const isTargeted = !!(targetedProvider || targetProfile);

    const { data: inserted, error } = await supabase.from("service_requests").insert({
      customer_id: user.id,
      provider_id: targetedProvider,
      public_profile_id: targetProfile?.id ?? null,
      profile_service_id: targetService?.id ?? null,
      category_slug: f.category_slug,
      subcategory: f.subcategory,
      service_needed: f.subcategory || cat.name,
      title: f.title.trim(),
      description: f.description.trim(),
      location: f.location.trim(),
      district: f.district.trim() || null,
      town: f.town.trim() || null,
      area: f.area.trim() || null,
      urgency: f.urgency,
      urgent_flag: f.urgent_flag,
      budget_range: f.budget_range || null,
      preferred_date: f.preferred_date || null,
      preferred_time: f.preferred_time || null,
      preferred_contact_method: f.preferred_contact_method,
      visibility: isTargeted ? "matching_only" : f.visibility,
      customer_phone: f.customer_phone || null,
      customer_whatsapp: f.customer_whatsapp || null,
      attachment_url,
      media_urls: allMedia,
      status: "requested",
    }).select("id").single();
    setBusy(false);
    if (error) {
      toastError(error, "Couldn't post your service request");
      return;
    }
    toast.success("Your service request has been posted successfully", {
      description: "People offering this service can now respond.",
    });
    if (inserted?.id) {
      nav({ to: "/requests/$id", params: { id: inserted.id }, search: { posted: "1" } as never });
    } else {
      nav({ to: "/requests" });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-muted-foreground">Loading…</div>
      </Layout>
    );
  }
  if (!user) return null;

  return (
    <Layout>
      <section className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-navy">Post a Service Request</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tell people what service you are looking for.</p>

        {targetProfile && (
          <div className="mt-3 rounded-xl border border-orange/40 bg-orange/5 p-3 text-xs">
            <p className="text-navy">
              Requesting from <span className="font-semibold">{targetProfile.name}</span>
              {targetService ? <> · <span className="font-semibold">{targetService.title}</span></> : null}
            </p>
          </div>
        )}

        <div className="mt-4 flex gap-3 rounded-xl border border-orange/30 bg-orange/5 p-3 text-xs text-foreground/80">
          <ShieldAlert className="h-4 w-4 shrink-0 text-orange" />
          <p>{REQUESTS_SAFETY_TEXT}</p>
        </div>

        {step === "describe" ? (
          <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-orange" />
              <div>
                <h2 className="font-display text-lg font-bold text-navy">Describe what you need</h2>
                <p className="text-xs text-muted-foreground">Just write it in your own words — we'll suggest the right category for you.</p>
              </div>
            </div>
            <textarea
              autoFocus
              rows={5}
              maxLength={2000}
              value={describeText}
              onChange={(e) => setDescribeText(e.target.value)}
              placeholder="e.g. My kitchen sink is leaking under the cabinet and water is pooling on the floor."
              className={`${inp} resize-none`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={runSuggest}
                disabled={suggesting || describeText.trim().length < 6}
                className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-orange-foreground disabled:opacity-50"
              >
                {suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {suggesting ? "Thinking…" : "Continue"}
                {!suggesting && <ArrowRight className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={skipToForm}
                className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-navy hover:border-orange"
              >
                Skip — pick a category manually
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5">
          {suggestion && (
            <div className="flex items-start gap-2 rounded-xl border border-orange/30 bg-orange/5 p-3 text-xs">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-orange" />
              <div className="flex-1">
                <p className="font-semibold text-navy">
                  Suggested: {staticCategories.find((c) => c.slug === suggestion.category_slug)?.name ?? suggestion.category_slug} · {suggestion.subcategory}
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  {suggestion.confidence === "low" ? "Not sure — please double-check below." : "Change it below if it's not right."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setStep("describe"); setSuggestion(null); }}
                className="inline-flex items-center gap-1 rounded-full border border-orange/40 px-2 py-1 text-[11px] font-semibold text-orange hover:bg-orange/10"
              >
                <Pencil className="h-3 w-3" /> Redo
              </button>
            </div>
          )}

          <Field label="What do you need help with? *">
            <input
              required
              value={f.title}
              maxLength={120}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Fix a leaking kitchen tap"
              className={inp}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category *">
              <select
                value={f.category_slug}
                onChange={(e) => {
                  update("category_slug", e.target.value);
                  update("subcategory", categories.find((c) => c.slug === e.target.value)?.subcategories[0] ?? "");
                }}
                className={inp}
              >
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sub-category">
              <select value={f.subcategory} onChange={(e) => update("subcategory", e.target.value)} className={inp}>
                {cat.subcategories.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Describe the request *">
            <textarea
              required
              rows={5}
              maxLength={2000}
              value={f.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Share enough detail for a provider to give you a fair quote."
              className={`${inp} resize-none`}
            />
          </Field>

          <Field label="Where is the request located? *">
            <AreaAutocomplete
              placeholder="Search for a town, area, or neighbourhood…"
              bounds={districtBounds}
              onSelect={(p) => {
                const composed = [p.area, p.town, p.district].filter(Boolean).join(", ");
                setF((s) => ({
                  ...s,
                  location: composed || p.display_name,
                  district: p.district ?? s.district,
                  town: p.town ?? s.town,
                  area: p.area ?? s.area,
                }));
                setCoords({ lat: p.latitude, lng: p.longitude });
                // Prefer the pick's own bbox; otherwise resolve the district bounds.
                if (p.bounds) setDistrictBounds(p.bounds);
                if (p.district) {
                  findDistrictBounds(p.district).then((b) => {
                    if (b) setDistrictBounds(b);
                  });
                }
              }}
            />
            <input
              required
              value={f.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="Or type it manually (e.g. Entebbe, Kampala, Wakiso)"
              className={`${inp} mt-2`}
            />
          </Field>

          <button
            type="button"
            onClick={useBrowserGeo}
            disabled={requestingGeo}
            className="inline-flex items-center gap-2 self-start rounded-full border border-orange/40 bg-orange/5 px-3 py-1.5 text-xs font-medium text-orange hover:bg-orange/10 disabled:opacity-60"
          >
            {requestingGeo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
            {requestingGeo ? "Detecting…" : "Use my current location"}
          </button>

          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-dashed border-border bg-surface/40 px-3 py-2.5 text-sm font-medium text-navy hover:border-orange/60"
          >
            <span>{showMore ? "Hide extra details" : "Add more details (optional)"}</span>
            <ChevronDown className={`h-4 w-4 transition ${showMore ? "rotate-180" : ""}`} />
          </button>

          {showMore && (
            <div className="space-y-4 rounded-xl border border-border bg-surface/30 p-4">
              <MapPicker
                latitude={coords?.lat ?? profileLoc?.latitude ?? null}
                longitude={coords?.lng ?? profileLoc?.longitude ?? null}
                bounds={districtBounds}
                onChange={(lat, lng, place) => {
                  setCoords({ lat, lng });
                  if (!place) return;
                  const composed = [place.area, place.town, place.district].filter(Boolean).join(", ");
                  setF((s) => ({
                    ...s,
                    location: composed || s.location,
                    district: place.district ?? s.district,
                    town: place.town ?? s.town,
                    area: place.area ?? s.area,
                  }));
                  if (place.district) {
                    findDistrictBounds(place.district).then((b) => {
                      if (b) setDistrictBounds(b);
                    });
                  }
                }}
              />

              <div className="grid grid-cols-3 gap-3">
                <Field label="District">
                  <input value={f.district} onChange={(e) => update("district", e.target.value)} className={inp} />
                </Field>
                <Field label="Town">
                  <input value={f.town} onChange={(e) => update("town", e.target.value)} className={inp} />
                </Field>
                <Field label="Area">
                  <input value={f.area} onChange={(e) => update("area", e.target.value)} className={inp} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="When do you need help?">
                  <select value={f.urgency} onChange={(e) => update("urgency", e.target.value as UrgencyValue)} className={inp}>
                    {urgencyOptions.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Budget range">
                  <select value={f.budget_range} onChange={(e) => update("budget_range", e.target.value)} className={inp}>
                    <option value="">Select…</option>
                    {budgetBuckets.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={f.urgent_flag}
                  onChange={(e) => update("urgent_flag", e.target.checked)}
                />
                Mark this request as urgent
              </label>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Preferred date">
                  <input
                    type="date"
                    value={f.preferred_date}
                    onChange={(e) => update("preferred_date", e.target.value)}
                    className={inp}
                  />
                </Field>
                <Field label="Preferred time">
                  <input
                    value={f.preferred_time}
                    onChange={(e) => update("preferred_time", e.target.value)}
                    placeholder="e.g. Morning"
                    className={inp}
                  />
                </Field>
              </div>

              <MediaUploader
                userId={user.id}
                folder="requests"
                value={mediaUrls}
                onChange={setMediaUrls}
                max={6}
                label="Add photos (optional)"
                hint="Photos help providers give you a more accurate quote. Up to 6 images, 8MB each."
              />


              <div className="grid grid-cols-2 gap-3">
                <Field label="Contact preference">
                  <select
                    value={f.preferred_contact_method}
                    onChange={(e) => update("preferred_contact_method", e.target.value as ContactMethodValue)}
                    className={inp}
                  >
                    {contactMethods.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Visibility">
                  <select
                    value={f.visibility}
                    onChange={(e) => update("visibility", e.target.value as VisibilityValue)}
                    className={inp}
                    disabled={!!search.providerId}
                  >
                    {visibilityOptions.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Phone (optional)">
                <input value={f.customer_phone} onChange={(e) => update("customer_phone", e.target.value)} className={inp} />
              </Field>
            </div>
          )}

          <button
            disabled={busy}
            className="rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-orange-foreground disabled:opacity-50"
          >
            {busy ? "Posting…" : "Post Service Request"}
          </button>
        </form>
        )}
      </section>
    </Layout>
  );
}

const inp =
  "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-orange";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-navy">{label}</label>
      {children}
    </div>
  );
}
