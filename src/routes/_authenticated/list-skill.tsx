import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Check, X } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Avatar } from "@/components/social/Avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { categories as staticCategories } from "@/data/categories";
import { useCategories } from "@/hooks/use-categories";
import { uploadMedia } from "@/lib/upload";
import { toast } from "sonner";
import { toastError } from "@/lib/user-errors";
import { ImageCropDialog } from "@/components/media/ImageCropDialog";

export const Route = createFileRoute("/_authenticated/list-skill")({
  validateSearch: (s: Record<string, unknown>) => ({
    edit: s.edit === "1" || s.edit === 1 || s.edit === true,
  }),
  head: () => ({ meta: [{ title: "List your skill — Tuungane" }] }),
  component: ListSkillPage,
});

function ListSkillPage() {
  const { user } = useAuth();
  const { categories } = useCategories();
  const { edit } = Route.useSearch();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [checking, setChecking] = useState(true);
  const [editMode, setEditMode] = useState(false);

  // form
  const [businessName, setBusinessName] = useState("");
  const [categorySlug, setCategorySlug] = useState(staticCategories[0].slug);
  const [subcategory, setSubcategory] = useState(staticCategories[0].subcategories[0]);
  const [bio, setBio] = useState("");
  const [district, setDistrict] = useState("");
  const [town, setTown] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [busy, setBusy] = useState(false);

  // photo step
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [photoSkipped, setPhotoSkipped] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: sp } = await supabase
        .from("service_profiles")
        .select("business_name,category_slug,subcategory,bio,district,town,phone,whatsapp")
        .eq("user_id", user.id)
        .maybeSingle();
      if (sp) {
        setEditMode(true);
        setBusinessName(sp.business_name ?? "");
        setCategorySlug(sp.category_slug ?? staticCategories[0].slug);
        setSubcategory(sp.subcategory ?? staticCategories[0].subcategories[0]);
        setBio(sp.bio ?? "");
        setDistrict(sp.district ?? "");
        setTown(sp.town ?? "");
        setPhone(sp.phone ?? "");
        setWhatsapp(sp.whatsapp ?? "");
      }
      const { data: pr } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      setAvatarUrl((pr?.avatar_url as string | null) ?? null);
      setChecking(false);
    })();
  }, [user]);

  const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
  const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
  const [photoError, setPhotoError] = useState<string | null>(null);

  const validatePhoto = (file: File): boolean => {
    setPhotoError(null);
    const isAccepted = ACCEPTED_PHOTO_TYPES.includes(file.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
    if (!isAccepted) {
      const msg = "That file type isn't supported. Please use JPG, PNG, WEBP, or HEIC.";
      setPhotoError(msg); toast.error(msg); return false;
    }
    if (file.size === 0) {
      const msg = "That file looks empty. Try choosing a different photo.";
      setPhotoError(msg); toast.error(msg); return false;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      const msg = `Photo is ${mb}MB — please choose one under 8MB.`;
      setPhotoError(msg); toast.error(msg); return false;
    }
    return true;
  };

  const openCropper = (file: File) => {
    if (!user) return;
    if (!validatePhoto(file)) return;
    // HEIC can't be rendered in a <canvas> in most browsers — upload as-is.
    if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
      void handlePhoto(file);
      return;
    }
    setCropFile(file);
  };

  const handlePhoto = async (file: File) => {
    if (!user) return;
    if (!validatePhoto(file)) return;
    setPhotoBusy(true);
    try {
      const url = await uploadMedia(user.id, file, "avatars");
      const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      if (error) throw error;
      setAvatarUrl(url);
      setPhotoSkipped(false);
      toast.success("Photo added — your card will look great");
    } catch (e: any) {
      const raw = String(e?.message ?? e ?? "");
      let msg = "Couldn't upload your photo. Please check your connection and try again.";
      if (/network|fetch|offline/i.test(raw)) msg = "Upload failed — you appear to be offline. Try again when you're back online.";
      else if (/timeout/i.test(raw)) msg = "Upload timed out. Try a smaller photo or a stronger connection.";
      else if (/size|large|payload/i.test(raw)) msg = "Photo is too large for upload. Please pick one under 8MB.";
      else if (/permission|unauthor|denied|403|401/i.test(raw)) msg = "We couldn't save the photo to your profile. Please sign out and back in, then try again.";
      setPhotoError(msg);
      toastError(e, msg);
    } finally {
      setPhotoBusy(false);
    }
  };

  const cat = categories.find((c) => c.slug === categorySlug) ?? staticCategories[0];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    // Flip to provider and upsert service profile
    const { error: pErr } = await supabase.from("profiles").update({ is_provider: true }).eq("id", user.id);
    if (pErr) { setBusy(false); toastError(pErr, "Couldn't save your profile"); return; }

    const { error } = await supabase.from("service_profiles").upsert({
      user_id: user.id,
      business_name: businessName || null,
      category_slug: categorySlug,
      subcategory,
      bio,
      district,
      town,
      phone: phone || null,
      whatsapp: whatsapp || null,
    });
    setBusy(false);
    if (error) { toastError(error, editMode ? "Couldn't save changes" : "Couldn't publish your skill"); return; }
    toast.success(editMode ? "Changes saved" : "Your skill is live", {
      description: editMode ? "Your service profile has been updated." : "Customers nearby can now find and contact you.",
    });
    nav({ to: "/dashboard" });
  };

  if (checking) {
    return <Layout><div className="mx-auto max-w-2xl px-4 py-12 text-sm text-muted-foreground">Loading…</div></Layout>;
  }

  return (
    <Layout>
      <section className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-green">
            {editMode ? "Edit your service profile" : "Become a provider"}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-navy">
            {editMode ? "Update your skill" : "List your skill"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {editMode
              ? "Change your service photo or update the details customers see on your card."
              : "Tell people what you do and where you work. Customers nearby will be able to find and contact you."}
          </p>
          {editMode && (
            <Link to="/dashboard" className="mt-3 inline-block text-xs font-semibold text-orange">
              ← Back to dashboard
            </Link>
          )}
        </div>


        {/* Stepper */}
        <div className="mb-6 flex items-center gap-2 text-xs">
          <Dot active={step >= 1} label="1. Service" />
          <div className="h-px flex-1 bg-border" />
          <Dot active={step >= 2} label="2. Location" />
          <div className="h-px flex-1 bg-border" />
          <Dot active={step >= 3} label="3. Contact" />
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-5">
          {step === 1 && (
            <>
              <div className="rounded-xl border border-orange/30 bg-orange/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar name={businessName || user?.email || "You"} url={avatarUrl} size={64} />
                    {avatarUrl && (
                      <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green text-white ring-2 ring-card">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-bold text-navy">
                      {avatarUrl ? "Looking good — this is your card photo" : "Add a service photo"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {avatarUrl
                        ? "Customers will see this on every card and chat. You can change it any time."
                        : "Profiles with a clear photo receive more requests. It only takes a moment — and you can skip if you'd rather add one later."}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => photoRef.current?.click()}
                        disabled={photoBusy}
                        className="inline-flex items-center gap-1.5 rounded-full bg-orange px-3 py-1.5 text-xs font-semibold text-orange-foreground hover:brightness-110 disabled:opacity-50"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        {photoBusy ? "Uploading…" : avatarUrl ? "Replace photo" : "Add photo"}
                      </button>
                      {!avatarUrl && !photoSkipped && (
                        <button
                          type="button"
                          onClick={() => setPhotoSkipped(true)}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-navy/70 hover:border-navy/30"
                        >
                          I'll add one later
                        </button>
                      )}
                      {!avatarUrl && photoSkipped && !photoError && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <X className="h-3 w-3" /> Skipped — you can add one any time from Settings
                        </span>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1">JPG, PNG, WEBP or HEIC · up to 8MB</p>
                      {photoError && (
                        <p role="alert" className="text-[12px] text-destructive mt-1">{photoError}</p>
                      )}
                    </div>
                  </div>
                </div>
                <input
                  ref={photoRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) openCropper(f);
                    e.target.value = "";
                  }}
                />
              </div>


              <Field label="Business name (optional)">
                <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Bright Sparks Electrical" className="input" />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Category">
                  <select value={categorySlug} onChange={(e) => { setCategorySlug(e.target.value); setSubcategory(categories.find((c) => c.slug === e.target.value)?.subcategories[0] ?? ""); }} className="input">
                    {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Sub-category">
                  <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className="input">
                    {cat.subcategories.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Short bio">
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="Years of experience, what makes your work stand out…" className="input resize-none" />
              </Field>
              <NavRow onNext={() => setStep(2)} canNext={!!bio.trim()} />
            </>
          )}

          {step === 2 && (
            <>
              <Field label="District"><input value={district} onChange={(e) => setDistrict(e.target.value)} required className="input" /></Field>
              <Field label="Town"><input value={town} onChange={(e) => setTown(e.target.value)} required className="input" /></Field>
              <NavRow onBack={() => setStep(1)} onNext={() => setStep(3)} canNext={!!district.trim() && !!town.trim()} />
            </>
          )}

          {step === 3 && (
            <>
              <Field label="Phone (optional)"><input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" /></Field>
              <p className="text-xs text-muted-foreground">Customers reach you through Tuungane Messages. Your phone number is only revealed based on your contact preference in settings.</p>
              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={() => setStep(2)} className="text-sm font-medium text-muted-foreground">Back</button>
                <button disabled={busy} className="rounded-xl bg-green px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? (editMode ? "Saving…" : "Publishing…") : (editMode ? "Save changes" : "Publish my skill")}</button>
              </div>
            </>
          )}
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Changed your mind? <Link to="/dashboard" className="font-semibold text-orange">Back to dashboard</Link>
        </p>
      </section>

      <style>{`.input{margin-top:.25rem;width:100%;border-radius:.75rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:.5rem .75rem;font-size:.875rem;outline:none}.input:focus{border-color:hsl(var(--orange,24 95% 53%))}`}</style>
    </Layout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-navy">{label}</label>
      {children}
    </div>
  );
}

function Dot({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${active ? "bg-green text-white" : "bg-muted text-muted-foreground"}`}>{label}</span>
  );
}

function NavRow({ onBack, onNext, canNext }: { onBack?: () => void; onNext: () => void; canNext: boolean }) {
  return (
    <div className="flex items-center justify-between pt-2">
      {onBack ? <button type="button" onClick={onBack} className="text-sm font-medium text-muted-foreground">Back</button> : <span />}
      <button type="button" disabled={!canNext} onClick={onNext} className="rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Continue</button>
    </div>
  );
}
