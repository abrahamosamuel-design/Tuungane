import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, Sparkles, Star, MapPin, Phone, MessageCircle, Mail, Heart, Share2, Flag, Bookmark, Users, ClipboardList } from "lucide-react";
import { Layout } from "@/components/Layout";
import { getProvider, type Provider } from "@/data/providers";
import { getCategory } from "@/data/categories";
import { toast } from "sonner";

export const Route = createFileRoute("/providers/$id")({
  loader: ({ params }) => {
    const provider = getProvider(params.id);
    if (!provider) throw notFound();
    return { provider };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.provider.businessName ?? loaderData?.provider.name} — Tuungane` },
      { name: "description", content: loaderData?.provider.bio ?? "" },
    ],
  }),
  errorComponent: ({ error }) => <div className="p-8 text-center">Could not load profile: {error.message}</div>,
  notFoundComponent: () => (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold text-navy">Provider not found</h1>
        <Link to="/services" className="mt-6 inline-block text-orange">Browse providers</Link>
      </div>
    </Layout>
  ),
  component: ProviderPage,
});

const avatar = (s: string) => `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s)}&backgroundColor=1e3a8a,f97316,16a34a`;

function ProviderPage() {
  const { provider: p } = Route.useLoaderData();
  const category = getCategory(p.categorySlug);
  return (
    <Layout>
      <div className="border-b border-orange/30 bg-orange/10 px-4 py-2 text-center text-xs text-navy">
        <span className="font-semibold">Sample profile</span> · This is preview content. Real provider profiles live at <Link to="/feed" className="text-orange underline">the activity feed</Link>.
      </div>
      {/* Cover + Identity */}
      <section className="relative">
        <div className="h-40 sm:h-56" style={{ background: "var(--gradient-hero)" }} />
        <div className="mx-auto -mt-16 max-w-5xl px-4 sm:-mt-20 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-elevated)] sm:p-8">
            <Link to="/services" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-orange">
              <ArrowLeft className="h-3 w-3" /> Back to services
            </Link>
            <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-start">
              <img src={avatar(p.avatarSeed)} alt={p.name} className="h-24 w-24 rounded-2xl border-4 border-card shadow-md" />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-bold text-navy sm:text-3xl">{p.businessName ?? p.name}</h1>
                  {p.verified === "verified" && <span className="inline-flex items-center gap-1 rounded-full bg-green/10 px-2 py-0.5 text-xs font-semibold text-green"><BadgeCheck className="h-3 w-3" /> Verified</span>}
                  {p.verified === "featured" && <span className="inline-flex items-center gap-1 rounded-full bg-orange/10 px-2 py-0.5 text-xs font-semibold text-orange"><Sparkles className="h-3 w-3" /> Featured</span>}
                </div>
                {p.businessName && <p className="text-sm text-muted-foreground">{p.name}</p>}
                <p className="mt-1 text-sm text-orange font-medium">{p.subcategory} · {category?.name}</p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-orange text-orange" />{p.rating} ({p.reviewsCount} reviews)</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{p.area}, {p.town}</span>
                  <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />{p.followers} followers</span>
                  <span className={`inline-flex items-center gap-1 font-medium ${p.availability === "Available now" ? "text-green" : "text-muted-foreground"}`}>
                    <span className={`h-2 w-2 rounded-full ${p.availability === "Available now" ? "bg-green" : "bg-muted-foreground"}`} />
                    {p.availability}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <a href={`https://wa.me/${p.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-green px-5 py-3 text-sm font-semibold text-green-foreground transition hover:brightness-110 sm:flex-none">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
              <a href={`tel:${p.phone}`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-orange px-5 py-3 text-sm font-semibold text-orange-foreground transition hover:brightness-110 sm:flex-none">
                <Phone className="h-4 w-4" /> Call
              </a>
              {p.email && (
                <a href={`mailto:${p.email}`} className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-navy transition hover:border-orange">
                  <Mail className="h-4 w-4" /> Email
                </a>
              )}
              <button className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-sm font-semibold text-navy transition hover:border-orange">
                <Bookmark className="h-4 w-4" />
              </button>
              <button className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-sm font-semibold text-navy transition hover:border-orange">
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-10 grid max-w-5xl gap-8 px-4 pb-12 sm:px-6 lg:grid-cols-[2fr_1fr] lg:px-8">
        {/* Main */}
        <div className="space-y-8">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-bold text-navy">About</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/80">{p.bio}</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-navy">Portfolio & recent work</h2>
              <span className="text-xs text-muted-foreground">{p.portfolio.length} posts</span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {p.portfolio.map((post: Provider["portfolio"][number]) => (
                <article key={post.id} className="overflow-hidden rounded-xl border border-border">
                  <div className="aspect-[4/3] w-full bg-surface" style={{ background: `url(https://images.unsplash.com/photo-${post.seed}?w=600&q=70&auto=format&fit=crop) center/cover` }} />
                  <div className="p-4">
                    <p className="text-sm text-foreground/80">{post.caption}</p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />{post.likes}</span>
                      <button className="text-orange hover:underline">Like</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-bold text-navy">Reviews</h2>
            <p className="mt-1 text-sm text-muted-foreground">{p.reviewsCount} customer reviews · {p.rating} average</p>
            <div className="mt-4 space-y-4">
              {[
                { n: "Mary K.", r: 5, t: "Showed up on time, very professional. Will hire again." },
                { n: "James O.", r: 5, t: "Excellent work and fair price. Highly recommended." },
              ].map((rv) => (
                <div key={rv.n} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-navy">{rv.n}</p>
                    <div className="flex">{Array.from({ length: rv.r }).map((_, i) => <Star key={i} className="h-3 w-3 fill-orange text-orange" />)}</div>
                  </div>
                  <p className="mt-1 text-sm text-foreground/80">{rv.t}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side */}
        <aside className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-sm font-bold text-navy">Service area</h3>
            <p className="mt-2 text-sm text-foreground/80">{p.district} · {p.town}</p>
            <p className="mt-1 text-xs text-muted-foreground">Serves: {p.areasServed.join(", ")}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-sm font-bold text-navy">Quick facts</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Experience</dt><dd className="font-medium text-navy">{p.yearsExperience} years</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Followers</dt><dd className="font-medium text-navy">{p.followers}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Likes</dt><dd className="font-medium text-navy">{p.likes}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd className="font-medium capitalize text-navy">{p.verified}</dd></div>
            </dl>
          </div>
          <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground hover:border-destructive hover:text-destructive">
            <Flag className="h-4 w-4" /> Report this profile
          </button>
        </aside>
      </section>
    </Layout>
  );
}
