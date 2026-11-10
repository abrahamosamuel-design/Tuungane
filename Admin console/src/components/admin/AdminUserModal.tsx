import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { apiClient } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Coins,
  Briefcase,
  Copy,
  ExternalLink,
  Ban,
  RotateCcw,
} from "lucide-react";

export type ManageableRole = "admin" | "moderator" | "finance_admin";

export interface AdminUserModalProps {
  userId: string | null;
  contact?: { email: string | null; phone: string | null };
  onClose: () => void;
  onRoleChanged?: (userId: string, role: ManageableRole, active: boolean) => void;
  onStatusChanged?: () => void;
}

export function AdminUserModal({
  userId,
  contact,
  onClose,
  onRoleChanged,
  onStatusChanged,
}: AdminUserModalProps) {
  const { isAdmin, user: me } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [serviceProfile, setServiceProfile] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [credits, setCredits] = useState<{
    balance: number;
    bought: number;
    ugxSpent: number;
    purchases: any[];
  }>({ balance: 0, bought: 0, ugxSpent: 0, purchases: [] });
  const [userContact, setUserContact] = useState<{ email: string | null; phone: string | null }>(
    contact || { email: null, phone: null }
  );
  const [roles, setRoles] = useState<ManageableRole[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (contact) {
      setUserContact(contact);
    }
  }, [contact]);

  const loadDetails = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data } = await apiClient<{ data: any }>(`/admin/users/${userId}/details`);
      const d = data.data;
      setProfile(
        d.profile
          ? {
              ...d.profile,
              suspended: Boolean(d.suspended ?? d.profile.suspended),
              verified: d.verified ?? d.profile.verified ?? "none",
            }
          : null
      );
      setServiceProfile(d.serviceProfile || null);
      setServices(d.services || []);
      setRoles((d.roles || []) as ManageableRole[]);
      if (d.contact) setUserContact(d.contact);
      if (d.credits) {
        setCredits({
          balance: Number(d.credits.balance ?? 0),
          bought: Number(d.credits.bought ?? d.credits.credits_bought ?? 0),
          ugxSpent: Number(d.credits.ugxSpent ?? d.credits.ugx_spent ?? 0),
          purchases: d.credits.purchases || [],
        });
      }
    } catch (err) {
      console.error("Failed to load user details", err);
      toast.error("Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetails();
  }, [userId]);

  if (!userId) return null;

  const toggleRole = async (role: ManageableRole, has: boolean) => {
    if (!isAdmin) return;
    setBusy(`role-${role}`);
    try {
      await apiClient.post(`/admin/users/${userId}/role/${role}`, { has });
      setRoles((prev) => (!has ? [...prev, role] : prev.filter((r) => r !== role)));
      onRoleChanged?.(userId, role, !has);
      toast.success(`${!has ? "Granted" : "Revoked"} ${role}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update role");
    } finally {
      setBusy(null);
    }
  };

  const copyId = () => {
    void navigator.clipboard.writeText(userId);
    toast.success("User ID copied to clipboard");
  };

  const isSuspended = Boolean(profile?.suspended || serviceProfile?.suspended);
  const currentVerified: "verified" | "featured" | "none" =
    profile?.verified === "featured" || serviceProfile?.verified === "featured"
      ? "featured"
      : profile?.verified === "verified" || serviceProfile?.verified === "verified"
      ? "verified"
      : "none";

  const toggleSuspendUser = async () => {
    setBusy("suspend");
    try {
      const next = !isSuspended;
      await apiClient.put(`/admin/users/${userId}/status`, { suspended: next });
      setProfile((prev: any) => (prev ? { ...prev, suspended: next } : prev));
      setServiceProfile((prev: any) => (prev ? { ...prev, suspended: next } : prev));
      onStatusChanged?.();
      toast.success(next ? "User account suspended" : "User account unsuspended");
    } catch (err: any) {
      toast.error(err.message || "Failed to update suspension status");
    } finally {
      setBusy(null);
    }
  };

  const setVerificationLevel = async (level: "verified" | "featured" | "none") => {
    setBusy("verify");
    try {
      await apiClient.put(`/admin/users/${userId}/status`, { verified: level });
      setProfile((prev: any) => (prev ? { ...prev, verified: level, is_provider: level !== "none" ? true : prev.is_provider } : prev));
      setServiceProfile((prev: any) => (prev ? { ...prev, verified: level } : prev));
      onStatusChanged?.();
      toast.success(
        level === "verified"
          ? "Account verified — Verified Badge awarded!"
          : level === "featured"
          ? "Account featured — Featured Badge awarded!"
          : "Verification badge removed"
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update verification");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name || "User"}
                className="h-11 w-11 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0B192C] text-white font-bold text-sm">
                {profile?.full_name ? profile.full_name[0].toUpperCase() : "U"}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg font-bold text-[#0B192C]">
                  {profile?.full_name || "User Details"}
                </h2>
                {currentVerified === "verified" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                    <CheckCircle2 className="h-3 w-3" /> VERIFIED BADGE
                  </span>
                )}
                {currentVerified === "featured" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800">
                    <Sparkles className="h-3 w-3" /> FEATURED BADGE
                  </span>
                )}
                {isSuspended && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-extrabold text-red-700">
                    <ShieldAlert className="h-3 w-3" /> SUSPENDED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Joined {profile?.created_at ? timeAgo(profile.created_at) : "recently"}
                {profile?.is_provider || services.length > 0 ? " · Service Provider" : " · Customer Account"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Loading user information…
            </div>
          ) : (
            <>
              {/* Account Actions: Verify Badge & Suspend/Unsuspend */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#0B192C]">
                      Account Status & Verification Badge
                    </p>
                    <p className="text-xs text-slate-500">
                      Verify provider accounts to award a badge on their profile & services, or suspend/unsuspend this user.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={() =>
                      setVerificationLevel(currentVerified === "verified" ? "none" : "verified")
                    }
                    disabled={busy === "verify"}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                      currentVerified === "verified"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {currentVerified === "verified" ? "Verified (Remove Badge)" : "Verify & Award Badge"}
                  </button>

                  <button
                    onClick={() =>
                      setVerificationLevel(currentVerified === "featured" ? "verified" : "featured")
                    }
                    disabled={busy === "verify"}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                      currentVerified === "featured"
                        ? "bg-amber-500 text-white shadow-xs"
                        : "border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                    }`}
                  >
                    <Sparkles className="h-4 w-4" />
                    {currentVerified === "featured" ? "Featured (Switch to Verified)" : "Feature Provider"}
                  </button>

                  <button
                    onClick={toggleSuspendUser}
                    disabled={busy === "suspend" || me?.id === userId}
                    className={`ml-auto inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer disabled:opacity-50 ${
                      isSuspended
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-red-600 text-white hover:bg-red-700"
                    }`}
                  >
                    {isSuspended ? (
                      <>
                        <RotateCcw className="h-3.5 w-3.5" /> Unsuspend Account
                      </>
                    ) : (
                      <>
                        <Ban className="h-3.5 w-3.5" /> Suspend Account
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Contact & Location Info */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    User ID
                  </span>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <code className="text-xs font-mono text-slate-700 truncate">{userId}</code>
                    <button
                      onClick={copyId}
                      className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold hover:border-[#0B192C] transition cursor-pointer"
                    >
                      <Copy className="h-2.5 w-2.5" /> Copy
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Location
                  </span>
                  <p className="mt-1 text-xs font-bold text-[#0B192C]">
                    {[profile?.district, profile?.town].filter(Boolean).join(", ") || "Not specified"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Contact Details
                  </span>
                  <div className="mt-1 flex flex-wrap gap-6 text-xs">
                    <div>
                      <span className="text-slate-400">Email: </span>
                      {userContact.email ? (
                        <a
                          href={`mailto:${userContact.email}`}
                          className="font-semibold text-[#0B192C] hover:text-[#f47b16] underline"
                        >
                          {userContact.email}
                        </a>
                      ) : (
                        <span className="text-slate-400">Not available</span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400">Phone: </span>
                      {userContact.phone ? (
                        <a
                          href={`tel:${userContact.phone}`}
                          className="font-semibold text-[#0B192C] hover:text-[#f47b16] underline"
                        >
                          {userContact.phone}
                        </a>
                      ) : (
                        <span className="text-slate-400">Not available</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Credits & Wallet Summary for this Account */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0B192C]">
                    <Coins className="h-4 w-4 text-[#f47b16]" /> Account Credit Wallet & Purchases
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-orange-50/70 border border-orange-100 p-3">
                    <p className="text-lg font-extrabold text-[#f47b16]">{credits.balance} cr</p>
                    <p className="text-[11px] text-slate-500">Current Balance</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-3">
                    <p className="text-lg font-extrabold text-emerald-700">{credits.bought} cr</p>
                    <p className="text-[11px] text-slate-500">Credits Bought</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3">
                    <p className="text-lg font-extrabold text-[#0B192C]">
                      UGX {(credits.ugxSpent || 0).toLocaleString()}
                    </p>
                    <p className="text-[11px] text-slate-500">Total UGX Paid</p>
                  </div>
                </div>
              </div>

              {/* Posted Services Section */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0B192C]">
                    <Briefcase className="h-4 w-4 text-blue-600" /> Services Posted ({services.length})
                  </span>
                </div>
                {services.length === 0 ? (
                  <p className="text-xs text-slate-400">No services posted by this account yet.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {services.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-[#0B192C] truncate">{s.title}</p>
                          <p className="text-[11px] text-slate-500">
                            {s.price_fixed_ugx
                              ? `UGX ${Number(s.price_fixed_ugx).toLocaleString()}`
                              : s.price_guidance_ugx
                              ? `From UGX ${Number(s.price_guidance_ugx).toLocaleString()}`
                              : "Negotiable"}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            s.active
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {s.active ? "Active" : "Hidden"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* System Roles Section */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  System Roles & Permissions
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click a role to grant or revoke administrative privileges for this account.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["admin", "moderator", "finance_admin"] as ManageableRole[]).map((role) => {
                    const has = roles.includes(role);
                    const isSelf = me?.id === userId && role === "admin";
                    return (
                      <button
                        key={role}
                        onClick={() => toggleRole(role, has)}
                        disabled={!isAdmin || isSelf || busy === `role-${role}`}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer disabled:opacity-50 ${
                          has
                            ? "bg-[#0B192C] text-white shadow-xs"
                            : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-[#0B192C]"
                        }`}
                      >
                        {has ? `✓ ${role.replace("_", " ")}` : `+ ${role.replace("_", " ")}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
          <Link
            to="/u/$id"
            params={{ id: userId }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B192C] hover:text-[#f47b16] hover:underline transition"
          >
            View Public Profile <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={onClose}
            className="rounded-xl bg-[#0B192C] px-4 py-2 text-xs font-bold text-white hover:bg-[#1E3A8A] transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
