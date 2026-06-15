import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCategories } from "@/hooks/use-categories";
import { categories as staticCategories } from "@/data/categories";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profiles/new")({
  head: () => ({ meta: [{ title: "Create Profile — Tuungane" }] }),
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
  const [profileType, setProfileType] = useState<ProfileType>("individual");
  const [name, setName] = useState("");
  const [categorySlug, setCategorySlug] = useState(staticCategories[0].slug);
  const [subcategory, setSubcategory] = useState(staticCategories[0].subcategories[0]);
  const [district, setDistrict] = useState("");
  const [town, setTown] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const cat = categories.find((c) => c.slug === categorySlug) ?? staticCategories[0];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      toast.error("Profile name is required");
      return;
    }
    setBusy(true);
    const base = slugify(name) || "profile";
    const slug = `${base}-${Math.random().toString(36).slice(2, 8)}`;
    const { data, error } = await supabase
      .from("public_profiles")
      .insert({
        owner_id: user.id,
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
      .select("id")
      .single();
    setBusy(false);
    if (error || !data) {
      toast.error(error?.message ?? "Could not create profile");
      return;
    }
    toast.success("Profile created — now add your services");
    nav({ to: "/profiles/$id", params: { id: data.id } });
  };

  return (
    <Layout>
      <section className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="font-display text-2xl font-bold text-navy">Create a new profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Each profile appears separately to customers. Use one per business, skill or organization.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="text-xs font-medium text-navy">Profile type</label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {(["individual", "business", "organization"] as ProfileType[]).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setProfileType(t)}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold capitalize ${
                    profileType === t ? "border-orange bg-orange/10 text-orange" : "border-border text-navy/70"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <Field label="Profile name" value={name} onChange={setName} placeholder="e.g. Genesis Car Wash" />

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
              {busy ? "Creating…" : "Create profile"}
            </button>
          </div>
        </form>
      </section>
    </Layout>
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
