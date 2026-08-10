import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { ArrowLeft, ImagePlus, X, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { uploadMedia } from "@/lib/upload";
import { SERVICE_CATEGORIES } from "@/data/service-categories";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { filterDistricts, filterTowns } from "@/data/uganda-locations";
import { PostAsSelector } from "@/components/PostAsSelector";
import type { PostAsOption } from "@/hooks/use-post-as-options";

const s = (v: unknown) => (typeof v === "string" ? v : "");

export const Route = createFileRoute("/_authenticated/requests/new")({
  validateSearch: (search: Record<string, unknown>): any => ({
    providerId: s(search.providerId),
    profileId: s(search.profileId),
    serviceId: s(search.serviceId),
    category: s(search.category),
    subcategory: s(search.subcategory),
    title: s(search.title),
    location: s(search.location),
    district: s(search.district),
    town: s(search.town),
    area: s(search.area),
  }),
  staticData: { hideHeaderOnMobile: true, hideBottomNavOnMobile: true },
  head: () => ({ meta: [{ title: "Post a Service Request — Tuungane" }] }),
  component: NewRequest,
});

function NewRequest() {
  const { user } = useAuth();
  const nav = useNavigate();
  const search = Route.useSearch();

  // Form state
  const [title, setTitle] = useState(search.title || "");
  const [categorySlug, setCategorySlug] = useState(search.category || SERVICE_CATEGORIES[0].slug);
  const [subcategory, setSubcategory] = useState(search.subcategory || SERVICE_CATEGORIES[0].services[0].service);
  const [budgetRange, setBudgetRange] = useState("");
  const [district, setDistrict] = useState(search.district || "");
  const [town, setTown] = useState(search.town || "");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<"normal" | "urgent" | "emergency">("normal");
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  
  const [postAsKey, setPostAsKey] = useState("me");
  const [postAsOption, setPostAsOption] = useState<PostAsOption | undefined>(undefined);

  const fileRef = useRef<HTMLInputElement>(null);

  const cat = SERVICE_CATEGORIES.find(c => c.slug === categorySlug) ?? SERVICE_CATEGORIES[0];

  const handleCatChange = (slug: string) => {
    setCategorySlug(slug);
    const newCat = SERVICE_CATEGORIES.find(c => c.slug === slug) ?? SERVICE_CATEGORIES[0];
    setSubcategory(newCat.services[0].service);
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !user) return;
    if (images.length + files.length > 5) { toast.error("Max 5 images"); return; }
    setUploadingImg(true);
    try {
      const urls = await Promise.all(files.map(f => uploadMedia(user.id, f, "request-images")));
      setImages(prev => [...prev, ...urls]);
    } catch { toast.error("Image upload failed"); }
    finally { setUploadingImg(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) { toast.error("Request title is required"); return; }
    setBusy(true);
    
    const payload = {
      title: title.trim(),
      service_needed: title.trim(),
      category_slug: categorySlug,
      subcategory,
      district: district || null,
      town: town || null,
      description: description || "",
      budget_range: budgetRange || null,
      media_urls: images,
      urgency,
      urgent_flag: urgency !== "normal",
      visibility: search.providerId ? "direct" : "public",
      provider_id: search.providerId || null,
      posted_as_type: postAsOption?.type || "user",
      posted_as_name: postAsOption?.name || user.user_metadata?.full_name,
      posted_as_avatar_url: postAsOption?.avatar || user.user_metadata?.avatar_url,
      posted_as_ref_type: postAsOption?.type === "business" ? "business" : null,
      posted_as_ref_id: postAsOption?.type === "business" ? postAsOption.id : null,
    };

    try {
      const { data } = await apiClient<{ data: { id: string } }>(`/requests`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success("Service request posted!");
      nav({ to: "/_authenticated/requests/$id", params: { id: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create request");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-30 flex items-center justify-between bg-white px-4 py-3 shadow-sm">
        <button onClick={() => window.history.back()} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <h1 className="text-base font-bold text-gray-900">Post a Service Request</h1>
        <div className="w-9" />
      </div>

      <form onSubmit={submit} className="mx-auto max-w-lg space-y-0 pb-10">
        
        <Section>
          <label className="block text-sm font-semibold text-gray-700">What do you need done? *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Need a plumber to fix a leaking pipe"
            maxLength={70}
            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
          <div className="mt-1 flex justify-end text-xs text-gray-400">{title.length}/70</div>
        </Section>

        <Section>
          <label className="block text-sm font-semibold text-gray-700">Reference Photos <span className="font-normal text-gray-400">(optional)</span></label>
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
                {uploadingImg ? <span className="text-xs">Uploading…</span> : <><ImagePlus className="h-6 w-6" /><span className="text-[10px]">Add photo</span></>}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImagePick} />
          </div>
          <p className="mt-1.5 text-[11px] text-gray-400">JPG, PNG, WEBP · max 5MB each.</p>
        </Section>

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
        </Section>

        <Section>
          <label className="block text-sm font-semibold text-gray-700">Budget <span className="font-normal text-gray-400">(optional)</span></label>
          <input
            type="text"
            value={budgetRange}
            onChange={e => setBudgetRange(e.target.value)}
            placeholder="e.g. 50,000 - 100,000 UGX"
            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </Section>

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

        <Section>
          <label className="block text-sm font-semibold text-gray-700">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} maxLength={850}
            placeholder="Provide more details about what you need..."
            className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400" />
          <div className="mt-1 flex justify-end text-xs text-gray-400">{description.length}/850</div>
        </Section>

        <Section>
          <label className="block text-sm font-semibold text-gray-700">Urgency</label>
          <div className="mt-2 flex flex-col gap-2">
            {[
              { id: "normal", label: "Flexible", sub: "No rush, whenever provider is available" },
              { id: "urgent", label: "Urgent", sub: "Need it done this week" },
              { id: "emergency", label: "Emergency", sub: "Need it done today/ASAP" },
            ].map(u => (
              <button type="button" key={u.id} onClick={() => setUrgency(u.id as any)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                  urgency === u.id
                    ? "border-orange-400 bg-orange-50 ring-1 ring-orange-300"
                    : "border-gray-200 bg-white hover:border-orange-200"
                }`}>
                <div className="flex items-center gap-3">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition ${urgency === u.id ? "border-orange-500 bg-orange-500" : "border-gray-300"}`}>
                    {urgency === u.id && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{u.label}</p>
                    <p className="text-xs text-gray-400">{u.sub}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Section>

        <Section>
          <PostAsSelector userId={user?.id} value={postAsKey} onChange={(key, opt) => {
            setPostAsKey(key);
            setPostAsOption(opt);
          }} />
        </Section>

        <div className="px-4 pt-2">
          <button disabled={busy || uploadingImg}
            className="w-full rounded-2xl bg-orange-500 py-4 text-base font-bold text-white shadow-lg shadow-orange-200 transition hover:brightness-105 disabled:opacity-50">
            {busy ? "Posting…" : "Post Request"}
          </button>
        </div>

      </form>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="mx-4 mt-4 rounded-2xl bg-white p-4 shadow-sm">{children}</div>;
}
