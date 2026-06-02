import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Calendar, Phone, MessageCircle, Mail, Bookmark, Flag, Share2, BadgeCheck, Send, Briefcase, ShieldAlert } from "lucide-react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getCategory } from "@/data/categories";
import { reportReasons } from "@/data/opportunities";
import { OpportunityCard, type OpportunityRow } from "@/components/OpportunityCard";
import { timeAgo } from "@/lib/format";
import { toast } from "sonner";
import { useActiveBoosts } from "@/hooks/use-boosts";
import { BoostBadge } from "@/components/BoostBadge";
import { BoostButton } from "@/components/BoostButton";
import { MobileActionBar } from "@/components/MobileActionBar";


import { RouteErrorCard, RouteNotFoundCard } from "@/lib/route-boundaries";

export const Route = createFileRoute("/opportunities/$id")({
  head: () => ({ meta: [{ title: "Opportunity — Tuungane" }] }),
  component: OpportunityDetails,
  errorComponent: ({ error, reset }) => <RouteErrorCard error={error} reset={reset} title="Couldn't load this opportunity" />,
  notFoundComponent: () => <RouteNotFoundCard title="Opportunity not found" message="This opportunity may have been removed or is no longer available." homeHref="/opportunities" homeLabel="Browse opportunities" />,
});

interface OppFull extends OpportunityRow {
  requirements: string | null;
  contact_phone: string | null;
  whatsapp_number: string | null;
  contact_email: string | null;
  image_url: string | null;
  district: string | null;
  town: string | null;
  area: string | null;
  business_page_id: string | null;
}

interface BusinessLite { id: string; slug: string; name: string; logo_url: string | null; verified: string; }


function OpportunityDetails() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [o, setO] = useState<OppFull | null>(null);
  const [author, setAuthor] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [business, setBusiness] = useState<BusinessLite | null>(null);
  const [similar, setSimilar] = useState<OpportunityRow[]>([]);
  const [saved, setSaved] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const { boosts: oppBoosts } = useActiveBoosts("opportunity", id);

  const load = async () => {
    const { data } = user
      ? await supabase.from("opportunities").select("*").eq("id", id).maybeSingle()
      : await supabase.from("opportunities").select("id,title,description,opportunity_type,category_slug,subcategory,location,district,town,area,requirements,compensation,deadline,image_url,business_page_id,poster_type,poster_id,status,is_featured,archived,expires_at,created_at,updated_at").eq("id", id).maybeSingle();
    if (!data) { setO(null); return; }
    setO(data as unknown as OppFull);
    const { data: p } = await supabase.from("profiles").select("full_name,avatar_url").eq("id", data.poster_id).maybeSingle();
    setAuthor(p);
    if (data.business_page_id) {
      const { data: b } = await supabase.from("business_pages").select("id,slug,name,logo_url,verified").eq("id", data.business_page_id).maybeSingle();
      setBusiness((b ?? null) as BusinessLite | null);
    } else {
      setBusiness(null);
    }
    const { data: sim } = await supabase.from("opportunities").select("id,title,description,opportunity_type,category_slug,subcategory,location,district,town,area,image_url,business_page_id,poster_type,poster_id,status,is_featured,archived,created_at,updated_at").eq("category_slug", data.category_slug).neq("id", id).in("status", ["approved", "featured"]).limit(4);
    setSimilar((sim ?? []) as unknown as OpportunityRow[]);

    if (user) {
      const { data: s } = await supabase.from("saved_opportunities").select("id").eq("opportunity_id", id).eq("user_id", user.id).maybeSingle();
      setSaved(!!s);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id, user?.id]);

  if (o === null) return (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-navy">Opportunity not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This opportunity may have been removed or is no longer available.</p>
        <Link to="/opportunities" className="mt-6 inline-block rounded-full bg-orange px-5 py-2 text-sm font-semibold text-orange-foreground">Browse opportunities</Link>
      </div>
    </Layout>
  );
  if (!o) return <Layout><div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Loading…</div></Layout>;

  const cat = getCategory(o.category_slug);

  const toggleSave = async () => {
    if (!user) { nav({ to: "/login", search: { tab: "login", redirect: `/opportunities/${id}` } as never }); return; }
    if (saved) {
      await supabase.from("saved_opportunities").delete().eq("opportunity_id", id).eq("user_id", user.id);
      setSaved(false); toast.success("Removed from saved");
    } else {
      await supabase.from("saved_opportunities").insert({ opportunity_id: id, user_id: user.id });
      setSaved(true); toast.success("Saved");
    }
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) try { await navigator.share({ title: o.title, url }); } catch { /* cancelled */ }
    else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
  };

  const waLink = o.whatsapp_number ? `https://wa.me/${o.whatsapp_number.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I'm interested in your Tuungane opportunity: ${o.title}`)}` : null;

  return (
    <Layout>
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link to="/opportunities" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-orange"><ArrowLeft className="h-4 w-4" /> All opportunities</Link>

        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
          <article className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-orange/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange">{o.opportunity_type}</span>
              {o.is_featured && <span className="inline-flex items-center gap-1 rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-semibold text-orange"><BadgeCheck className="h-3 w-3" /> Featured</span>}
              {business && (business.verified === "verified" || business.verified === "featured") && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green/10 px-2 py-0.5 text-[10px] font-semibold text-green"><BadgeCheck className="h-3 w-3" /> Verified business</span>
              )}
              {o.poster_type === "admin" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-navy/10 px-2 py-0.5 text-[10px] font-semibold text-navy"><BadgeCheck className="h-3 w-3" /> Tuungane Official</span>
              )}
              {oppBoosts.map((b) => <BoostBadge key={b.id} type={b.boost_type} />)}
              <span className="text-xs text-muted-foreground">{timeAgo(o.created_at)}</span>
            </div>

            <h1 className="mt-3 font-display text-2xl font-bold text-navy sm:text-3xl">{o.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground"><Briefcase className="mr-1 inline h-3 w-3" />{cat?.name}{o.subcategory ? ` · ${o.subcategory}` : ""}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {o.location}</span>
              {o.deadline && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> Apply by {new Date(o.deadline).toLocaleDateString()}</span>}
              {o.compensation && <span className="font-semibold text-navy">{o.compensation}</span>}
            </div>

            {o.image_url && <img src={o.image_url} alt="" className="mt-5 max-h-96 w-full rounded-xl object-cover" />}

            <div className="prose prose-sm mt-5 max-w-none text-foreground/90">
              <h2 className="font-display text-lg font-bold text-navy">Description</h2>
              <p className="whitespace-pre-wrap">{o.description}</p>
              {o.requirements && (<>
                <h2 className="mt-4 font-display text-lg font-bold text-navy">Requirements</h2>
                <p className="whitespace-pre-wrap">{o.requirements}</p>
              </>)}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button onClick={() => setApplyOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-orange-foreground hover:brightness-110"><Send className="h-4 w-4" /> Apply / Contact</button>
              {waLink && <a href={waLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-green px-4 py-2.5 text-sm font-semibold text-white"><MessageCircle className="h-4 w-4" /> WhatsApp</a>}
              {o.contact_phone && <a href={`tel:${o.contact_phone}`} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-navy"><Phone className="h-4 w-4" /> Call</a>}
              <button onClick={toggleSave} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold ${saved ? "border-orange bg-orange/10 text-orange" : "border-border text-navy"}`}><Bookmark className="h-4 w-4" /> {saved ? "Saved" : "Save"}</button>
              <button onClick={share} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-navy"><Share2 className="h-4 w-4" /> Share</button>
              {user?.id === o.poster_id && (
                <BoostButton boostType="feature_opportunity" entityType="opportunity" entityId={id} label="Feature opportunity" dialogTitle="Feature this opportunity" dialogDescription="Promote this opportunity to the top of the Opportunities page." />
              )}
              <button onClick={() => setReportOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-destructive"><Flag className="h-4 w-4" /> Report</button>
            </div>
          </article>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Posted by</p>
              {business ? (
                <Link to="/businesses/$slug" params={{ slug: business.slug }} className="mt-2 flex items-center gap-3 rounded-xl border border-border p-2 hover:border-orange">
                  {business.logo_url ? (
                    <img src={business.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy/10 text-navy"><Briefcase className="h-5 w-5" /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate text-sm font-semibold text-navy">{business.name}{(business.verified === "verified" || business.verified === "featured") && <BadgeCheck className="h-3.5 w-3.5 text-green" />}</p>
                    <p className="text-[11px] text-muted-foreground">Business page · {author?.full_name || "Tuungane user"}</p>
                  </div>
                </Link>
              ) : (
                <>
                  <p className="mt-1 font-semibold text-navy">{author?.full_name || "Tuungane user"}</p>
                  <p className="mt-0.5 text-xs capitalize text-muted-foreground">{o.poster_type}</p>
                </>
              )}
              {o.contact_email && <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" /> {o.contact_email}</p>}
            </div>

            <div className="rounded-2xl border border-orange/30 bg-orange/5 p-4 text-xs text-foreground/80">
              <p className="flex items-center gap-1 font-semibold text-orange"><ShieldAlert className="h-4 w-4" /> Safety note</p>
              <p className="mt-1">Please verify details before paying money, sharing sensitive information, or accepting work. Report suspicious opportunities to Tuungane.</p>
            </div>
          </aside>
        </div>

        {similar.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-3 font-display text-lg font-bold text-navy">Similar opportunities</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {similar.map((s) => <OpportunityCard key={s.id} o={s} />)}
            </div>
          </div>
        )}
      </section>

      <MobileActionBar>
        <button onClick={() => setApplyOpen(true)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-orange px-4 py-3 text-sm font-semibold text-orange-foreground"><Send className="h-4 w-4" /> Apply</button>
        {waLink && <a href={waLink} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green text-white"><MessageCircle className="h-5 w-5" /></a>}
        {o.contact_phone && <a href={`tel:${o.contact_phone}`} aria-label="Call" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-navy"><Phone className="h-5 w-5" /></a>}
      </MobileActionBar>

      {applyOpen && <ApplyDialog oppId={id} oppTitle={o.title} onClose={() => setApplyOpen(false)} />}
      {reportOpen && <ReportDialog oppId={id} onClose={() => setReportOpen(false)} />}
    </Layout>
  );
}


function ApplyDialog({ oppId, oppTitle, onClose }: { oppId: string; oppTitle: string; onClose: () => void }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [msg, setMsg] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) { nav({ to: "/login", search: { tab: "login", redirect: `/opportunities/${oppId}` } as never }); return; }
    if (!msg.trim()) { toast.error("Add a short message"); return; }
    setBusy(true);
    const { error } = await supabase.from("opportunity_applications").insert({
      opportunity_id: oppId, applicant_id: user.id, message: msg.trim(), contact_phone: phone || null,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Application sent"); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-bold text-navy">Apply for: {oppTitle}</h3>
        <p className="mt-1 text-xs text-muted-foreground">Send a short message to the poster.</p>
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} maxLength={500} placeholder="Briefly introduce yourself and why you're a good fit…" className="mt-3 w-full resize-none rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-orange" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your phone (optional)" className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-orange" />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-full bg-orange px-4 py-2 text-sm font-semibold text-orange-foreground disabled:opacity-50">{busy ? "Sending…" : "Send application"}</button>
        </div>
      </div>
    </div>
  );
}

function ReportDialog({ oppId, onClose }: { oppId: string; onClose: () => void }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [reason, setReason] = useState(reportReasons[0]);
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) { nav({ to: "/login" }); return; }
    setBusy(true);
    const { error } = await supabase.from("opportunity_reports").insert({
      opportunity_id: oppId, reporter_id: user.id, reason, description: desc || null,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Reported. Thanks for keeping Tuungane safe."); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-bold text-navy">Report this opportunity</h3>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
          {reportReasons.map((r) => <option key={r}>{r}</option>)}
        </select>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} maxLength={500} placeholder="Add details (optional)" className="mt-2 w-full resize-none rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-orange" />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-50">{busy ? "Sending…" : "Submit report"}</button>
        </div>
      </div>
    </div>
  );
}
