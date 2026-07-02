import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Building2, User as UserIcon, Landmark, Star, ChevronRight } from "lucide-react";
import { formatSubcategory } from "@/lib/format-category";


type Profile = {
  id: string;
  name: string;
  profile_type: "individual" | "business" | "organization";
  category_slug: string | null;
  subcategory: string | null;
  district: string | null;
  town: string | null;
  verified: string;
  avatar_url: string | null;
};

type ProfileCardData = Profile & {
  serviceCount: number;
  pendingRequests: number;
  rating: number | null;
  reviewCount: number;
};

const TYPE_META: Record<Profile["profile_type"], { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  individual: { label: "Individual", icon: UserIcon },
  business: { label: "Business", icon: Building2 },
  organization: { label: "Organization", icon: Landmark },
};

function isDraft(p: { category_slug: string | null; town: string | null; district: string | null }) {
  return !p.category_slug || (!p.town && !p.district);
}

function sortProfiles(a: ProfileCardData, b: ProfileCardData) {
  const score = (p: ProfileCardData) => (p.verified === "verified" ? 0 : isDraft(p) ? 2 : 1);
  return score(a) - score(b);
}


export function MyProfilesPanel() {
  const { user } = useAuth();
  const [items, setItems] = useState<ProfileCardData[] | null>(null);

  const load = async () => {
    if (!user) return;
    const { data: profiles } = await supabase
      .from("public_profiles")
      .select("id,name,profile_type,category_slug,subcategory,district,town,verified,avatar_url")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true });

    const list = (profiles ?? []) as Profile[];
    const enriched = await Promise.all(
      list.map(async (p) => {
        const [{ count: sc }, { count: pr }, reviewsRes] = await Promise.all([
          supabase.from("profile_services").select("*", { count: "exact", head: true }).eq("profile_id", p.id),
          supabase.from("service_requests").select("*", { count: "exact", head: true }).eq("public_profile_id", p.id).eq("status", "requested"),
          supabase.from("reviews").select("rating").eq("public_profile_id", p.id),
        ]);
        const ratings = (reviewsRes.data ?? []).map((r: { rating: number }) => r.rating).filter((n) => typeof n === "number");
        const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
        return {
          ...p,
          serviceCount: sc ?? 0,
          pendingRequests: pr ?? 0,
          rating: avg,
          reviewCount: ratings.length,
        } satisfies ProfileCardData;
      })
    );
    setItems(enriched);
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold text-navy">Your services</h2>
          <p className="text-xs text-muted-foreground">List every service you offer. Each one gets its own public card.</p>
        </div>
        <Link
          to="/profiles/new"
          className="shrink-0 inline-flex items-center gap-1 rounded-full bg-orange px-3 py-1.5 text-xs font-semibold text-orange-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Add a service
        </Link>
      </div>

      {items === null ? (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-center">
          <p className="font-semibold text-navy">No services listed yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create a service profile for each service you offer — customers can discover each one separately.
          </p>
          <Link
            to="/profiles/new"
            className="mt-3 inline-flex items-center gap-1 rounded-xl bg-orange px-4 py-2 text-sm font-semibold text-orange-foreground"
          >
            <Plus className="h-4 w-4" /> List your first service
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {[...items].sort(sortProfiles).map((p) => {
            const Icon = TYPE_META[p.profile_type].icon;
            const draft = isDraft(p);
            return (
              <li key={p.id}>
                <Link
                  to="/profiles/$id"
                  params={{ id: p.id }}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-orange/60"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Icon className="h-6 w-6 text-navy/60" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-navy">{p.name}</p>
                      {p.verified === "verified" ? (
                        <span className="rounded-full bg-green/10 px-2 py-0.5 text-[10px] font-semibold text-green">Verified</span>
                      ) : draft ? (
                        <span className="rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-semibold text-orange">Draft</span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {(p.subcategory ? formatSubcategory(p.subcategory) : p.category_slug) || "Category not set"} · {p.town || p.district || "Location not set"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-navy/80">
                      <span>{p.serviceCount} sub-service{p.serviceCount === 1 ? "" : "s"}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="inline-flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-orange text-orange" />
                        {p.rating ? p.rating.toFixed(1) : "—"} ({p.reviewCount})
                      </span>
                      {p.pendingRequests > 0 && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span className="font-semibold text-orange">{p.pendingRequests} pending</span>
                        </>
                      )}
                    </div>
                    {draft && (
                      <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-orange">
                        Finish setup →
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

