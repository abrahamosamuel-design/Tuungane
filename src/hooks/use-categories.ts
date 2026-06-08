import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { categories as staticCategories, type ServiceCategory } from "@/data/categories";

let cache: ServiceCategory[] | null = null;
let inflight: Promise<ServiceCategory[]> | null = null;
const listeners = new Set<(c: ServiceCategory[]) => void>();

async function fetchCategories(): Promise<ServiceCategory[]> {
  const [{ data: cs }, { data: ss }] = await Promise.all([
    supabase.from("service_categories").select("slug,name,icon,blurb,sort_order,active").eq("active", true).order("sort_order").order("name"),
    supabase.from("service_subcategories").select("category_slug,name,sort_order,active").eq("active", true).order("sort_order").order("name"),
  ]);
  if (!cs || cs.length === 0) return staticCategories;
  const subsBy = new Map<string, string[]>();
  (ss ?? []).forEach((s: any) => {
    const arr = subsBy.get(s.category_slug) ?? [];
    arr.push(s.name);
    subsBy.set(s.category_slug, arr);
  });
  return cs.map((c: any) => ({
    slug: c.slug,
    name: c.name,
    icon: c.icon || "Wrench",
    blurb: c.blurb || "",
    subcategories: subsBy.get(c.slug) ?? [],
  }));
}

export function useCategories() {
  const [cats, setCats] = useState<ServiceCategory[]>(cache ?? staticCategories);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let mounted = true;
    const onUpdate = (c: ServiceCategory[]) => { if (mounted) setCats(c); };
    listeners.add(onUpdate);

    if (cache) {
      setLoading(false);
    } else {
      if (!inflight) {
        inflight = fetchCategories().then((c) => {
          cache = c;
          listeners.forEach((fn) => fn(c));
          return c;
        }).finally(() => { inflight = null; });
      }
      inflight.then(() => { if (mounted) setLoading(false); });
    }
    return () => { mounted = false; listeners.delete(onUpdate); };
  }, []);

  return { categories: cats, loading };
}

export function useCategory(slug: string | undefined) {
  const { categories } = useCategories();
  return categories.find((c) => c.slug === slug);
}
