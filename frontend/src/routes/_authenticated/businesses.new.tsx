import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { ArrowLeft, ImagePlus, X, Building2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { uploadMedia } from "@/lib/upload";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";

export const Route = createFileRoute("/_authenticated/businesses/new")({
  staticData: { hideHeaderOnMobile: true, hideBottomNavOnMobile: true },
  head: () => ({ meta: [{ title: "Create Business Profile — Tuungane" }] }),
  component: NewBusiness,
});

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function NewBusiness() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [name, setName] = useState("");
  const [district, setDistrict] = useState("");
  const [town, setTown] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const [busy, setBusy] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !user) return;
    const file = e.target.files[0];
    try {
      setUploadingImg(true);
      const url = await uploadMedia(user.id, file, "businesses");
      setAvatarUrl(url);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploadingImg(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) { toast.error("Business name is required"); return; }
    
    setBusy(true);
    const slug = `${slugify(name) || "business"}-${Math.random().toString(36).slice(2, 8)}`;
    
    try {
      const { data } = await apiClient<{ data: { id: string; slug: string } }>(`/profiles/public/business`, {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          slug,
          district: district || null,
          town: town || null,
          bio: bio || "",
          avatar_url: avatarUrl
        }),
      });
      toast.success("Business Profile created successfully!");
      nav({ to: "/me", search: { tab: "profiles" } as any });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create business profile");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 flex h-14 items-center justify-between bg-white px-4 shadow-sm">
        <button onClick={() => nav({ to: "/me" })} className="p-2 -ml-2 text-gray-700 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold text-gray-900">Create Business</h1>
        <div className="w-9" />
      </div>

      <form onSubmit={submit} className="mx-auto max-w-lg space-y-0 pb-10">
        
        {/* AVATAR / LOGO */}
        <div className="bg-white p-5 shadow-sm sm:mt-4 sm:rounded-2xl flex flex-col items-center">
          <div className="relative mb-4">
            <div className="h-24 w-24 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-8 w-8 text-gray-300" />
              )}
            </div>
            {avatarUrl && (
              <button type="button" onClick={() => setAvatarUrl(null)}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white shadow">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploadingImg}
            className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
            {uploadingImg ? "Uploading..." : <><ImagePlus className="h-4 w-4" /> {avatarUrl ? "Change Logo" : "Upload Logo"}</>}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
        </div>

        <Section>
          <label className="block text-sm font-semibold text-gray-700">Business Name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Genesis Enterprises"
            maxLength={70}
            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </Section>

        <Section>
          <label className="block text-sm font-semibold text-gray-700">About the Business</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Describe what your business does..."
            rows={4}
            maxLength={1000}
            className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </Section>

        <Section>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
          <LocationAutocomplete
            defaultDistrict={district}
            defaultTown={town}
            onSelect={(d, t) => { setDistrict(d); setTown(t); }}
          />
        </Section>

        <div className="p-4 sm:px-0">
          <button type="submit" disabled={busy} className="flex w-full items-center justify-center rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-white shadow-md hover:bg-orange-600 disabled:opacity-70 transition">
            {busy ? "Creating..." : "Create Business Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="border-t border-gray-100 bg-white p-5 sm:rounded-2xl sm:border sm:shadow-sm sm:mt-4">{children}</div>;
}
