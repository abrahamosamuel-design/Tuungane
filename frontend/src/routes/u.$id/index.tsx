import { createFileRoute, useParams, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Phone, BadgeCheck, Star, Share2, Camera, Users, ThumbsUp, ClipboardList, Pencil, Plus, ChevronRight, ArrowLeft, MessageSquare, Loader2, Wrench, Zap, Sparkles, Calendar, GraduationCap, LayoutDashboard, Coins, Settings, Briefcase, CheckCircle2, Clock, ImagePlus, ArrowRight, Info, Check, X as XIcon, LogOut } from "lucide-react";
import { useCreditWallet } from "@/hooks/use-credits";
import { RemovePhotoConfirm } from "@/components/RemovePhotoConfirm";
import { ManageServiceDialog, type ServiceForm } from "@/components/ManageServiceDialog";
import { ServiceRequestCard, type RequestWithParty } from "@/components/ServiceRequestCard";

import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useAuthGate } from "@/components/RequireAuthDialog";
import { Avatar } from "@/components/social/Avatar";

import { FollowButton } from "@/components/social/FollowButton";
import { PostComposer } from "@/components/social/PostComposer";
import { PostCard, type PostRow } from "@/components/social/PostCard";
import { RecommendDialog } from "@/components/social/RecommendDialog";
import { ReviewDialog } from "@/components/social/ReviewDialog";

import { SaveButton } from "@/components/social/SaveButton";

import { ClaimProfileDialog } from "@/components/ClaimProfileDialog";

import { TrustBadge } from "@/components/trust/TrustBadge";
import { useTrustBadge } from "@/hooks/use-trust-badges";
import { ReportProfileButton } from "@/components/trust/ReportProfileButton";
import { RequestServiceDialog } from "@/components/RequestServiceDialog";
import { VerifiedReviewBadge } from "@/components/VerifiedReviewBadge";
import { uploadMedia } from "@/lib/upload";
import { timeAgo } from "@/lib/format";

import { useCategory } from "@/hooks/use-categories";
import { formatSubcategory } from "@/lib/format-category";

import { toast } from "sonner";
import { useActiveBoosts } from "@/hooks/use-boosts";
import { BoostBadge } from "@/components/BoostBadge";
import { BoostButton } from "@/components/BoostButton";
import { MobileActionBar } from "@/components/MobileActionBar";
import { ContactProviderModal } from "@/components/ContactProviderModal";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { PriceGuideCard, PriceGuideEmptyOwner, PriceGuideChip } from "@/components/PriceGuide";
import type { PriceType, PriceGuide } from "@/lib/price-guide";
import { ContactOptionsUnlocked } from "@/components/ContactOptionsUnlocked";
import { ProviderQuickContact } from "@/components/ProviderQuickContact";
import { useContactGate, getRevealablePhone, logContactClick } from "@/hooks/use-contact-gate";
import { IdentityBadges } from "@/components/profile/IdentityBadges";
import { fetchIdentityStatus, type IdentityStatus } from "@/lib/profile-badges";



import { RouteErrorCard, RouteNotFoundCard } from "@/lib/route-boundaries";
import { CategoryScroll } from "@/components/CategoryScroll";
import { ServiceVerticalList } from "@/components/ServiceVerticalList";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { c: string; label: string; icon: React.ReactNode }> = {
    pending:   { c: "bg-orange/15 text-orange",           label: "Pending approval", icon: <Clock className="h-3 w-3" /> },
    paid:      { c: "bg-green/15 text-green",             label: "Paid",             icon: <Check className="h-3 w-3" /> },
    rejected:  { c: "bg-destructive/15 text-destructive", label: "Rejected",         icon: <XIcon className="h-3 w-3" /> },
    cancelled: { c: "bg-muted text-muted-foreground",     label: "Cancelled",        icon: <XIcon className="h-3 w-3" /> },
  };
  const s = map[status] ?? { c: "bg-muted text-muted-foreground", label: status || "Unknown", icon: <Info className="h-3 w-3" /> };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${s.c}`}>{s.icon}{s.label}</span>;
}

export const Route = createFileRoute("/u/$id/")({
  staticData: { hideHeaderOnMobile: true },
  loader: async ({ params }) => {
    try {
      const { data } = await apiClient.get(`/profiles/full/${params.id}`);
      return { profile: data.profile, sp: data.sp };
    } catch (err) {
      console.error("Profile load error:", err);
      return { profile: null, sp: null };
    }
  },
  head: ({ params, loaderData }) => {
    const name = loaderData?.sp?.business_name || loaderData?.profile?.full_name || "Profile";
    const loc = [loaderData?.sp?.town || loaderData?.profile?.town, loaderData?.sp?.district || loaderData?.profile?.district].filter(Boolean).join(", ");
    const subtitle = loaderData?.sp?.subcategory || loaderData?.sp?.category_slug;
    const title = `${name}${subtitle ? ` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ${subtitle}` : ""} | Tuungane`;
    const description = (loaderData?.sp?.bio || loaderData?.profile?.bio || `Connect with ${name}${loc ? ` in ${loc}` : ""} on Tuungane ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Uganda's trusted services marketplace.`).slice(0, 158);
    const url = `https://tuungane.com/u/${params.id}`;
    const isProvider = !!loaderData?.sp || loaderData?.profile?.is_provider;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:type", content: "profile" },
    ];
    if (loaderData?.profile?.avatar_url) {
      meta.push({ property: "og:image", content: loaderData.profile.avatar_url });
      meta.push({ name: "twitter:image", content: loaderData.profile.avatar_url });
    }
    const scripts: Array<{ type: string; children: string }> = [];
    if (isProvider) {
      scripts.push({
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name,
          description,
          url,
          address: loc ? { "@type": "PostalAddress", addressLocality: loaderData?.sp?.town || loaderData?.profile?.town, addressRegion: loaderData?.sp?.district || loaderData?.profile?.district, addressCountry: "UG" } : undefined,
          image: loaderData?.profile?.avatar_url || undefined,
        }),
      });
    }
    return { meta, links: [{ rel: "canonical", href: url }], scripts };
  },
  component: UserProfile,
  errorComponent: ({ error, reset }) => <RouteErrorCard error={error} reset={reset} title="Couldn't load this profile" />,
  notFoundComponent: () => <RouteNotFoundCard title="Profile not found" message="This user profile may have been removed." />,
});

type Tab = "timeline" | "reviews" | "services" | "requests" | "admin";

const TABS: { id: Tab; label: string; providerOnly?: boolean; ownerOnly?: boolean; adminOnly?: boolean; href?: string }[] = [
  { id: "timeline", label: "Timeline" },
  { id: "services", label: "Services", providerOnly: true },
  { id: "reviews", label: "Reviews", providerOnly: true },
  { id: "requests", label: "My Requests", ownerOnly: true },
  { id: "admin", label: "Admin Console", ownerOnly: true, adminOnly: true, href: "/admin" },
];

type ProfileServiceRow = {
  id: string;
  title: string;
  description: string | null;
  active: boolean;
  is_primary: boolean;
  price_type: PriceType | null;
  price_fixed_ugx: number | null;
  price_min_ugx: number | null;
  price_max_ugx: number | null;
  price_currency: string | null;
  price_note: string | null;
  price_guidance_ugx: number | null;
};

function UserProfile() {
  const { id } = useParams({ from: "/u/$id/" });
  const { user, isModerator, signOut } = useAuth() as any;
  const nav = useNavigate();
  const { requireAuth } = useAuthGate();
  const loaderData = Route.useLoaderData();
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string | null; bio: string | null; town: string | null; district: string | null; area: string | null; location_visibility: string | null; is_provider: boolean } | null>((loaderData.profile as any) || null);
  const [sp, setSp] = useState<{ business_name: string | null; subcategory: string; bio: string; town: string; district: string; phone: string | null; whatsapp: string | null; email: string | null; verified: string; category_slug: string; years_experience: number; areas_served: string[]; availability: string; cover_url: string | null; header_url: string | null; seeded_by_official: boolean; seeded_status: string | null; price_type: string | null; price_fixed_ugx: number | null; price_min_ugx: number | null; price_max_ugx: number | null; price_currency: string | null; price_note: string | null } | null>((loaderData.sp as any) || null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [followers, setFollowers] = useState(0);
  const [recs, setRecs] = useState<Array<{ id: string; service: string; message: string; rating: number | null; created_at: string; user_id: string; profile?: { full_name: string; avatar_url: string | null } }>>([]);
  const [reviews, setReviews] = useState<Array<{ id: string; rating: number; text: string; created_at: string; user_id: string; profile?: { full_name: string; avatar_url: string | null } }>>([]);
  const [tab, setTab] = useState<Tab>("timeline");
  const [services, setServices] = useState<ProfileServiceRow[]>([]);
  const [jobsDone, setJobsDone] = useState(0);
  const [ownerPublicProfileId, setOwnerPublicProfileId] = useState<string | null>(null);
  const [svcDialog, setSvcDialog] = useState<{ open: boolean; mode: "create" | "edit"; initial?: Partial<ServiceForm> }>({ open: false, mode: "create" });
  const [recOpen, setRecOpen] = useState(false);
  const [revOpen, setRevOpen] = useState(false);
  
  
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [feedback, setFeedback] = useState<Array<{ id: string; rating: number; review_text: string; service_provided: string; created_at: string; customer_id: string; would_recommend: boolean; profile?: { full_name: string; avatar_url: string | null } }>>([]);
  const [canReview, setCanReview] = useState(false);
  const [identity, setIdentity] = useState<IdentityStatus | null>(null);
  const [calling, setCalling] = useState(false);

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Owner dashboard state ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  type OwnerTab = "dashboard" | "credits" | "settings";
  type Pkg = { id: string; name: string; credits: number; amount_ugx: number; active: boolean; sort_order: number };
  type Tx  = { id: string; transaction_type: string; amount: number; reason: string; created_at: string };
  type CreditReq = { id: string; package_id: string | null; package_name: string; credits_requested: number; amount_ugx: number; status: string; admin_note: string | null; created_at: string };
  const { balance } = useCreditWallet();
  const [ownerTab, setOwnerTab] = useState<OwnerTab>("dashboard");
  const [ownerRequests, setOwnerRequests] = useState<any[]>([]);
  const [ownerCounts, setOwnerCounts] = useState({ services: 0, requests: 0, completed: 0, pending: 0 });
  const [ownerReqLoaded, setOwnerReqLoaded] = useState(false);
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [creditReqs, setCreditReqs] = useState<CreditReq[]>([]);
  const [creditSubmitting, setCreditSubmitting] = useState<string | null>(null);
  const pkgsLoaded = useRef(false);
  const creditsLoaded = useRef<string | null>(null);
  const [ownerFullName, setOwnerFullName] = useState("");
  const [savingOwner, setSavingOwner] = useState(false);
  const [ownerBusy, setOwnerBusy] = useState(false);

  const handleCall = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      requireAuth(undefined, {
        title: "Sign in to call this provider",
        message: "Create a free Tuungane account to view phone numbers and contact providers directly.",
      });
      return;
    }
    setCalling(true);
    try {
      const p = await getRevealablePhone(id);
      if (!p) {
        toast.error("Phone number not available or hidden.");
        return;
      }
      logContactClick({
        customerId: user.id,
        providerId: id,
        serviceId: null,
        source: "provider_profile",
        method: "call",
      }).catch(() => {});
      window.location.href = `tel:${p}`;
    } finally {
      setCalling(false);
    }
  };


  useEffect(() => {
    setProfile((loaderData.profile as any) || null);
    setSp((loaderData.sp as any) || null);
  }, [loaderData]);

  const { data: auxData } = useQuery({
    queryKey: ["providerAux", id, user?.id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/profiles/full/${id}/aux`);
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (auxData) {
      if (auxData.contact && loaderData.sp) {
        setSp((prev) => ({ ...(prev || {}), ...auxData.contact } as any));
      }
      setServices(auxData.services);
      setPosts(auxData.posts);
      setFollowers(auxData.followers);
      setRecs(auxData.recs);
      setReviews(auxData.reviews);
      setFeedback(auxData.feedback);
      setCanReview(auxData.canReview);
      setJobsDone(auxData.jobsDone || 0);
      setOwnerPublicProfileId(auxData.ownerPublicProfileId);
    }
  }, [auxData, loaderData.sp]);
  useEffect(() => { fetchIdentityStatus(id).then(setIdentity).catch(() => setIdentity(null)); }, [id]);

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Owner data loading ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  const loadOwnerRequests = async () => {
    if (!user || ownerReqLoaded) return;
    try {
      const [reqsRes, dbsRes] = await Promise.all([
        apiClient.get<{ data: { data: any[] } }>("/requests/me?role=all"),
        apiClient.get<{ data: { data: any[] } }>("/direct-bookings/me")
      ]);
      const listReqs = (reqsRes as any).data?.data?.data ?? (reqsRes as any).data?.data ?? (reqsRes as any).data ?? [];
      const listDbs = (dbsRes as any).data?.data?.data ?? (dbsRes as any).data?.data ?? (dbsRes as any).data ?? [];
      
      const all: any[] = [...(Array.isArray(listReqs) ? listReqs : []), ...(Array.isArray(listDbs) ? listDbs : [])];
      all.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      setOwnerRequests(all.filter((r: any) => r.customer_id === user.id).slice(0, 5));
      setOwnerCounts({
        services: services.length,
        requests: Array.isArray(listReqs) ? listReqs.filter(r => r.customer_id === user.id).length : 0,
        completed: all.filter((r: any) => r.status === "completed" && (r.provider_id === user.id || r.selected_provider_id === user.id)).length,
        pending: all.filter((r: any) => ["requested","accepted","in_progress"].includes(r.status) && (r.provider_id === user.id || r.selected_provider_id === user.id)).length,
      });
    } catch {}
    setOwnerReqLoaded(true);
  };

  const loadOwnerCredits = async () => {
    if (!user || creditsLoaded.current === user.id) return;
    creditsLoaded.current = user.id;
    try {
      const { data } = await apiClient<{ data: { transactions: Tx[]; requests: CreditReq[] } }>("/credits/personal");
      setTxs((data as any).data?.transactions ?? (data as any).transactions ?? []);
      setCreditReqs((data as any).data?.requests ?? (data as any).requests ?? []);
    } catch {}
  };

  const loadOwnerPackages = async () => {
    if (pkgsLoaded.current) return;
    pkgsLoaded.current = true;
    try {
      const { data } = await apiClient<{ data: Pkg[] }>("/credits/packages");
      setPkgs(data.data ?? []);
    } catch {}
  };

  const saveOwnerProfile = async (patch: any) => {
    setOwnerBusy(true);
    try {
      await apiClient.put("/profiles/me", patch);
      toast.success("Saved");
      setProfile(p => p ? { ...p, ...patch } : p);
    } catch (err: any) { toast.error(err.response?.data?.error || "Failed to save"); }
    finally { setOwnerBusy(false); }
  };

  const requestPurchase = async (pkg: Pkg) => {
    if (!user || creditSubmitting) return;
    const dup = creditReqs.find(r => r.status === "pending" && (r.package_id === pkg.id || r.package_name === pkg.name));
    if (dup) { toast.error("You already have a pending request for this package."); return; }
    setCreditSubmitting(pkg.id);
    try {
      await apiClient.post("/credits/requests", { package_id: pkg.id, package_name: pkg.name, credits: pkg.credits, amount_ugx: pkg.amount_ugx });
      toast.success("Purchase request submitted."); loadOwnerCredits();
    } catch (err: any) { toast.error(err.response?.data?.error || "Failed to submit"); }
    finally { setCreditSubmitting(null); }
  };

  const cancelRequest = async (id: string) => {
    try {
      await apiClient.put(`/credits/requests/${id}/cancel`, {});
      toast.success("Request cancelled");
      loadOwnerCredits();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to cancel request");
    }
  };




  const uploadAvatar = async (file: File | null) => {
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadMedia(user.id, file, "avatars");
      await apiClient.patch("/profiles/me", { avatar_url: url });
      setProfile((p) => (p ? { ...p, avatar_url: url } : p));
      toast.success("Profile photo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setUploadingAvatar(false); }
  };

  const uploadCover = async (file: File | null) => {
    if (!file || !user) return;
    setUploadingCover(true);
    try {
      const url = await uploadMedia(user.id, file, "covers");
      await apiClient.put("/profiles/me/full", { serviceProfilePatch: { cover_url: url } });
      setSp((p) => (p ? { ...p, cover_url: url } : p));
      toast.success("Cover photo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setUploadingCover(false); }
  };

  const share = async () => {
    const url = `${window.location.origin}/u/${id}`;
    if (navigator.share) navigator.share({ title: profile?.full_name ?? "Profile", url }).catch(() => {});
    else { navigator.clipboard.writeText(url); toast.success("Profile link copied"); }
  };
  const gate = useContactGate(id);
  const cat = useCategory(sp?.category_slug);

  const isOwn = user?.id === id;
  const isProvider = !!profile?.is_provider;
  const visibleTabs = TABS.filter((t) => (!t.providerOnly || isProvider) && (!t.ownerOnly || isOwn) && (!t.adminOnly || isModerator));
  
  // ── UNIFIED RATING ──
  const totalReviews = feedback.length + reviews.length;
  const totalRatingPoints = feedback.reduce((s, r) => s + r.rating, 0) + reviews.reduce((s, r) => s + (r.rating || 0), 0);
  const avgRating = totalReviews > 0 ? totalRatingPoints / totalReviews : 0;
  const portfolioPosts = posts.filter((p) => p.media_urls.length > 0);

  // ── DASHBOARD LOGIC ──
  type OTab = OwnerTab;
  const ownerTabs = [
    { id: "dashboard" as OTab, label: "Dashboard",  icon: <LayoutDashboard className="h-[15px] w-[15px]" /> },
    { id: "credits"   as OTab, label: "My Credits", icon: <Coins className="h-[15px] w-[15px]" /> },
    { id: "settings"  as OTab, label: "Settings",   icon: <Settings className="h-[15px] w-[15px]" /> },
  ];
  const fmtUgx = (n: number) => `${n.toLocaleString()} UGX`;
  const pendingPkgIds   = new Set(creditReqs.filter(r => r.status === "pending").map(r => r.package_id).filter(Boolean) as string[]);
  const pendingPkgNames = new Set(creditReqs.filter(r => r.status === "pending").map(r => r.package_name));
  
  if (isOwn && !ownerReqLoaded) {
    loadOwnerRequests();
  }

  if (!profile) return <RouteNotFoundCard title="Profile not found" message="This user profile may have been removed." />;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg,#f47b16 0%,#f47b16 38%,#ffffff 38%)" }}>

        {/* HEADER / BANNER */}
        <div className="relative group overflow-hidden" style={{ paddingBottom: "140px", background: sp?.cover_url ? `url(${sp.cover_url}) center/cover no-repeat` : "linear-gradient(135deg,#f47b16 0%,#e06210 100%)" }}>
          {!sp?.cover_url && (
            <>
              <div className="absolute top-0 right-0 h-44 w-44 rounded-full opacity-20 pointer-events-none" style={{ background: "radial-gradient(circle,#fff 0%,transparent 70%)", transform: "translate(30%,-30%)" }} />
              <div className="absolute top-10 right-20 h-[72px] w-[72px] rounded-full opacity-10 pointer-events-none" style={{ background: "radial-gradient(circle,#fff 0%,transparent 70%)" }} />
            </>
          )}
          {/* Back Button */}
          <button 
            onClick={() => window.history.back()}
            className="absolute left-4 top-4 flex aspect-square h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/40"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          {/* Cover Photo Upload — top right */}
          {isOwn && isProvider && (
            <div className="absolute top-4 right-4 z-10">
              <label className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition shadow-sm" title="Change cover photo">
                {uploadingCover ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Camera className="h-4 w-4" />}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingCover}
                  onChange={(e) => uploadCover(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          )}
        </div>

        {/* WHITE BODY â€” rounded top, full width, no floating shadow */}
        <div className="relative bg-white" style={{ borderRadius: "36px 36px 0 0", marginTop: "-36px" }}>

          {/* Avatar overlapping the orange-white boundary */}
          <div className="flex justify-center">
            <div className="relative" style={{ marginTop: "-50px" }}>
              <div className="rounded-full overflow-hidden bg-white" style={{ width: 120, height: 120, border: "5px solid #fff", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
                <Avatar name={profile.full_name} url={profile.avatar_url} size={120} />
              </div>
              {isOwn && (
                <label className="absolute bottom-1 right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-[3px] border-white shadow-lg" style={{ background: "#f47b16" }}>
                  {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Camera className="h-4 w-4 text-white" />}
                  <input type="file" accept="image/*" className="hidden" disabled={ownerBusy || uploadingAvatar}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f && user) {
                      setUploadingAvatar(true);
                      uploadMedia(user.id, f, "avatars")
                        .then(url => saveOwnerProfile({ avatar_url: url }))
                        .catch(err => toast.error(err.message))
                        .finally(() => setUploadingAvatar(false));
                    }
                  }} />
                </label>
              )}
            </div>
          </div>

          {/* Name + Location */}
          <div className="mt-3 text-center px-6">
            <h1 className="text-[22px] font-extrabold" style={{ color: "#1a2b4b" }}>
              {profile.full_name?.trim() || sp?.business_name || (user?.id === profile.id ? (user?.user_metadata?.full_name || user?.user_metadata?.name) : null) || "Anonymous User"}
            </h1>
            {(profile.town || profile.district) && (
              <p className="mt-1 flex items-center justify-center gap-1 text-[13px]" style={{ color: "#9ca3af" }}>
                <MapPin className="h-3.5 w-3.5" style={{ color: "#f47b16" }} />
                {[profile.district, profile.town].filter(Boolean).join(" | ")}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-5 flex gap-3 px-6 max-w-sm mx-auto">
            {isOwn ? (
              <button onClick={() => setEditOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 rounded-full py-3 text-[13px] font-bold transition hover:opacity-80"
                style={{ border: "2.5px solid #1a2b4b", color: "#1a2b4b", background: "#fff" }}>
                <Pencil className="h-4 w-4" /> Edit
              </button>
            ) : (
               <button onClick={() => setContactModalOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 rounded-full py-3 text-[13px] font-bold text-white transition hover:brightness-110"
                style={{ background: "#1a2b4b" }}>
                <MessageSquare className="h-4 w-4" /> Message
              </button>
            )}
            
            <button onClick={share}
              className="flex-1 flex items-center justify-center gap-2 rounded-full py-3 text-[13px] font-bold text-white transition hover:brightness-110"
              style={{ background: "#f47b16", boxShadow: "0 4px 14px rgba(244,123,22,0.4)" }}>
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>

          {/* Stats */}
          <div className="mt-5 mx-6 flex items-center justify-around border-t pt-4 pb-1" style={{ borderColor: "#f3f4f6" }}>
            <div className="text-center">
              <p className="text-[20px] font-extrabold" style={{ color: "#1a2b4b" }}>{services.length}</p>
              <p className="text-[11px] mt-0.5" style={{ color: "#9ca3af" }}>Services</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="h-5 w-5" style={{ fill: "#f47b16", color: "#f47b16" }} />
              <span className="text-[20px] font-extrabold" style={{ color: "#1a2b4b" }}>{avgRating > 0 ? avgRating.toFixed(1) : "\u2014"}</span>
            </div>
            <div className="text-center">
              <p className="text-[20px] font-extrabold" style={{ color: "#1a2b4b" }}>{isOwn ? ownerCounts.completed : jobsDone}</p>
              <p className="text-[11px] mt-0.5" style={{ color: "#9ca3af" }}>Jobs done</p>
            </div>
          </div>

          {isOwn ? (
          <>
            {/* Tabs */}
            <div className="mt-4 flex" style={{ borderBottom: "2px solid #f3f4f6" }}>
            {ownerTabs.map(t => (
              <button key={t.id}
                onClick={() => {
                  setOwnerTab(t.id);
                  if (t.id === "credits") { loadOwnerPackages(); loadOwnerCredits(); }
                  if (t.id === "settings") setOwnerFullName(profile.full_name);
                }}
                className="relative flex flex-1 items-center justify-center gap-1.5 py-3.5 text-[12px] font-semibold transition-colors"
                style={{ color: ownerTab === t.id ? "#f47b16" : "#9ca3af" }}
              >
                {t.icon}<span>{t.label}</span>
                {ownerTab === t.id && <span className="absolute bottom-0 left-4 right-4 rounded-full" style={{ height: 2.5, background: "#f47b16" }} />}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="px-4 pt-4">

            {ownerTab === "dashboard" && (
              <div className="space-y-4 pb-28">
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { icon: <Briefcase className="h-5 w-5" />,     label: "Services Listed",  value: services.length,       bg: "#eff6ff", ic: "#3b82f6" },
                    { icon: <ClipboardList className="h-5 w-5" />, label: "Service Requests", value: ownerCounts.requests,  bg: "#fff7ed", ic: "#f47b16" },
                    { icon: <CheckCircle2 className="h-5 w-5" />,  label: "Jobs Done",        value: ownerCounts.completed, bg: "#f0fdf4", ic: "#22c55e" },
                    { icon: <Clock className="h-5 w-5" />,         label: "Pending Jobs",     value: ownerCounts.pending,   bg: "#fefce8", ic: "#eab308" },
                  ] as const).map(c => (
                    <div key={c.label} className="flex items-center gap-3 rounded-2xl bg-white p-4" style={{ border: "1.5px solid #f3f4f6", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                      <div className="flex-shrink-0 rounded-xl p-2.5" style={{ background: c.bg, color: c.ic }}>{c.icon}</div>
                      <div>
                        <p className="text-[22px] font-extrabold leading-none" style={{ color: "#1a2b4b" }}>{c.value}</p>
                        <p className="text-[11px] mt-1" style={{ color: "#9ca3af" }}>{c.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl bg-white p-5" style={{ border: "1.5px solid #f3f4f6", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[14px] font-extrabold" style={{ color: "#1a2b4b" }}>My Services</h2>
                    {ownerPublicProfileId && (
                      <Link to="/profiles/$id" params={{ id: ownerPublicProfileId }} className="flex items-center gap-1 text-xs font-semibold hover:underline" style={{ color: "#f47b16" }}>
                        Manage <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                  {services.length === 0 ? (
                    <div className="rounded-xl p-6 text-center" style={{ border: "1.5px dashed #e5e7eb", background: "#f9fafb" }}>
                      <Briefcase className="mx-auto h-8 w-8 mb-2" style={{ color: "#d1d5db" }} />
                      <p className="text-sm font-semibold" style={{ color: "#1a2b4b" }}>No services yet</p>
                      <Link to="/profiles/new" className="mt-3 inline-block rounded-full px-4 py-1.5 text-xs font-bold text-white" style={{ background: "#f47b16" }}>+ Add Service</Link>
                    </div>
                  ) : services.map(s => (
                    <div key={s.id} className="flex items-center gap-3 rounded-xl p-3 mb-2 transition-colors hover:bg-orange-50" style={{ border: "1.5px solid #f3f4f6" }}>
                      <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#fff7ed" }}>
                        <Briefcase className="h-4 w-4" style={{ color: "#f47b16" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold" style={{ color: "#1a2b4b" }}>{s.title}</p>
                        {s.price_guidance_ugx && <p className="text-xs" style={{ color: "#9ca3af" }}>From UGX {s.price_guidance_ugx.toLocaleString()}</p>}
                      </div>
                      <Link to="/service/$id" params={{ id: s.id }} className="rounded-lg px-4 py-1.5 text-xs font-semibold flex-shrink-0" style={{ background: "#f1f5f9", color: "#1a2b4b", hover: "bg-gray-200" }}>
                        View
                      </Link>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl bg-white p-5" style={{ border: "1.5px solid #f3f4f6", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[14px] font-extrabold" style={{ color: "#1a2b4b" }}>Recent Requests</h2>
                    <Link to="/requests" className="flex items-center gap-1 text-xs font-semibold hover:underline" style={{ color: "#f47b16" }}>View all <ArrowRight className="h-3 w-3" /></Link>
                  </div>
                  {ownerRequests.length === 0 ? (
                    <div className="rounded-xl p-6 text-center" style={{ border: "1.5px dashed #e5e7eb", background: "#f9fafb" }}>
                      <ClipboardList className="mx-auto h-8 w-8 mb-2" style={{ color: "#d1d5db" }} />
                      <p className="text-sm font-semibold" style={{ color: "#1a2b4b" }}>No requests yet</p>
                    </div>
                  ) : ownerRequests.map((r: any) => (
                    <Link key={r.id} to="/requests/$id" params={{ id: r.id }} className="flex items-center justify-between gap-3 rounded-xl p-3 mb-2 transition-colors hover:bg-orange-50" style={{ border: "1.5px solid #f3f4f6" }}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold" style={{ color: "#1a2b4b" }}>{r.service_needed}</p>
                        <p className="truncate text-xs" style={{ color: "#9ca3af" }}>{new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize" style={{ background: "#fff7ed", color: "#f47b16" }}>{r.status?.replace(/_/g," ")}</span>
                        <ChevronRight className="h-4 w-4" style={{ color: "#9ca3af" }} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {ownerTab === "credits" && (
              <div className="space-y-6 pb-10">
                {/* A. Balance hero */}
                <div className="rounded-2xl bg-gradient-to-br from-orange-100/50 via-orange-50/30 to-white border border-orange-200/50 p-5 sm:p-7">
                  <div className="flex items-center gap-2 text-xs font-semibold text-orange-500 uppercase tracking-wide">
                    <Coins className="h-4 w-4" /> Tuungane Credits
                  </div>
                  <h1 className="mt-2 text-4xl sm:text-5xl font-bold leading-none" style={{ color: "#1a2b4b" }}>
                    {(balance ?? 0).toLocaleString()}
                    <span className="ml-2 text-lg sm:text-xl font-semibold text-gray-400">credits</span>
                  </h1>
                  <p className="mt-3 text-sm text-gray-500">
                    Use credits to boost your profile, feature posts, mark requests urgent, and promote your services.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <a href="#packages" className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110" style={{ background: "#f47b16" }}>Buy credits</a>
                    <span className="text-xs text-gray-400">Free to join · Basic use stays free</span>
                  </div>
                </div>

                {/* B. How credits work / not-cash notice */}
                <div className="flex gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
                  <Info className="h-5 w-5 flex-shrink-0" style={{ color: "#1a2b4b" }} />
                  <p>
                    <strong style={{ color: "#1a2b4b" }}>Credits are not cash.</strong> They are used inside Tuungane to boost visibility,
                    feature posts, highlight requests, and promote services. Credits cannot be withdrawn as money.
                  </p>
                </div>

                {/* How buying works */}
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  <h2 className="text-base font-bold" style={{ color: "#1a2b4b" }}>How buying credits works</h2>
                  <ol className="mt-3 space-y-1.5 text-sm text-gray-500 list-decimal pl-5">
                    <li>Choose a credit package</li>
                    <li>Tap <span className="font-semibold" style={{ color: "#1a2b4b" }}>Request purchase</span></li>
                    <li>Follow the payment instructions from Tuungane</li>
                    <li>Admin confirms your payment</li>
                    <li>Your credits are added automatically</li>
                  </ol>
                </div>

                {/* C. Packages */}
                <div id="packages">
                  <h2 className="mb-3 text-xl font-bold" style={{ color: "#1a2b4b" }}>Buy credits</h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {pkgs.map((p) => {
                      const hasPending = pendingPkgIds.has(p.id) || pendingPkgNames.has(p.name);
                      const isSubmitting = creditSubmitting === p.id;
                      return (
                        <div key={p.id} className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-orange-300 hover:shadow-md">
                          <div className="text-xs font-medium text-gray-500">{p.name}</div>
                          <div className="mt-1 flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold leading-none" style={{ color: "#1a2b4b" }}>{p.credits}</span>
                            <span className="text-sm font-medium text-gray-500">credits</span>
                          </div>
                          <div className="mt-1 text-sm font-bold" style={{ color: "#f47b16" }}>{fmtUgx(p.amount_ugx)}</div>
                          <button
                            disabled={isSubmitting || hasPending}
                            onClick={() => requestPurchase(p)}
                            className={`mt-3 w-full rounded-full px-4 py-2 text-sm font-semibold transition ${
                              hasPending
                                ? "bg-orange-100 text-orange-500 cursor-not-allowed"
                                : "text-white disabled:opacity-60"
                            }`}
                            style={{ background: hasPending ? undefined : "#1a2b4b" }}
                          >
                            {hasPending ? "Pending approval" : isSubmitting ? "Submitting…" : "Request purchase"}
                          </button>
                        </div>
                      );
                    })}
                    {pkgs.length === 0 && <div className="col-span-2 rounded-xl p-6 text-center text-sm border-2 border-dashed border-gray-200 text-gray-400">No packages available.</div>}
                  </div>
                </div>

                {/* D. Purchase requests */}
                {creditReqs.length > 0 && (
                  <div>
                    <h2 className="mb-3 text-xl font-bold" style={{ color: "#1a2b4b" }}>Your purchase requests</h2>
                    <div className="space-y-3 sm:hidden">
                      {creditReqs.map((r) => (
                        <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-semibold" style={{ color: "#1a2b4b" }}>{r.package_name}</div>
                            <StatusBadge status={r.status} />
                          </div>
                          <div className="mt-1 text-sm text-gray-500">
                            {r.credits_requested} credits · {fmtUgx(r.amount_ugx)}
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                            <span>Requested {timeAgo(r.created_at)}</span>
                            {r.status === "pending" && (
                              <button onClick={() => cancelRequest(r.id)} className="text-red-500 hover:underline font-medium">Cancel</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="hidden overflow-hidden rounded-xl border border-gray-200 sm:block">
                      <table className="w-full text-sm bg-white">
                        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                          <tr>
                            <th className="px-4 py-2">Package</th>
                            <th className="px-4 py-2">Credits</th>
                            <th className="px-4 py-2">Amount</th>
                            <th className="px-4 py-2">Status</th>
                            <th className="px-4 py-2">When</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {creditReqs.map((r) => (
                            <tr key={r.id} className="border-t border-gray-200">
                              <td className="px-4 py-3 font-medium" style={{ color: "#1a2b4b" }}>{r.package_name}</td>
                              <td className="px-4 py-3">{r.credits_requested}</td>
                              <td className="px-4 py-3">{fmtUgx(r.amount_ugx)}</td>
                              <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{timeAgo(r.created_at)}</td>
                              <td className="px-4 py-3 text-right">
                                {r.status === "pending" && (
                                  <button onClick={() => cancelRequest(r.id)} className="text-xs text-red-500 hover:underline">Cancel</button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* E. Transactions */}
                <div>
                  <h2 className="mb-3 text-xl font-bold" style={{ color: "#1a2b4b" }}>Transaction history</h2>
                  {txs.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">No credit activity yet.</div>
                  ) : (
                    <>
                      <div className="space-y-2 sm:hidden">
                        {txs.map((t) => (
                          <div key={t.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className={`text-base font-bold ${t.amount >= 0 ? "text-green-600" : "text-red-500"}`}>
                                  {t.amount > 0 ? "+" : ""}{t.amount} <span className="text-xs font-medium text-gray-400">credits</span>
                                </div>
                                <div className="mt-0.5 text-sm truncate" style={{ color: "#1a2b4b" }}>{t.reason || t.transaction_type.replace(/_/g, " ")}</div>
                              </div>
                              <div className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(t.created_at)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="hidden overflow-hidden rounded-xl border border-gray-200 sm:block">
                        <table className="w-full text-sm bg-white">
                          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                            <tr><th className="px-4 py-2">Type</th><th className="px-4 py-2">Amount</th><th className="px-4 py-2">Reason</th><th className="px-4 py-2">When</th></tr>
                          </thead>
                          <tbody>
                            {txs.map((t) => (
                              <tr key={t.id} className="border-t border-gray-200">
                                <td className="px-4 py-3 font-medium" style={{ color: "#1a2b4b" }}>{t.transaction_type.replace(/_/g, " ")}</td>
                                <td className={`px-4 py-3 font-semibold ${t.amount >= 0 ? "text-green-600" : "text-red-500"}`}>{t.amount > 0 ? "+" : ""}{t.amount}</td>
                                <td className="px-4 py-3 text-gray-500">{t.reason}</td>
                                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{timeAgo(t.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>

                {/* F. Earn & spend */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <h3 className="text-base font-bold" style={{ color: "#1a2b4b" }}>Earn credits</h3>
                    <ul className="mt-2 space-y-1.5 text-sm text-gray-500">
                      <li>• 10 starter credits when you join</li>
                      <li>• Admin-awarded credits for useful community contributions</li>
                      <li>• Refunds from cancelled boosts where applicable</li>
                    </ul>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <h3 className="text-base font-bold" style={{ color: "#1a2b4b" }}>Spend credits</h3>
                    <ul className="mt-2 space-y-1.5 text-sm text-gray-500">
                      <li>• Boost your provider profile</li>
                      <li>• Feature a service post</li>
                      <li>• Mark a request as urgent</li>
                      <li>• Send a priority response</li>
                      <li>• Feature a business/profile page where allowed</li>
                      <li>• Promote completed-work posts</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {ownerTab === "settings" && (
              <div className="space-y-4 pb-10">
                <div className="rounded-2xl bg-white p-5" style={{ border: "1.5px solid #f3f4f6" }}>
                  <h2 className="text-[14px] font-extrabold mb-4" style={{ color: "#1a2b4b" }}>Profile Information</h2>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold" style={{ color: "#1a2b4b" }}>Display Name</label>
                      <input value={ownerFullName} onChange={e => setOwnerFullName(e.target.value)} className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors" style={{ border: "1.5px solid #e5e7eb", background: "#f9fafb" }} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold" style={{ color: "#1a2b4b" }}>Bio</label>
                      <textarea defaultValue={profile.bio ?? ""} onBlur={e => e.target.value !== (profile.bio ?? "") && saveOwnerProfile({ bio: e.target.value })} rows={3} className="mt-1 w-full resize-none rounded-xl px-3 py-2.5 text-sm outline-none transition-colors" style={{ border: "1.5px solid #e5e7eb", background: "#f9fafb" }} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold" style={{ color: "#1a2b4b" }}>District</label>
                        <input defaultValue={profile.district ?? ""} onBlur={e => e.target.value !== profile.district && saveOwnerProfile({ district: e.target.value })} className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ border: "1.5px solid #e5e7eb", background: "#f9fafb" }} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold" style={{ color: "#1a2b4b" }}>Town</label>
                        <input defaultValue={profile.town ?? ""} onBlur={e => e.target.value !== profile.town && saveOwnerProfile({ town: e.target.value })} className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ border: "1.5px solid #e5e7eb", background: "#f9fafb" }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <label className="flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold hover:border-orange-400 transition-colors" style={{ border: "1.5px solid #e5e7eb", background: "#f9fafb", color: "#1a2b4b" }}>
                        <ImagePlus className="h-4 w-4" />
                        {profile.avatar_url ? "Change Photo" : "Add Photo"}
                        <input type="file" accept="image/*" className="hidden" disabled={ownerBusy || uploadingAvatar}
                          onChange={e => { const f = e.target.files?.[0]; if (f && user) { setUploadingAvatar(true); uploadMedia(user.id, f, "avatars").then(url => saveOwnerProfile({ avatar_url: url })).catch(err => toast.error(err.message)).finally(() => setUploadingAvatar(false)); } }} />
                      </label>
                      {profile.avatar_url && <RemovePhotoConfirm onConfirm={() => saveOwnerProfile({ avatar_url: null })} disabled={ownerBusy} />}
                    </div>
                    <button onClick={async () => { setSavingOwner(true); await saveOwnerProfile({ full_name: ownerFullName }); setSavingOwner(false); }} disabled={savingOwner} className="w-full rounded-full py-3 text-sm font-bold text-white transition disabled:opacity-60" style={{ background: "#f47b16" }}>
                      {savingOwner ? "Saving\u2026" : "Save Changes"}
                    </button>
                  </div>
                </div>
                <div className="rounded-2xl bg-white p-5" style={{ border: "1.5px solid #f3f4f6" }}>
                  <h2 className="text-[14px] font-extrabold mb-3" style={{ color: "#1a2b4b" }}>Account</h2>
                  <div>
                    <div className="flex items-center justify-between px-1 py-3 text-sm" style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <span style={{ color: "#9ca3af" }}>Email</span>
                      <span className="font-semibold truncate ml-4" style={{ color: "#1a2b4b" }}>{user?.email}</span>
                    </div>
                    <Link to="/settings" className="flex items-center justify-between px-1 py-3 text-sm transition hover:opacity-70" style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <span className="font-semibold" style={{ color: "#1a2b4b" }}>Advanced Settings</span>
                      <ChevronRight className="h-4 w-4" style={{ color: "#9ca3af" }} />
                    </Link>
                    <button onClick={() => { signOut(); nav({ to: "/" }); }} className="flex items-center justify-between w-full px-1 py-3 text-sm transition hover:opacity-70" style={{ borderTop: "1px solid #f3f4f6" }}>
                      <span className="font-semibold text-red-500">Sign Out</span>
                      <LogOut className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          </>
        ) : (
          <div className="bg-white px-2 pt-2 pb-16">
            <div className="mt-4 flex px-4" style={{ borderBottom: "2px solid #f3f4f6" }}>
              {visibleTabs.map((t) => {
                const isActive = tab === t.id;
                const className = `relative whitespace-nowrap px-4 py-3 text-[13px] font-bold transition ${isActive ? "text-[#f47b16]" : "text-[#9ca3af] hover:text-[#1a2b4b]"}`;
                if (t.href) {
                  return <Link key={t.id} to={t.href as any} className={className}>{t.label}</Link>;
                }
                return (
                  <button key={t.id} onClick={() => setTab(t.id)} className={className}>
                    {t.label}
                    {isActive && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-[#f47b16]" />}
                  </button>
                );
              })}
            </div>

        <div className="mt-5 space-y-4 pb-10">

          {tab === "timeline" && (
            <>
              {isOwn && isProvider && <PostComposer defaultCategory={sp?.category_slug} onPosted={() => queryClient.invalidateQueries({ queryKey: ["providerAux", id, user?.id] })} />}
              {posts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm">
                  <p className="font-semibold text-navy">
                    {isOwn ? "Share your first update, photo, or recent work to make your profile more attractive." : `${sp?.business_name || profile.full_name} hasn't posted updates yet.`}
                  </p>
                  {!isOwn && <p className="mt-1 text-xs text-muted-foreground">When they share work photos, promotions, or recent activity, it will appear here.</p>}
                </div>
              ) : (
                posts.map((p) => <PostCard key={p.id} post={p} onChanged={() => queryClient.invalidateQueries({ queryKey: ["providerAux", id, user?.id] })} />)
              )}
            </>
          )}

          {tab === "reviews" && (
            <>
              {/* Section 1: Verified Reviews */}
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-base font-bold text-navy">Verified Reviews</h3>
                    <p className="text-xs text-muted-foreground">From completed Tuungane services</p>
                  </div>
                  {avgRating > 0 && (
                    <div className="text-right">
                      <p className="font-display text-2xl font-bold text-navy leading-none">{avgRating.toFixed(1)}</p>
                      <p className="text-[11px] text-muted-foreground">{feedback.length + reviews.length} verified</p>
                    </div>
                  )}
                </div>

                {!isOwn && user && canReview && (
                  <button onClick={() => setRevOpen(true)} className="w-full rounded-2xl border-2 border-dashed border-green/40 bg-green/5 p-3 text-sm font-semibold text-green hover:bg-green/10">+ Write a verified review</button>
                )}

                {feedback.length === 0 && reviews.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm">
                    <p className="font-semibold text-navy">
                      {recs.length > 0 ? "This provider has endorsements, but no verified Tuungane reviews yet." : "No verified reviews yet."}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Reviews will appear here after completed Tuungane services.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {feedback.map((f) => (
                      <div key={f.id} className="rounded-2xl border border-green/30 bg-green/5 p-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={f.profile?.full_name ?? "Member"} url={f.profile?.avatar_url ?? null} size={36} />
                          <div>
                            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-navy">{f.profile?.full_name ?? "Member"} <VerifiedReviewBadge /></p>
                            <p className="text-xs text-muted-foreground">{f.service_provided} · {timeAgo(f.created_at)}</p>
                          </div>
                          <span className="ml-auto text-sm text-orange">{"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}</span>
                        </div>
                        {f.review_text && <p className="mt-3 text-sm text-foreground/90">{f.review_text}</p>}
                      </div>
                    ))}
                    {reviews.map((r) => (
                      <div key={r.id} className="rounded-2xl border border-green/30 bg-green/5 p-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={r.profile?.full_name ?? "Member"} url={r.profile?.avatar_url ?? null} size={36} />
                          <div>
                            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-navy">{r.profile?.full_name ?? "Member"} <VerifiedReviewBadge /></p>
                            <p className="text-xs text-muted-foreground">Booked service · {timeAgo(r.created_at)}</p>
                          </div>
                          <span className="ml-auto text-sm text-orange">{"★".repeat(r.rating || 0)}{"☆".repeat(5 - (r.rating || 0))}</span>
                        </div>
                        {r.text && <p className="mt-3 text-sm text-foreground/90">{r.text}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Section 2: Endorsements */}
              <section className="space-y-3 pt-2">
                <div>
                  <h3 className="font-display text-base font-bold text-navy">Endorsements</h3>
                  <p className="text-xs text-muted-foreground">Lighter social proof from people who know or trust this provider</p>
                </div>

                {!isOwn && user && isProvider && (
                  <button onClick={() => setRecOpen(true)} className="w-full rounded-xl border border-dashed border-border bg-card p-3 text-sm font-medium text-navy hover:border-orange">+ Endorse this provider</button>
                )}

                {recs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm">
                    <p className="font-semibold text-navy">No endorsements yet.</p>
                    <p className="mt-1 text-xs text-muted-foreground">People who know this provider can endorse their work.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recs.map((r) => (
                      <div key={r.id} className="rounded-xl border border-border/70 bg-background p-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={r.profile?.full_name ?? "User"} url={r.profile?.avatar_url ?? null} size={32} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-navy">{r.profile?.full_name ?? "User"}</p>
                            <p className="text-[11px] text-muted-foreground">Endorses for {r.service} Ãƒâ€šÃ‚Â· {timeAgo(r.created_at)}</p>
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-foreground/85">{r.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {tab === "services" && (
            <>
              {isOwn && ownerPublicProfileId && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setSvcDialog({ open: true, mode: "create", initial: { is_primary: services.length === 0 } })}
                    className="inline-flex items-center gap-1 rounded-full bg-orange px-4 py-2 text-xs font-semibold text-orange-foreground hover:brightness-110"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add service
                  </button>
                </div>
              )}
              {isOwn && !ownerPublicProfileId && (
                <div className="rounded-2xl border border-dashed border-border bg-card p-4 text-center text-sm">
                  <p className="font-semibold text-navy">Create your provider profile first</p>
                  <p className="mt-1 text-xs text-muted-foreground">You need a provider profile before you can add service packages.</p>
                  <Link to="/profiles/new" className="mt-2 inline-block rounded-full bg-orange px-4 py-2 text-xs font-semibold text-orange-foreground">List your service</Link>
                </div>
              )}
              {services.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm">
                  <p className="font-semibold text-navy">
                    {isOwn ? "Add your first service so customers know exactly what they can request." : "This provider hasn't added detailed service packages yet."}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isOwn ? "Add service packages with prices and clear descriptions." : "You can still message them or create a service request."}
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {services.map((s) => (
                    <li key={s.id} className={`rounded-2xl border bg-card p-4 ${s.is_primary ? "border-orange/40 ring-1 ring-orange/15" : "border-border"} ${!s.active ? "opacity-70" : ""}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="font-semibold text-navy">{s.title}</p>
                            {s.is_primary && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-orange/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange">
                                <Star className="h-3 w-3 fill-orange" /> Main
                              </span>
                            )}
                            {isOwn && !s.active && (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Hidden</span>
                            )}
                          </div>
                          {s.description && <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/85">{s.description}</p>}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {s.price_type ? (
                              <PriceGuideChip guide={s as unknown as PriceGuide} />
                            ) : s.price_guidance_ugx ? (
                              <span className="inline-flex items-center rounded-full bg-orange/10 px-2 py-0.5 text-[11px] font-semibold text-orange">
                                From UGX {s.price_guidance_ugx.toLocaleString()}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                Negotiable
                              </span>
                            )}
                          </div>
                          {s.price_note && <p className="mt-1 text-[11px] text-muted-foreground">{s.price_note}</p>}
                        </div>
                        {!isOwn && isProvider && (
                          <Link
                            to="/service/$id"
                            params={{ id: s.id }}
                            className="shrink-0 rounded-xl bg-orange px-4 py-2 text-xs font-semibold text-orange-foreground hover:brightness-110"
                          >
                            View
                          </Link>
                        )}
                        {isOwn && (
                          <button
                            onClick={() => setSvcDialog({ open: true, mode: "edit", initial: {
                              id: s.id,
                              title: s.title,
                              description: s.description,
                              active: s.active,
                              is_primary: s.is_primary,
                              price_type: s.price_type,
                              price_fixed_ugx: s.price_fixed_ugx,
                              price_min_ugx: s.price_min_ugx,
                              price_max_ugx: s.price_max_ugx,
                              price_note: s.price_note,
                            } })}
                            aria-label="Edit service"
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-orange/10 hover:text-orange"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {isOwn && (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-2 text-[11px] font-semibold">
                          {!s.is_primary && (
                            <button
                              onClick={async () => {
                                await apiClient.patch(`/services/${s.id}`, { is_primary: true });
                                if (error) toast.error(error.message); else { toast.success(`"${s.title}" is now your main service`); queryClient.invalidateQueries({ queryKey: ["providerAux", id, user?.id] }); }
                              }}
                              className="inline-flex items-center gap-1 rounded-full border border-orange/40 bg-orange/5 px-2.5 py-1 text-orange hover:bg-orange/10"
                            >
                              <Star className="h-3 w-3" /> Set as main
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              await apiClient.patch(`/services/${s.id}`, { active: !s.active });
                              if (error) toast.error(error.message); else { toast.success(s.active ? "Service hidden" : "Service activated"); queryClient.invalidateQueries({ queryKey: ["providerAux", id, user?.id] }); }
                            }}
                            className="rounded-full border border-border bg-card px-2.5 py-1 text-navy hover:border-orange"
                          >
                            {s.active ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm("Are you sure you want to delete this service? This action cannot be undone.")) return;
                              await apiClient.delete(`/services/${s.id}`);
                              if (error) toast.error(error.message); else { toast.success("Service deleted"); queryClient.invalidateQueries({ queryKey: ["providerAux", id, user?.id] }); }
                            }}
                            className="rounded-full border border-destructive/40 bg-card px-2.5 py-1 text-destructive hover:bg-destructive/5"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          
          {tab === "requests" && isOwn && (
            <ProfileRequestsTab userId={id} />
          )}
        </div>


        <RecommendDialog open={recOpen} onClose={() => setRecOpen(false)} providerUserId={id} onPosted={() => queryClient.invalidateQueries({ queryKey: ["providerAux", id, user?.id] })} />
        <ReviewDialog open={revOpen} onClose={() => setRevOpen(false)} providerUserId={id} onPosted={() => queryClient.invalidateQueries({ queryKey: ["providerAux", id, user?.id] })} />
        
        <ClaimProfileDialog serviceProfileUserId={id} open={claimOpen} onClose={() => setClaimOpen(false)} onSubmitted={() => router.invalidate()} />
        {isOwn && ownerPublicProfileId && (
          <ManageServiceDialog
            open={svcDialog.open}
            onClose={() => setSvcDialog((s) => ({ ...s, open: false }))}
            mode={svcDialog.mode}
            profileId={ownerPublicProfileId}
            initialData={svcDialog.initial as any}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ["providerAux", id, user?.id] })}
          />
        )}
        <RequestServiceDialog open={requestOpen} onClose={() => setRequestOpen(false)} providerId={id} providerName={sp?.business_name || profile.full_name} defaultCategorySlug={sp?.category_slug} defaultSubcategory={sp?.subcategory} onSubmitted={() => { queryClient.invalidateQueries({ queryKey: ["providerAux", id, user?.id] }); gate.refresh(); }} />
        <ContactProviderModal open={contactModalOpen} onClose={() => setContactModalOpen(false)} providerName={sp?.business_name || profile.full_name} onRequestService={() => setRequestOpen(true)} />
        {isOwn && (
          <EditProfileDialog
            open={editOpen}
            onClose={() => setEditOpen(false)}
            userId={id}
            hasServiceProfile={!!sp}
            initial={{
              full_name: profile.full_name ?? "",
              bio: profile.bio ?? "",
              town: profile.town ?? "",
              district: profile.district ?? "",
              business_name: sp?.business_name ?? "",
              sp_bio: sp?.bio ?? "",
              phone: sp?.phone ?? "",
              whatsapp: sp?.whatsapp ?? "",
              email: sp?.email ?? "",
              years_experience: sp?.years_experience ?? 0,
              availability: sp?.availability ?? "available",
              areas_served: sp?.areas_served ?? [],
              category_slug: sp?.category_slug ?? "",
              subcategory: sp?.subcategory ?? "",
              price_type: (sp?.price_type ?? null) as PriceType | null,
              price_fixed_ugx: sp?.price_fixed_ugx ?? null,
              price_min_ugx: sp?.price_min_ugx ?? null,
              price_max_ugx: sp?.price_max_ugx ?? null,
              price_note: sp?.price_note ?? "",
            }}
            onSaved={() => window.location.reload()}
          />
        )}
      </div>
      )}


      {!isOwn && isProvider && (
        <MobileActionBar className="bottom-0">
          <button 
            onClick={() => requireAuth(() => setRequestOpen(true), { title: "Sign in to request this service", message: "Create a free Tuungane account to send a request to this provider.", redirect: `/u/${id}` })} 
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-orange px-4 py-3 text-sm font-bold text-orange-foreground shadow-sm hover:brightness-110"
          >
            <ClipboardList className="h-5 w-5" /> Request service
          </button>
          <button onClick={handleCall} disabled={calling} aria-label="Call provider" className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-border bg-card text-navy shadow-sm hover:border-orange disabled:opacity-50">
            {calling ? <Loader2 className="h-5 w-5 animate-spin" /> : <Phone className="h-5 w-5" />}
          </button>
        </MobileActionBar>
      )}
        </div>
      </div>
  );
}

function ProfileBoostBadges({ providerId }: { providerId: string }) {
  const { boosts } = useActiveBoosts("provider_profile", providerId);
  return <>{boosts.map((b) => <BoostBadge key={b.id} type={b.boost_type} />)}</>;
}

function TrustBadgeInline({ userId }: { userId: string }) {
  const { level } = useTrustBadge("service_profile", userId);
  if (!level) return null;
  return <TrustBadge level={level} />;
}

function Row({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/50 py-2 last:border-0">
      <dt className="text-muted-foreground flex items-center shrink-0">{label}</dt>
      <dd className="text-right font-medium capitalize text-navy">{value}</dd>
    </div>
  );
}

function ProfileRequestsTab({ userId }: { userId: string }) {
  const { data: requests, refetch } = useQuery({
    queryKey: ["profileRequests", userId],
    queryFn: async () => {
      const { data } = await apiClient<{ data: RequestWithParty[] }>(`/requests/me?role=customer`);
      return data || [];
    },
  });

  const updateStatus = async (id: string, status: any) => {
    try {
      await apiClient(`/requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      import("sonner").then(m => m.toast.success(`Marked ${status.replace("_", " ")}`));
      refetch();
    } catch (err) {
      import("sonner").then(m => m.toast.error(err instanceof Error ? err.message : "Failed"));
    }
  };

  if (!requests) return <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">Loading requests...</div>;
  if (requests.length === 0) return <div className="p-8 text-center text-sm text-muted-foreground bg-card rounded-2xl border border-dashed border-border">You haven't sent any requests yet.</div>;

  return (
    <div className="space-y-3">
      {requests.map(r => (
        <ServiceRequestCard
          key={r.id}
          r={r}
          viewerRole="customer"
          onStatus={(s) => updateStatus(r.id, s)}
          onFeedback={() => {}} 
          onDispute={() => {}}
          onReport={() => {}}
        />
      ))}
    </div>
  );
}