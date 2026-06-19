import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { categories as staticCategories } from "@/data/categories";
import { useCategories } from "@/hooks/use-categories";
import { toast } from "sonner";
import { toastError } from "@/lib/user-errors";

export const Route = createFileRoute("/_authenticated/list-skill")({
  head: () => ({ meta: [{ title: "List your skill — Tuungane" }] }),
  component: ListSkillPage,
});

function ListSkillPage() {
  const { user } = useAuth();
  const { categories } = useCategories();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [checking, setChecking] = useState(true);
  const [alreadyHas, setAlreadyHas] = useState(false);

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

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: sp } = await supabase
        .from("service_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      setAlreadyHas(!!sp);
      setChecking(false);
    })();
  }, [user]);

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
    if (error) { toastError(error, "Couldn't publish your skill"); return; }
    toast.success("Your skill is live", { description: "Customers nearby can now find and contact you." });
    nav({ to: "/dashboard" });
  };

  if (checking) {
    return <Layout><div className="mx-auto max-w-2xl px-4 py-12 text-sm text-muted-foreground">Loading…</div></Layout>;
  }

  if (alreadyHas) {
    return (
      <Layout>
        <section className="mx-auto max-w-2xl px-4 py-12 text-center">
          <h1 className="font-display text-3xl font-bold text-navy">You already have a skill listed</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage it from your dashboard.</p>
          <Link to="/dashboard" className="mt-6 inline-block rounded-xl bg-orange px-5 py-3 text-sm font-semibold text-orange-foreground">Go to dashboard</Link>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-green">Become a provider</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-navy">List your skill</h1>
          <p className="mt-2 text-sm text-muted-foreground">Tell people what you do and where you work. Customers nearby will be able to find and contact you.</p>
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
                <button disabled={busy} className="rounded-xl bg-green px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Publishing…" : "Publish my skill"}</button>
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
