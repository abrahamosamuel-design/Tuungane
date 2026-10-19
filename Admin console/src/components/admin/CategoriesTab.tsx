import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  blurb: string;
  sort_order: number;
  active: boolean;
};

type Subcategory = {
  id: string;
  category_slug: string;
  name: string;
  sort_order: number;
  active: boolean;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function CategoriesTab() {
  const { isAdmin } = useAuth();
  const [cats, setCats] = useState<Category[]>([]);
  const [subs, setSubs] = useState<Subcategory[]>([]);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // new category form
  const [newCatName, setNewCatName] = useState("");
  const [newCatBlurb, setNewCatBlurb] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("MoreHorizontal");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient<{ data: { categories: Category[], subcategories: Subcategory[] } }>("/admin/categories");
      setCats(data.data.categories || []);
      setSubs(data.data.subcategories || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addCategory = async () => {
    const name = newCatName.trim();
    if (!name) return toast.error("Name required");
    const slug = slugify(name);
    if (!slug) return toast.error("Invalid slug");
    const sort_order = (cats.at(-1)?.sort_order ?? 0) + 10;
    try {
      await apiClient.post("/admin/categories", {
        slug, name, blurb: newCatBlurb.trim(), icon: newCatIcon.trim() || "MoreHorizontal", sort_order,
      });
      toast.success("Category added");
      setNewCatName(""); setNewCatBlurb(""); setNewCatIcon("MoreHorizontal");
      load();
    } catch (error: any) {
      toast.error("Failed to add category");
    }
  };

  const updateCategory = async (id: string, patch: Partial<Category>) => {
    try {
      await apiClient.put(`/admin/categories/${id}`, patch);
      load();
    } catch (error: any) {
      toast.error("Failed to update category");
    }
  };

  const deleteCategory = async (c: Category) => {
    if (!isAdmin) return toast.error("Admin only");
    if (!confirm(`Delete "${c.name}"? This also removes its subcategories.`)) return;
    try {
      await apiClient.delete(`/admin/categories/${c.id}`);
      toast.success("Deleted");
      load();
    } catch (error: any) {
      toast.error("Failed to delete");
    }
  };

  const addSub = async (category_slug: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = subs.filter((s) => s.category_slug === category_slug);
    const sort_order = (existing.at(-1)?.sort_order ?? 0) + 10;
    try {
      await apiClient.post("/admin/subcategories", { category_slug, name: trimmed, sort_order });
      load();
    } catch (error: any) {
      toast.error("Failed to add subcategory");
    }
  };

  const updateSub = async (id: string, patch: Partial<Subcategory>) => {
    try {
      await apiClient.put(`/admin/subcategories/${id}`, patch);
      load();
    } catch (error: any) {
      toast.error("Failed to update subcategory");
    }
  };

  const deleteSub = async (s: Subcategory) => {
    if (!confirm(`Remove "${s.name}"?`)) return;
    try {
      await apiClient.delete(`/admin/subcategories/${s.id}`);
      load();
    } catch (error: any) {
      toast.error("Failed to delete subcategory");
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-muted/30 p-3">
        <p className="text-sm font-semibold text-navy">Add new category</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_160px_auto]">
          <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Category name" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <input value={newCatBlurb} onChange={(e) => setNewCatBlurb(e.target.value)} placeholder="Short blurb" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <input value={newCatIcon} onChange={(e) => setNewCatIcon(e.target.value)} placeholder="Icon (lucide)" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <button onClick={addCategory} className="rounded-md bg-navy px-3 py-2 text-sm font-semibold text-navy-foreground">Add</button>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Slug is auto-generated from the name. Icon name from lucide-react (e.g. Wrench, Sparkles).</p>
      </div>

      <div className="space-y-2">
        {cats.map((c) => {
          const isOpen = openSlug === c.slug;
          const mySubs = subs.filter((s) => s.category_slug === c.slug);
          return (
            <div key={c.id} className="rounded-xl border border-border bg-card">
              <div className="flex flex-wrap items-center gap-2 p-3">
                <button onClick={() => setOpenSlug(isOpen ? null : c.slug)} className="text-sm font-semibold text-navy">
                  {isOpen ? "▼" : "▶"} {c.name}
                </button>
                <span className="text-xs text-muted-foreground">/{c.slug} · {mySubs.length} subs</span>
                {!c.active && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">HIDDEN</span>}
                <div className="ml-auto flex flex-wrap gap-1 text-xs">
                  <button onClick={() => updateCategory(c.id, { active: !c.active })} className="rounded border border-border px-2 py-1">{c.active ? "Hide" : "Show"}</button>
                  {isAdmin && <button onClick={() => deleteCategory(c)} className="rounded bg-destructive/10 px-2 py-1 text-destructive">Delete</button>}
                </div>
              </div>
              {isOpen && (
                <div className="border-t border-border p-3 space-y-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_2fr_120px_100px]">
                    <input defaultValue={c.name} onBlur={(e) => e.target.value !== c.name && updateCategory(c.id, { name: e.target.value })} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" placeholder="Name" />
                    <input defaultValue={c.blurb} onBlur={(e) => e.target.value !== c.blurb && updateCategory(c.id, { blurb: e.target.value })} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" placeholder="Blurb" />
                    <input defaultValue={c.icon} onBlur={(e) => e.target.value !== c.icon && updateCategory(c.id, { icon: e.target.value })} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" placeholder="Icon" />
                    <input type="number" defaultValue={c.sort_order} onBlur={(e) => Number(e.target.value) !== c.sort_order && updateCategory(c.id, { sort_order: Number(e.target.value) })} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" placeholder="Order" />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subcategories</p>
                    <div className="mt-2 space-y-1">
                      {mySubs.map((s) => (
                        <SubRow key={s.id} sub={s} onUpdate={updateSub} onDelete={deleteSub} />
                      ))}
                      {mySubs.length === 0 && <p className="text-xs text-muted-foreground">No subcategories yet.</p>}
                    </div>
                    <AddSubForm onAdd={(name) => addSub(c.slug, name)} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SubRow({ sub, onUpdate, onDelete }: {
  sub: Subcategory;
  onUpdate: (id: string, patch: Partial<Subcategory>) => void;
  onDelete: (s: Subcategory) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input defaultValue={sub.name} onBlur={(e) => e.target.value !== sub.name && onUpdate(sub.id, { name: e.target.value })} className="flex-1 min-w-[160px] rounded-md border border-border bg-background px-2 py-1 text-sm" />
      <input type="number" defaultValue={sub.sort_order} onBlur={(e) => Number(e.target.value) !== sub.sort_order && onUpdate(sub.id, { sort_order: Number(e.target.value) })} className="w-20 rounded-md border border-border bg-background px-2 py-1 text-sm" />
      <button onClick={() => onUpdate(sub.id, { active: !sub.active })} className="rounded border border-border px-2 py-1 text-xs">{sub.active ? "Hide" : "Show"}</button>
      <button onClick={() => onDelete(sub)} className="rounded bg-destructive/10 px-2 py-1 text-xs text-destructive">Delete</button>
    </div>
  );
}

function AddSubForm({ onAdd }: { onAdd: (name: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="mt-2 flex gap-2">
      <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { onAdd(v); setV(""); } }} placeholder="Add subcategory…" className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
      <button onClick={() => { onAdd(v); setV(""); }} className="rounded-md bg-navy px-3 py-1.5 text-sm font-semibold text-navy-foreground">Add</button>
    </div>
  );
}
