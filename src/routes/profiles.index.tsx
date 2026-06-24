import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Building2, MapPin, BadgeCheck, Sparkles, User, SearchX } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Avatar } from "@/components/social/Avatar";

export const Route = createFileRoute("/profiles/")({
  head: () => ({ meta: [
    { title: "Browse Profiles — Tuungane" },
    { name: "description", content: "Discover individuals, businesses and organizations offering services on Tuungane." },
  ]}),
  component: ProfilesBrowsePage,
});

type PProfile = {
  id: string; slug: string; name: string; profile_type: string;
  bio: string; avatar_url: string | null; cover_url: string | null;
  district: string | null; town: string | null; area: string | null;
  verified: string; is_featured: boolean;
};

function ProfilesBrowsePage() {
  const [profiles, setProfiles] = useState<PProfile[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("public_profiles")
        .select("id,slug,name,profile_type,bio,avatar_url,cover_url,district,town,area,verified,is_featured")
        .eq("suspended", false)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);
      setProfiles((data as PProfile[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return profiles.filter((p) => {
      if (type && p.profile_type !== type) return false;
      if (!term) return true;
      return p.name.toLowerCase().includes(term) || (p.bio || "").toLowerCase().includes(term);
    });
  }, [profiles, q, type]);

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy">Browse Profiles</h1>
            <p className="text-sm text-muted-foreground">Individuals, businesses and organizations on Tuungane.</p>
          </div>
          <Link to="/profiles/new" className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-orange px-3 py-2 text-xs font-semibold text-orange-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Create profile
          </Link>
        </div>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or bio"
            className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm"
          />
          <div className="flex gap-2 overflow-x-auto">
            {[
              { v: "", label: "All" },
              { v: "individual", label: "Individuals" },
              { v: "business", label: "Businesses" },
              { v: "organization", label: "Organizations" },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setType(opt.v)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${type === opt.v ? "bg-navy text-white" : "border border-border bg-background text-navy"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={profiles.length === 0 ? Sparkles : SearchX}
            title={profiles.length === 0 ? "Be the first profile here" : "No profiles match your search"}
            description={profiles.length === 0
              ? "Create your individual, business, or organization profile so customers can find and contact you."
              : "Try a different search term or clear the type filter."}
            action={profiles.length === 0
              ? { label: "Create a profile", to: "/profiles/new" }
              : { label: "Clear filters", onClick: () => { setQ(""); setType(""); } }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filtered.map((p) => (
              <Link
                key={p.id}
                to="/p/$slug"
                params={{ slug: p.slug }}
                className="flex gap-3 rounded-2xl border border-border bg-card p-3 transition hover:border-orange/40 hover:shadow-sm"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-muted">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={p.name} className="h-full w-full object-cover" />
                  ) : p.profile_type === "individual" ? (
                    <User className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="truncate font-semibold text-navy">{p.name}</h3>
                    {p.verified === "verified" && <BadgeCheck className="h-4 w-4 shrink-0 text-orange" />}
                  </div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{p.profile_type}</p>
                  {p.bio && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.bio}</p>}
                  {(p.town || p.district) && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {[p.area, p.town, p.district].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
