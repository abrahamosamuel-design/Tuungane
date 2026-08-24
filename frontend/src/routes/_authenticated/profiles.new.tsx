import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, ImagePlus, X, CheckCircle2, Zap } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { uploadMedia, compressImage } from "@/lib/upload";
import { SERVICE_CATEGORIES } from "@/data/service-categories";
import { useCreditWallet } from "@/hooks/use-credits";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { filterDistricts, filterTowns } from "@/data/uganda-locations";

export const Route = createFileRoute("/_authenticated/profiles/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    edit: search.edit as string | undefined,
  }),
  staticData: { hideHeaderOnMobile: true, hideBottomNavOnMobile: true },
  head: () => ({ meta: [{ title: "List a service — Tuungane" }] }),
  component: NewProfile,
});

const PROMO_PLANS = [
  { id: "free", label: "No promo", sub: "List for free", creditsPerDay: 0, highlight: false },
  { id: "basic", label: "Basic Boost", sub: "More visibility", creditsPerDay: 2, highlight: false },
  { id: "standard", label: "Standard", sub: "Top of search results", creditsPerDay: 5, highlight: true },
  { id: "premium", label: "Premium", sub: "Featured + badge", creditsPerDay: 10, highlight: false },
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function NewProfile() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { balance } = useCreditWallet();
  const { edit } = Route.useSearch();

  // Form state
  const [name, setName] = useState("");
  const [categorySlug, setCategorySlug] = useState(SERVICE_CATEGORIES[0].slug);
  const [subcategory, setSubcategory] = useState(SERVICE_CATEGORIES[0].services[0].service);
  const [contactForPrice, setContactForPrice] = useState(false);
  const [price, setPrice] = useState("");
  const [district, setDistrict] = useState("");
  const [town, setTown] = useState("");
  const [bio, setBio] = useState("");
  const [promoId, setPromoId] = useState("free");
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [useCustomUnit, setUseCustomUnit] = useState(false);
  const [customUnit, setCustomUnit] = useState("");
  
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [attachTo, setAttachTo] = useState<string>("individual");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await apiClient<{ data: any[] }>('/profiles/public/me');
        if (data && data.length > 0) {
          setBusinesses(data);
        }
      } catch (err) {
        console.error("Could not fetch businesses", err);
      }
      
      if (edit) {
        try {
          const { data } = await apiClient<{ data: any }>(`/services/detail/${edit}`);
          if (data) {
            setName(data.title || data.name || "");
            setCategorySlug(data.category_slug || SERVICE_CATEGORIES[0].slug);
            setSubcategory(data.subcategory || SERVICE_CATEGORIES[0].services[0].service);
            setContactForPrice(data.price === null && data.price_unit === "contact");
            setPrice(data.price_fixed_ugx?.toString() || data.price?.toString() || "");
            setDistrict(data.district || data.profile?.district || "");
            setTown(data.town || data.profile?.town || "");
            setBio(data.description || data.bio || "");
            setPromoId(data.promo_plan || "free");
            
            const imageUrls = data.photos || data.media?.map((m: any) => m.url) || data.images || [];
            setImages(imageUrls);
            setAttachTo(data.attach_to || "individual");
            
            const foundCat = SERVICE_CATEGORIES.find(c => c.slug === data.category_slug) ?? SERVICE_CATEGORIES[0];
            const foundSvc = foundCat.services.find(s => s.service === data.subcategory) ?? foundCat.services[0];
            if (data.price_unit && data.price_unit !== "contact" && data.price_unit !== foundSvc.unit) {
              setUseCustomUnit(true);
              setCustomUnit(data.price_unit);
            }
          }
        } catch (err) {
          toast.error("Could not fetch service details for editing");
        }
      }
    })();
  }, [edit]);

  const cat = SERVICE_CATEGORIES.find(c => c.slug === categorySlug) ?? SERVICE_CATEGORIES[0];
  const serviceEntry = cat.services.find(s => s.service === subcategory) ?? cat.services[0];
  const activeUnit = useCustomUnit && customUnit.trim() ? customUnit.trim() : serviceEntry.unit;

  const handleCatChange = (slug: string) => {
    setCategorySlug(slug);
    const newCat = SERVICE_CATEGORIES.find(c => c.slug === slug) ?? SERVICE_CATEGORIES[0];
    setSubcategory(newCat.services[0].service);
    setUseCustomUnit(false);
    setCustomUnit("");
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !user) return;
    if (images.length + files.length > 5) { toast.error("Max 5 images"); return; }
    
    const validFiles = files.filter(f => f.size <= 3 * 1024 * 1024);
    if (validFiles.length < files.length) {
      toast.error("Images must be 3MB or less");
    }
    if (validFiles.length === 0) return;

    setUploadingImg(true);
    try {
      const compressedFiles = await Promise.all(validFiles.map(f => compressImage(f, 0.7)));
      const urls = await Promise.all(compressedFiles.map(f => uploadMedia(user.id, f, "service-images")));
      setImages(prev => [...prev, ...urls]);
    } catch { toast.error("Image upload failed"); }
    finally { setUploadingImg(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) { toast.error("Service name is required"); return; }
    if (images.length < 1) { toast.error("Add at least 1 photo"); return; }
    setBusy(true);
    const slug = `${slugify(name) || "profile"}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      const url = edit ? `/services/${edit}` : `/profiles/public`;
      const method = edit ? "PATCH" : "POST";
      
      let payload;
      if (edit) {
        payload = {
          title: name.trim(),
          category_slug: categorySlug,
          subcategory,
          description: bio || "",
          district: district || null,
          town: town || null,
          price_type: contactForPrice ? null : (activeUnit ? "fixed" : null),
          price_fixed_ugx: contactForPrice ? null : (price ? Number(price) : null),
          price_note: contactForPrice ? null : activeUnit,
          photos: images,
        };
      } else {
        payload = {
          profile_type: "individual",
          slug,
          name: name.trim(),
          category_slug: categorySlug,
          subcategory,
          district: district || null,
          town: town || null,
          bio: bio || "",
          price: contactForPrice ? null : (price ? Number(price) : null),
          price_unit: contactForPrice ? "contact" : activeUnit,
          attach_to: attachTo,
          images,
          promo_plan: promoId === "free" ? null : promoId,
        };
      }

      const { data } = await apiClient<{ data: { id: string; slug: string; serviceId?: string } }>(url, {
        method,
        body: JSON.stringify(payload),
      });
      toast.success(edit ? "Service updated!" : "Your service is live!");
      if (edit) {
        nav({ to: `/service/${data.id}`, search: { welcome: "1" } as any });
      } else if (data.serviceId) {
        nav({ to: `/service/${data.serviceId}`, search: { welcome: "1" } as any });
      } else {
        nav({ to: `/p/$slug`, params: { slug: data.slug }, search: { welcome: "1" } as never });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create service");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-white px-4 py-3 shadow-sm">
        <button onClick={() => nav({ to: "/" })} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <h1 className="text-base font-bold text-gray-900">{edit ? "Edit Service" : "List a service"}</h1>
        <div className="w-9" />
      </div>

      <form onSubmit={submit} className="mx-auto max-w-lg space-y-0 pb-10">

        {/* ATTACH TO */}
        {businesses.length > 0 && (
          <Section>
            <label className="block text-sm font-semibold text-gray-700">Attach this service to *</label>
            <p className="mt-1 text-xs text-gray-500">Choose whether to list this gig personally, or under one of your registered businesses.</p>
            <select
              value={attachTo}
              onChange={e => setAttachTo(e.target.value)}
              className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400"
            >
              <option value="individual">My Individual Profile (Personal Gig)</option>
              {businesses.map(b => (
                <option key={b.id} value={b.id}>
                  Business: {b.name}
                </option>
              ))}
            </select>
          </Section>
        )}

        {/* SERVICE NAME */}
        <Section>
          <label className="block text-sm font-semibold text-gray-700">Service name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Genesis Car Wash"
            maxLength={70}
            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
          <div className="mt-1 flex justify-end text-xs text-gray-400">{name.length}/70</div>
        </Section>

        {/* IMAGES */}
        <Section>
          <label className="block text-sm font-semibold text-gray-700">Photos <span className="font-normal text-gray-400">(add at least 2)</span></label>
          <div className="mt-2 flex flex-wrap gap-2">
            {images.map((url, i) => (
              <div key={i} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-200">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setImages(imgs => imgs.filter((_, j) => j !== i))}
                  className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 bg-white text-gray-400 hover:border-orange-400 hover:text-orange-400 transition">
                {uploadingImg ? <span className="text-xs">Uploadingâ€¦</span> : <><ImagePlus className="h-6 w-6" /><span className="text-[10px]">Add photo</span></>}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImagePick} />
          </div>
          <p className="mt-1.5 text-[11px] text-gray-400">First photo is the cover. JPG, PNG, WEBP Â· max 5MB each.</p>
        </Section>

        {/* CATEGORY + SUBCATEGORY */}
        <Section>
          <label className="block text-sm font-semibold text-gray-700">Category *</label>
          <select value={categorySlug} onChange={e => handleCatChange(e.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400">
            {SERVICE_CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.icon} {c.name}</option>)}
          </select>

          <label className="mt-3 block text-sm font-semibold text-gray-700">Sub-category *</label>
          <select value={subcategory} onChange={e => setSubcategory(e.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400">
            {cat.services.map(s => <option key={s.service} value={s.service}>{s.service}</option>)}
          </select>

          {serviceEntry && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1 text-[11px] text-gray-400">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-orange-100 text-orange-600 text-[9px] font-bold">U</span>
                  Measurement: <span className="font-medium text-gray-600">{useCustomUnit ? (customUnit || "…") : serviceEntry.unit}</span>
                </p>
                <button
                  type="button"
                  onClick={() => { setUseCustomUnit(v => !v); setCustomUnit(""); }}
                  className={`text-[11px] font-semibold transition ${useCustomUnit ? "text-orange-500" : "text-gray-400 hover:text-orange-500"}`}
                >
                  {useCustomUnit ? "← Use default" : "+ Custom unit"}
                </button>
              </div>
              {useCustomUnit && (
                <input
                  type="text"
                  value={customUnit}
                  onChange={e => setCustomUnit(e.target.value)}
                  placeholder={`e.g. ${serviceEntry.unit}`}
                  maxLength={40}
                  autoFocus
                  className="w-full rounded-xl border border-orange-300 bg-orange-50 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 placeholder:text-gray-400"
                />
              )}
            </div>
          )}
        </Section>

        {/* PRICE */}
        <Section>
          <label className="block text-sm font-semibold text-gray-700">Pricing</label>
          <div className="mt-2 flex gap-3">
            <button type="button" onClick={() => setContactForPrice(false)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${!contactForPrice ? "border-orange-400 bg-orange-50 text-orange-600" : "border-gray-200 text-gray-500"}`}>
              <span className={`h-4 w-4 rounded-full border-2 ${!contactForPrice ? "border-orange-500 bg-orange-500" : "border-gray-400"}`} />
              Specify price
            </button>
            <button type="button" onClick={() => setContactForPrice(true)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${contactForPrice ? "border-orange-400 bg-orange-50 text-orange-600" : "border-gray-200 text-gray-500"}`}>
              <span className={`h-4 w-4 rounded-full border-2 ${contactForPrice ? "border-orange-500 bg-orange-500" : "border-gray-400"}`} />
              Contact for price
            </button>
          </div>

          {!contactForPrice && (
            <div className="mt-3 flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">UGX</span>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0"
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-14 pr-4 text-sm outline-none focus:border-orange-400" />
              </div>
              <div className="shrink-0 max-w-[130px] truncate rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-600">
                {activeUnit}
              </div>
            </div>
          )}
        </Section>

        {/* LOCATION */}
        <Section>
          <label className="block text-sm font-semibold text-gray-700">Location</label>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <LocationAutocomplete
              label="District"
              value={district}
              onChange={v => { setDistrict(v); setTown(""); }}
              suggestions={filterDistricts(district)}
              placeholder="e.g. Kampala"
            />
            <LocationAutocomplete
              label="Town / Area"
              value={town}
              onChange={setTown}
              suggestions={filterTowns(district, town)}
              placeholder={district ? "Type town…" : "Select district first"}
              disabled={!district.trim()}
            />
          </div>
        </Section>

        {/* DESCRIPTION */}
        <Section>
          <label className="block text-sm font-semibold text-gray-700">Description</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} maxLength={850}
            placeholder="Describe what you offer, your experience, and what makes you stand outâ€¦"
            className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400" />
          <div className="mt-1 flex justify-end text-xs text-gray-400">{bio.length}/850</div>
        </Section>

        {/* PROMOTION */}
        <Section>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-semibold text-gray-700">Choose a promotion</span>
          </div>
          <p className="mt-0.5 text-xs text-gray-400">Credits balance: <span className="font-semibold text-gray-700">{balance ?? 0}</span></p>
          <div className="mt-3 space-y-2">
            {PROMO_PLANS.map(plan => (
              <button type="button" key={plan.id} onClick={() => setPromoId(plan.id)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition ${
                  promoId === plan.id
                    ? "border-orange-400 bg-orange-50 ring-1 ring-orange-300"
                    : "border-gray-200 bg-white hover:border-orange-200"
                }`}>
                <div className="flex items-center gap-3">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition ${promoId === plan.id ? "border-orange-500 bg-orange-500" : "border-gray-300"}`}>
                    {promoId === plan.id && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{plan.label}</p>
                    <p className="text-xs text-gray-400">{plan.sub}</p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${plan.creditsPerDay === 0 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                  {plan.creditsPerDay === 0 ? "Free" : `${plan.creditsPerDay} credits/day`}
                </span>
              </button>
            ))}
          </div>
        </Section>

        {/* SUBMIT */}
        <div className="px-4 pt-2">
          <button disabled={busy || uploadingImg}
            className="w-full rounded-2xl bg-orange-500 py-4 text-base font-bold text-white shadow-lg shadow-orange-200 transition hover:brightness-105 disabled:opacity-50">
            {busy ? (edit ? "Updating..." : "Creating...") : (edit ? "Update my service" : "List my service")}
          </button>
        </div>

      </form>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="mx-4 mt-4 rounded-2xl bg-white p-4 shadow-sm">{children}</div>;
}
