import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { OfficialBadge, VerifiedBadge } from "@/components/OfficialBadge";
import { OfficialPostCard } from "@/components/OfficialPostCard";
import { officialPostTypes, type OfficialAccountRow, type OfficialPostRow, type OfficialPostTypeValue } from "@/data/officialPostTypes";


export const Route = createFileRoute("/official")({
  head: () => ({
    meta: [
      { title: "Tuungane Official — Connect to Opportunity" },
      { name: "description", content: "Official Tuungane account: trusted services, skills-based opportunities, featured providers, safety tips, and platform updates." },
    ],
  }),
  component: OfficialPage,
});

function OfficialPage() {
  const [account, setAccount] = useState<OfficialAccountRow | null>(null);
  const [posts, setPosts] = useState<OfficialPostRow[]>([]);
  const [filter, setFilter] = useState<"all" | OfficialPostTypeValue>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await apiClient<{ data: { account: OfficialAccountRow, posts: OfficialPostRow[] } }>("/feed/official?filter=official");
        setAccount(res?.account || null);
        setPosts(res?.posts || []);
      } catch (err) {
        console.error("Failed to load official page:", err);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = filter === "all" ? posts : posts.filter((p) => p.post_type === filter);

  if (!loading && !account?.is_active) {
    return (
      <>
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="font-display text-2xl font-bold text-navy">Tuungane Official is not active yet</h1>
          <p className="mt-2 text-sm text-muted-foreground">The official account will appear here once an admin activates it.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="relative h-44 w-full sm:h-64" style={{ background: account?.cover_image_url ? `url(${account.cover_image_url}) center/cover` : "var(--gradient-hero)" }} />
      <section className="relative z-10 mx-auto -mt-20 max-w-4xl px-4 sm:-mt-24 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-orange/40 bg-card p-6 shadow-[var(--shadow-elevated)] sm:p-8">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
            <img src={account?.profile_image_url || "/TUUNGANE-CLEAR.png"} alt="Tuungane Official" className="h-24 w-24 shrink-0 rounded-2xl border-4 border-card bg-white object-cover shadow-md" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1 className="font-display text-2xl font-bold text-navy sm:text-3xl">{account?.name ?? "Tuungane Official"}</h1>
                <OfficialBadge /><VerifiedBadge />
              </div>
              <p className="mt-1 text-sm font-semibold text-orange">{account?.tagline ?? "Tuungane – Connect to Opportunity"}</p>
              <p className="mt-3 text-sm text-foreground/80">{account?.bio}</p>
              <p className="mt-2 text-xs italic text-muted-foreground">Official Tuungane Account · Connect. Grow. Prosper Together.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-4xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap gap-2">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>All</Chip>
          {officialPostTypes.map((t) => (
            <Chip key={t.value} active={filter === t.value} onClick={() => setFilter(t.value)}>{t.label}</Chip>
          ))}
        </div>
        <div className="space-y-4">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <p className="font-semibold text-navy">No official posts yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Check back soon for opportunities, featured providers, and updates.</p>
            </div>
          )}
          {filtered.map((p) => <OfficialPostCard key={p.id} post={p} account={account} />)}
        </div>
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="text-orange hover:underline">← Back to Tuungane</Link>
        </div>
      </section>
    </>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${active ? "bg-navy text-navy-foreground" : "border border-border bg-background text-muted-foreground hover:border-navy"}`}>{children}</button>;
}
