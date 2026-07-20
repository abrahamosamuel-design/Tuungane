import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useCategories } from "@/hooks/use-categories";
import { categories as staticCategories } from "@/data/categories";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profiles/new")({
  head: () => ({ meta: [{ title: "List a new service — Tuungane" }] }),
  component: NewProfile,
});

type ProfileType = "individual" | "business" | "organization";


function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function NewProfile() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { categories } = useCategories();
  // Every new profile is a service profile in the MVP.
  const profileType: ProfileType = "individual";
  const [name, setName] = useState("");
  const [categorySlug, setCategorySlug] = useState(staticCategories[0].slug);
  const [subcategory, setSubcategory] = useState(staticCategories[0].subcategories[0]);
  const [district, setDistrict] = useState("");
  const [town, setTown] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<
    | { id: string; name: string }
    | null
  >(null);

  const cat = categories.find((c) => c.slug === categorySlug) ?? staticCategories[0];

  const doInsert = async () => {
    if (!user) return;
    setBusy(true);
    const base = slugify(name) || "profile";
    const slug = `${base}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      const { data } = await apiClient<{ data: { id: string; slug: string } }>(`/profiles/public`, {
        method: 'POST',
        body: JSON.stringify({
          profile_type: profileType,
          slug,
          name: name.trim(),
          category_slug: categorySlug,
          subcategory,
          district: district || null,
          town: town || null,
          bio: bio || "",
          phone: phone || null,
        })
      });
      setBusy(false);
      toast.success("Your service profile is live");
      nav({ to: "/p/$slug", params: { slug: data.slug }, search: { welcome: "1" } as never });
    } catch (err) {
      setBusy(false);
      toast.error(err instanceof Error ? err.message : "Could not create profile");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      toast.error("Service name is required");
      return;
    }

    // Light duplicate check: fetch all my profiles and filter
    const normalized = name.trim().toLowerCase();
    try {
      const { data: myProfiles } = await apiClient<{ data: any[] }>(`/profiles/public/me`);
      const existing = myProfiles?.filter(p => 
        p.category_slug === categorySlug && 
        p.name.toLowerCase().includes(normalized)
      );

      if (existing && existing.length > 0 && !duplicateWarning) {
        setDuplicateWarning({ id: existing[0].id, name: existing[0].name });
        return;
      }
    } catch (e) {
      console.warn("Failed duplicate check", e);
    }

    await doInsert();
  };


  return (
    <>
      <section className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="font-display text-2xl font-bold text-navy">List a new service</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Each service appears separately to customers. You can list as many services as you offer under one Tuungane account.
        </p>

        {duplicateWarning && (
          <div className="mt-5 rounded-2xl border border-orange/40 bg-orange/5 p-4 text-sm">
            <p className="font-semibold text-navy">You may already have a similar service profile.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              We found an existing service called <span className="font-semibold text-navy">{duplicateWarning.name}</span> in the same category.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => nav({ to: "/profiles/$id", params: { id: duplicateWarning.id } })}
                className="rounded-xl border border-navy/20 bg-card px-3 py-1.5 text-xs font-semibold text-navy"
              >
                Edit existing
              </button>
              <button
                type="button"
                onClick={doInsert}
                disabled={busy}
                className="rounded-xl bg-orange px-3 py-1.5 text-xs font-semibold text-orange-foreground disabled:opacity-50"
              >
                {busy ? "Creating…" : "Continue creating new"}
              </button>
              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="rounded-xl px-3 py-1.5 text-xs font-medium text-navy/70"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="mt-5 space-y-4 rounded-2xl border border-border bg-card p-5">

          <div>
            <Field label="Service name" value={name} onChange={setName} placeholder="e.g. Genesis Car Wash" />
            <p className="mt-1 text-[11px] text-muted-foreground">
              This is the name customers will see on your service card. You can use your personal name, a service name, or a trading name.
            </p>
          </div>


          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-navy">Category</label>
              <select
                value={categorySlug}
                onChange={(e) => {
                  setCategorySlug(e.target.value);
                  setSubcategory(categories.find((c) => c.slug === e.target.value)?.subcategories[0] ?? "");
                }}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-navy">Sub-category</label>
              <select
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                {cat.subcategories.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="District" value={district} onChange={setDistrict} />
            <Field label="Town" value={town} onChange={setTown} />
          </div>

          <div>
            <label className="text-xs font-medium text-navy">Short description</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="mt-1 w-full resize-none rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-orange"
              placeholder="What does this profile offer?"
            />
          </div>

          <Field label="Phone (optional)" value={phone} onChange={setPhone} />

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => nav({ to: "/dashboard" })} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-navy">
              Cancel
            </button>
            <button disabled={busy} className="rounded-xl bg-orange px-4 py-2.5 text-sm font-semibold text-orange-foreground disabled:opacity-50">
              {busy ? "Creating…" : "Create service"}
            </button>

          </div>
        </form>
      </section>
    </>
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
