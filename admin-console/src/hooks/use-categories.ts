import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { categories as staticCategories, type ServiceCategory } from "@/data/categories";

let cache: ServiceCategory[] | null = null;
let inflight: Promise<ServiceCategory[]> | null = null;
const listeners = new Set<(c: ServiceCategory[]) => void>();

async function fetchCategories(): Promise<ServiceCategory[]> {
  try {
    const { data: res } = await apiClient("/services/metadata");
    if (!res.data || res.data.length === 0) return staticCategories;
    return res.data;
  } catch (err) {
    console.error("Failed to fetch categories", err);
    return staticCategories;
  }
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
