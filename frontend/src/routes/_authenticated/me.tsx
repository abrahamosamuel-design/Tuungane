import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { uploadMedia } from "@/lib/upload";
import { Avatar } from "@/components/social/Avatar";
import { RemovePhotoConfirm } from "@/components/RemovePhotoConfirm";
import { fetchIdentityStatus, type IdentityStatus } from "@/lib/profile-badges";
import { useCreditWallet } from "@/hooks/use-credits";
import { toast } from "sonner";
import {
  LayoutDashboard, Coins, Settings, Briefcase, ClipboardList,
  CheckCircle2, Clock, Pencil, ImagePlus, Plus, ChevronRight,
  MapPin, Star, ArrowRight, Camera, Share2, Info, Check,
  X as XIcon, LogOut,
} from "lucide-react";
import { requestStatusMap, type ServiceRequestRow } from "@/data/serviceRequestTypes";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/me")({
  staticData: {}, // bottom nav visible
  head: () => ({ meta: [{ title: "My Profile — Tuungane" }] }),
  component: Me,
});

type Tab = "dashboard" | "credits" | "settings";
type Pkg = { id: string; name: string; credits: number; amount_ugx: number; active: boolean; sort_order: number };
type Tx  = { id: string; transaction_type: string; amount: number; reason: string; created_at: string };
type CreditReq = { id: string; package_id: string | null; package_name: string; credits_requested: number; amount_ugx: number; status: string; admin_note: string | null; created_at: string };

const fmtUgx = (n: number) => `${n.toLocaleString()} UGX`;

function Me() {
  const { user, loading, signOut } = useAuth() as any;
  const nav = useNavigate();
  const { balance } = useCreditWallet();

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  const [profile, setProfile] = useState<{
    full_name: string; avatar_url: string | null; bio: string | null;
    town: string | null; district: string | null;
  } | null>(null);
  const [_identity, setIdentity] = useState<IdentityStatus | null>(null);
  const [busy, setBusy] = useState(false);

  // Dashboard
  const [services, setServices] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [counts, setCounts] = useState({ services: 0, requests: 0, completed: 0, pending: 0 });
  const [dashLoaded, setDashLoaded] = useState(false);

  // Credits
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [reqs, setReqs] = useState<CreditReq[]>([]);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const pkgsLoaded = useRef(false);
  const creditsLoaded = useRef<string | null>(null);

  // Settings
  const [fullName, setFullName] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login", search: { tab: "login", redirect: "/me" } as never });
  }, [loading, user, nav]);

  const loadProfile = async () => {
    if (!user) return;
    setProfileLoading(true);
    setProfileError(false);
    try {
      // Try the detailed endpoint first
      const { data } = await apiClient<{ data: any }>("/profiles/me/details");
      const p = data.data?.profile;
      if (p) {
        setProfile({ full_name: p.full_name ?? "", avatar_url: p.avatar_url ?? null, bio: p.bio ?? null, town: p.town ?? null, district: p.district ?? null });
      } else {
        // Fallback to simple /profiles/me
        const { data: simple } = await apiClient<{ data: any }>("/profiles/me");
        const s = simple.data;
        if (s) setProfile({ full_name: s.full_name ?? "", avatar_url: s.avatar_url ?? null, bio: s.bio ?? null, town: s.town ?? null, district: s.district ?? null });
        else setProfileError(true);
      }
      fetchIdentityStatus(user.id).then(setIdentity).catch(() => setIdentity(null));
    } catch {
      // Fallback to simple /profiles/me on any error
      try {
        const { data: simple } = await apiClient<{ data: any }>("/profiles/me");
        const s = simple.data;
        if (s) setProfile({ full_name: s.full_name ?? "", avatar_url: s.avatar_url ?? null, bio: s.bio ?? null, town: s.town ?? null, district: s.district ?? null });
        else setProfileError(true);
      } catch { setProfileError(true); }
    } finally { setProfileLoading(false); }
  };

  const loadDashboard = async () => {
    if (!user || dashLoaded) return;
    try {
      const [svcRes, reqRes] = await Promise.all([
        apiClient<{ data: any[] }>("/services/me"),
        apiClient<{ data: { data: any[] } }>("/requests/me?role=all"),
      ]);
      const svcList = svcRes.data || [];
      const reqList = (reqRes.data?.data ?? []) as ServiceRequestRow[];
      setServices(svcList);
      setRequests(reqList.slice(0, 5));
      setCounts({
        services: svcList.length,
        requests: reqList.length,
        completed: reqList.filter(r => r.status === "completed").length,
        pending: reqList.filter(r => ["requested", "accepted", "in_progress"].includes(r.status)).length,
      });
    } catch {}
    setDashLoaded(true);
  };

  const loadCredits = async () => {
    if (!user || creditsLoaded.current === user.id) return;
    creditsLoaded.current = user.id;
    try {
      const { data } = await apiClient<{ data: { transactions: Tx[]; requests: CreditReq[] } }>("/credits/personal");
      setTxs(data.data?.transactions ?? []);
      setReqs(data.data?.requests ?? []);
    } catch {}
  };

  const loadPackages = async () => {
    if (pkgsLoaded.current) return;
    pkgsLoaded.current = true;
    try {
      const { data } = await apiClient<{ data: Pkg[] }>("/credits/packages");
      setPkgs(data.data ?? []);
    } catch {}
  };

  useEffect(() => { if (user) { loadProfile(); loadDashboard(); } }, [user]);
  useEffect(() => { if (activeTab === "credits") { loadPackages(); loadCredits(); } }, [activeTab]);
  useEffect(() => { if (profile && activeTab === "settings") setFullName(profile.full_name); }, [profile, activeTab]);

  const save = async (patch: any) => {
    setBusy(true);
    try { await apiClient.put("/profiles/me", patch); toast.success("Saved"); loadProfile(); }
    catch (err: any) { toast.error(err.response?.data?.error || "Failed to save"); }
    finally { setBusy(false); }
  };

  const onAvatar = async (file: File) => {
    if (!user) return;
    try { setBusy(true); const url = await uploadMedia(user.id, file, "avatars"); await save({ avatar_url: url }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); setBusy(false); }
  };

  const requestPurchase = async (pkg: Pkg) => {
    if (!user || submitting) return;
    const dup = reqs.find(r => r.status === "pending" && (r.package_id === pkg.id || r.package_name === pkg.name));
    if (dup) { toast.error("You already have a pending request for this package."); return; }
    setSubmitting(pkg.id);
    try {
      await apiClient.post("/credits/requests", { package_id: pkg.id, package_name: pkg.name, credits: pkg.credits, amount_ugx: pkg.amount_ugx });
      toast.success("Purchase request submitted."); loadCredits();
    } catch (err: any) { toast.error(err.response?.data?.error || "Failed to submit"); }
    finally { setSubmitting(null); }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try { await apiClient.put("/profiles/me", { full_name: fullName }); toast.success("Settings saved"); loadProfile(); }
    catch (err: any) { toast.error(err.response?.data?.error || "Failed to save"); }
    finally { setSavingSettings(false); }
  };

  if (loading || profileLoading) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f4f6fb]">
      <div className="h-12 w-12 rounded-full border-4 border-orange border-t-transparent animate-spin" />
      <p className="text-sm text-muted-foreground">Loading your profile…</p>
    </div>
  );

  if (!user) return null;

  if (profileError || !profile) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f4f6fb] px-6 text-center">
      <div className="rounded-2xl bg-white border border-border shadow-sm p-8 max-w-sm w-full">
        <p className="text-lg font-bold text-navy">Couldn't load your profile</p>
        <p className="mt-2 text-sm text-muted-foreground">There was a problem fetching your profile data. Please check your connection and try again.</p>
        <button onClick={loadProfile} className="mt-5 w-full rounded-full bg-orange py-3 text-sm font-bold text-white hover:bg-orange/90">
          Try again
        </button>
      </div>
    </div>
  );

  const pendingPkgIds   = new Set(reqs.filter(r => r.status === "pending").map(r => r.package_id).filter(Boolean) as string[]);
  const pendingPkgNames = new Set(reqs.filter(r => r.status === "pending").map(r => r.package_name));

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Dashboard",  icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: "credits",   label: "My Credits", icon: <Coins className="h-4 w-4" /> },
    { id: "settings",  label: "Settings",   icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div className="relative min-h-screen bg-[#f4f6fb] pb-32 font-sans">

      {/* Hero header */}
      <div className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-orange via-orange/90 to-navy">
        <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 left-8 h-28 w-28 rounded-full bg-white/5" />
      </div>

      <div className="mx-auto max-w-lg px-4">
        {/* Profile card */}
        <div className="relative -mt-16 rounded-3xl bg-white shadow-xl px-5 pt-5 pb-6">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="h-24 w-24 rounded-full ring-4 ring-white shadow-lg overflow-hidden">
                <Avatar name={profile.full_name} url={profile.avatar_url} size={96} verifiedRing={!!profile.avatar_url} />
              </div>
              <label className="absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-orange shadow-md border-2 border-white">
                <Camera className="h-3.5 w-3.5 text-white" />
                <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={e => e.target.files?.[0] && onAvatar(e.target.files[0])} />
              </label>
            </div>
            <h1 className="mt-3 text-xl font-bold text-navy">{profile.full_name}</h1>
            {(profile.town || profile.district) && (
              <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-orange" />
                {[profile.town, profile.district].filter(Boolean).join(" | ")}
              </p>
            )}
            <div className="mt-4 flex gap-3 w-full">
              <Link to="/profiles/" className="flex-1 flex items-center justify-center gap-2 rounded-full border-2 border-navy/20 py-2 text-sm font-semibold text-navy hover:border-navy/40 transition-colors">
                <Pencil className="h-4 w-4" /> Edit
              </Link>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/u/${user.id}`;
                  navigator.clipboard?.writeText(url).then(() => toast.success("Profile link copied!"));
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-full bg-orange py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange/90 transition-colors"
              >
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-4 border-t border-border pt-4">
            <div className="text-center"><p className="text-lg font-bold text-navy">{counts.services}</p><p className="text-[11px] text-muted-foreground">Services</p></div>
            <div className="h-8 w-px bg-border" />
            <div className="flex items-center gap-1"><Star className="h-4 w-4 fill-orange text-orange" /><p className="text-lg font-bold text-navy">4.8</p></div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center"><p className="text-lg font-bold text-navy">{counts.completed}</p><p className="text-[11px] text-muted-foreground">Jobs done</p></div>
          </div>
        </div>

        {/* Tab pills */}
        <div className="mt-5 flex rounded-2xl bg-white shadow-sm border border-border/60 p-1 gap-1">
          {tabs.map(t => (
            <button key={t.id} id={`tab-${t.id}`} onClick={() => setActiveTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-all duration-200 ${activeTab === t.id ? "bg-orange text-white shadow-sm" : "text-muted-foreground hover:text-navy"}`}
            >
              {t.icon}<span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── DASHBOARD ── */}
        {activeTab === "dashboard" && (
          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<Briefcase className="h-5 w-5" />}   label="Services Listed"  value={counts.services}  color="bg-blue-50 text-blue-600" />
              <StatCard icon={<ClipboardList className="h-5 w-5" />} label="Service Requests" value={counts.requests}  color="bg-orange/10 text-orange" />
              <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Jobs Done"         value={counts.completed} color="bg-green-50 text-green-600" />
              <StatCard icon={<Clock className="h-5 w-5" />}        label="Pending Jobs"      value={counts.pending}   color="bg-yellow-50 text-yellow-600" />
            </div>

            <SectionCard title="My Services" action={{ label: "Manage All", to: "/profiles/" }}>
              {!dashLoaded ? <p className="text-sm text-muted-foreground py-2">Loading…</p>
                : services.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5 text-center">
                    <Briefcase className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-navy font-medium">No services yet</p>
                    <Link to="/businesses/new" className="mt-3 inline-block rounded-full bg-orange px-4 py-1.5 text-xs font-semibold text-white shadow">+ Add Service</Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {services.map(s => (
                      <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/80 p-3 hover:border-orange/40 transition-colors">
                        <div className="h-9 w-9 rounded-xl bg-orange/10 flex items-center justify-center flex-shrink-0">
                          <Briefcase className="h-4 w-4 text-orange" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-semibold text-navy">{s.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{s.profile?.name}</p>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <Link to="/profiles/$id" params={{ id: s.profile_id }} className="rounded-lg bg-navy/5 px-2.5 py-1 text-xs font-semibold text-navy hover:bg-navy/10">
                            <Pencil className="h-3 w-3 inline mr-1" />Edit
                          </Link>
                          <button onClick={() => toast.info("Timeline posting coming soon!")} className="rounded-lg bg-orange px-2.5 py-1 text-xs font-semibold text-white hover:bg-orange/90">
                            <Plus className="h-3 w-3 inline mr-0.5" />Post
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </SectionCard>

            <SectionCard title="Recent Requests" action={{ label: "View all", to: "/requests" }}>
              {!dashLoaded ? <p className="text-sm text-muted-foreground py-2">Loading…</p>
                : requests.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5 text-center">
                    <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-navy font-medium">No requests yet</p>
                    <Link to="/services" className="mt-3 inline-block rounded-full bg-orange px-4 py-1.5 text-xs font-semibold text-white shadow">Browse Services</Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {requests.map((r: any) => {
                      const s = requestStatusMap[r.status as keyof typeof requestStatusMap];
                      return (
                        <Link key={r.id} to="/requests/$id" params={{ id: r.id }}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/80 p-3 hover:border-orange/40 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-navy">{r.service_needed}</p>
                            <p className="truncate text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s?.color ?? "bg-muted text-muted-foreground"}`}>{s?.label ?? r.status}</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
            </SectionCard>

            <div className="grid grid-cols-2 gap-3">
              <Link to="/profiles/new" className="flex items-center gap-3 rounded-2xl bg-white border border-border p-4 hover:border-orange/40 transition-colors shadow-sm">
                <div className="rounded-xl bg-orange/10 p-2 text-orange"><Plus className="h-5 w-5" /></div>
                <span className="text-sm font-semibold text-navy">New Service</span>
              </Link>
              <Link to="/requests/new" className="flex items-center gap-3 rounded-2xl bg-white border border-border p-4 hover:border-orange/40 transition-colors shadow-sm">
                <div className="rounded-xl bg-blue-50 p-2 text-blue-600"><ArrowRight className="h-5 w-5" /></div>
                <span className="text-sm font-semibold text-navy">New Request</span>
              </Link>
            </div>
          </div>
        )}

        {/* ── CREDITS ── */}
        {activeTab === "credits" && (
          <div className="mt-5 space-y-5">
            <div className="rounded-2xl bg-gradient-to-br from-orange/15 via-orange/5 to-background border border-orange/20 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-orange uppercase tracking-wide"><Coins className="h-4 w-4" /> Tuungane Credits</div>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-5xl font-bold text-navy leading-none">{(balance ?? 0).toLocaleString()}</span>
                <span className="text-lg font-semibold text-muted-foreground mb-1">credits</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Boost visibility, feature posts, and promote your services.</p>
              <a href="#packages" className="mt-4 inline-flex items-center rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110">Buy credits</a>
            </div>

            <div className="flex gap-3 rounded-xl border border-border bg-white p-4 text-sm text-muted-foreground shadow-sm">
              <Info className="h-5 w-5 flex-shrink-0 text-navy" />
              <p><strong className="text-navy">Credits are not cash.</strong> Used inside Tuungane for boosts, features and promotions. Cannot be withdrawn.</p>
            </div>

            <div id="packages">
              <h2 className="mb-3 text-base font-bold text-navy">Buy credits</h2>
              <div className="grid grid-cols-2 gap-3">
                {pkgs.map(p => {
                  const hasPending = pendingPkgIds.has(p.id) || pendingPkgNames.has(p.name);
                  const isSubmitting = submitting === p.id;
                  return (
                    <div key={p.id} className="flex flex-col rounded-2xl border border-border bg-white p-4 shadow-sm hover:border-orange/50 transition-colors">
                      <div className="text-xs font-medium text-muted-foreground">{p.name}</div>
                      <div className="mt-1 flex items-baseline gap-1"><span className="text-2xl font-bold text-navy">{p.credits}</span><span className="text-xs text-muted-foreground">credits</span></div>
                      <div className="text-sm font-bold text-orange">{fmtUgx(p.amount_ugx)}</div>
                      <button disabled={isSubmitting || hasPending} onClick={() => requestPurchase(p)}
                        className={`mt-3 w-full rounded-full py-2 text-xs font-semibold transition ${hasPending ? "bg-orange/15 text-orange cursor-not-allowed" : "bg-navy text-white hover:bg-navy/90 disabled:opacity-60"}`}
                      >{hasPending ? "Pending…" : isSubmitting ? "Submitting…" : "Buy"}</button>
                    </div>
                  );
                })}
                {pkgs.length === 0 && <div className="col-span-2 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No packages available.</div>}
              </div>
            </div>

            {reqs.length > 0 && (
              <SectionCard title="Purchase Requests">
                <div className="space-y-2">
                  {reqs.slice(0, 5).map(r => (
                    <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-background/70 p-3">
                      <div><p className="text-sm font-semibold text-navy">{r.package_name}</p><p className="text-xs text-muted-foreground">{r.credits_requested} credits · {timeAgo(r.created_at)}</p></div>
                      <CreditStatusBadge status={r.status} />
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            <SectionCard title="Transaction History">
              {txs.length === 0 ? <p className="text-sm text-muted-foreground py-2">No activity yet.</p> : (
                <div className="space-y-2">
                  {txs.slice(0, 6).map(t => (
                    <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-background/70 p-3">
                      <div className="min-w-0"><p className="truncate text-sm text-navy">{t.reason || t.transaction_type.replace(/_/g, " ")}</p><p className="text-xs text-muted-foreground">{timeAgo(t.created_at)}</p></div>
                      <span className={`text-base font-bold flex-shrink-0 ${t.amount >= 0 ? "text-green-600" : "text-red-500"}`}>{t.amount > 0 ? "+" : ""}{t.amount}</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {/* ── SETTINGS ── */}
        {activeTab === "settings" && (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl bg-white border border-border shadow-sm p-5">
              <h2 className="text-sm font-bold text-navy mb-4">Profile Information</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-navy">Display Name</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-orange transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-medium text-navy">Bio</label>
                  <textarea defaultValue={profile.bio ?? ""} onBlur={e => e.target.value !== (profile.bio ?? "") && save({ bio: e.target.value })} rows={3} className="mt-1 w-full resize-none rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-orange transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-navy">District</label>
                    <input defaultValue={profile.district ?? ""} onBlur={e => e.target.value !== profile.district && save({ district: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-orange" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-navy">Town</label>
                    <input defaultValue={profile.town ?? ""} onBlur={e => e.target.value !== profile.town && save({ town: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-orange" />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-xs font-semibold text-navy hover:border-orange transition-colors">
                    <ImagePlus className="h-4 w-4" />
                    {profile.avatar_url ? "Change Photo" : "Add Photo"}
                    <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={e => e.target.files?.[0] && onAvatar(e.target.files[0])} />
                  </label>
                  {profile.avatar_url && <RemovePhotoConfirm onConfirm={() => save({ avatar_url: null })} disabled={busy} />}
                </div>
                <button onClick={saveSettings} disabled={savingSettings} className="w-full rounded-full bg-orange py-3 text-sm font-bold text-white shadow-sm hover:bg-orange/90 disabled:opacity-60 transition-colors">
                  {savingSettings ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-border shadow-sm p-5">
              <h2 className="text-sm font-bold text-navy mb-3">Account</h2>
              <div className="space-y-1">
                <div className="flex items-center justify-between rounded-xl px-1 py-2.5 text-sm">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium text-navy truncate ml-4">{user.email}</span>
                </div>
                <div className="h-px bg-border" />
                <Link to="/settings" className="flex items-center justify-between rounded-xl px-1 py-2.5 text-sm hover:text-orange">
                  <span className="text-navy font-medium">Advanced Settings</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
                <div className="h-px bg-border" />
                <Link to="/credits" className="flex items-center justify-between rounded-xl px-1 py-2.5 text-sm hover:text-orange">
                  <span className="text-navy font-medium">Full Credits Page</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </div>
            </div>

            <button
              onClick={() => { signOut(); nav({ to: "/" }); }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white py-3.5 text-sm font-semibold text-red-500 shadow-sm hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white border border-border p-4 shadow-sm">
      <div className={`rounded-xl p-2.5 flex-shrink-0 ${color}`}>{icon}</div>
      <div><p className="text-2xl font-bold text-navy leading-none">{value}</p><p className="text-[11px] text-muted-foreground mt-0.5">{label}</p></div>
    </div>
  );
}

function SectionCard({ title, action, children }: { title: string; action?: { label: string; to: string }; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white border border-border shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-navy">{title}</h2>
        {action && <Link to={action.to} className="flex items-center gap-1 text-xs font-semibold text-orange hover:underline">{action.label} <ArrowRight className="h-3 w-3" /></Link>}
      </div>
      {children}
    </div>
  );
}

function CreditStatusBadge({ status }: { status: string }) {
  const map: Record<string, { c: string; icon: React.ReactNode; label: string }> = {
    pending:   { c: "bg-orange/15 text-orange",        icon: <Clock className="h-3 w-3" />,  label: "Pending" },
    paid:      { c: "bg-green-100 text-green-700",      icon: <Check className="h-3 w-3" />,  label: "Paid" },
    rejected:  { c: "bg-red-100 text-red-600",          icon: <XIcon className="h-3 w-3" />,  label: "Rejected" },
    cancelled: { c: "bg-muted text-muted-foreground",   icon: <XIcon className="h-3 w-3" />,  label: "Cancelled" },
  };
  const s = map[status] ?? { c: "bg-muted text-muted-foreground", icon: <Info className="h-3 w-3" />, label: status };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.c}`}>{s.icon}{s.label}</span>;
}