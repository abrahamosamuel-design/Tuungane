import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { apiClient } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export type ManageableRole = "admin" | "moderator" | "finance_admin";

export interface AdminUserModalProps {
  userId: string | null;
  contact?: { email: string | null; phone: string | null };
  onClose: () => void;
  onRoleChanged?: (userId: string, role: ManageableRole, active: boolean) => void;
  onStatusChanged?: () => void;
}

export function AdminUserModal({ userId, contact, onClose, onRoleChanged, onStatusChanged }: AdminUserModalProps) {
  const { isAdmin, user: me } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [serviceProfile, setServiceProfile] = useState<any>(null);
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

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;

    async function loadDetails() {
      setLoading(true);
      try {
        // 1. Get profile from Supabase
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId!)
          .maybeSingle();

        // 2. Get service profile if any
        const { data: sp } = await supabase
          .from("service_profiles")
          .select("*")
          .eq("user_id", userId!)
          .maybeSingle();

        // 3. Get roles
        const { data: roleRows } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId!);

        if (isMounted) {
          setProfile(prof || null);
          setServiceProfile(sp || null);
          setRoles((roleRows || []).map((r: any) => r.role as ManageableRole));
        }
      } catch (err) {
        console.error("Failed to load user details", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadDetails();
    return () => { isMounted = false; };
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

  const toggleSuspendProvider = async () => {
    if (!serviceProfile) return;
    setBusy("suspend");
    try {
      const next = !serviceProfile.suspended;
      await apiClient.put(`/admin/providers/${userId}/status`, { suspended: next });
      setServiceProfile((prev: any) => ({ ...prev, suspended: next }));
      onStatusChanged?.();
      toast.success(next ? "Provider suspended" : "Provider reinstated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setBusy(null);
    }
  };

  const toggleVerifyProvider = async (level: "verified" | "featured" | "none") => {
    if (!serviceProfile) return;
    setBusy("verify");
    try {
      await apiClient.put(`/admin/providers/${userId}/status`, { verified: level });
      setServiceProfile((prev: any) => ({ ...prev, verified: level }));
      onStatusChanged?.();
      toast.success(`Verification set to ${level}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to set verification");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-white font-bold text-sm">
              {profile?.full_name ? profile.full_name[0].toUpperCase() : "U"}
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">
                {profile?.full_name || "User Details"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Account created {profile?.created_at ? timeAgo(profile.created_at) : "recently"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading user information…
            </div>
          ) : (
            <>
              {/* Account Overview Cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">User ID</span>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <code className="text-xs font-mono text-foreground truncate">{userId}</code>
                    <button
                      onClick={copyId}
                      className="rounded border border-border bg-background px-2 py-0.5 text-[10px] font-semibold hover:border-navy transition"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Location</span>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {[profile?.district, profile?.town].filter(Boolean).join(", ") || "Not specified"}
                  </p>
                </div>

                {(userContact.email || userContact.phone) && (
                  <div className="rounded-xl border border-border bg-muted/20 p-4 sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contact Info</span>
                    <div className="mt-1 flex flex-wrap gap-4 text-xs">
                      {userContact.email && (
                        <div>
                          <span className="text-muted-foreground">Email: </span>
                          <a href={`mailto:${userContact.email}`} className="font-semibold text-navy hover:text-orange underline">
                            {userContact.email}
                          </a>
                        </div>
                      )}
                      {userContact.phone && (
                        <div>
                          <span className="text-muted-foreground">Phone: </span>
                          <a href={`tel:${userContact.phone}`} className="font-semibold text-navy hover:text-orange underline">
                            {userContact.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Roles Section */}
              <div className="rounded-xl border border-border p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  System Roles & Permissions
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
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
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                          has
                            ? "bg-navy text-white shadow-sm"
                            : "border border-border bg-background text-muted-foreground hover:border-navy"
                        }`}
                      >
                        {has ? `✓ ${role.replace("_", " ")}` : `+ ${role.replace("_", " ")}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Service Provider Profile Section */}
              {serviceProfile ? (
                <div className="rounded-xl border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-navy">
                        Service Provider Profile
                      </span>
                      <h3 className="font-semibold text-foreground mt-0.5">
                        {serviceProfile.business_name || profile?.full_name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        serviceProfile.verified === "featured"
                          ? "bg-amber-100 text-amber-800"
                          : serviceProfile.verified === "verified"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {serviceProfile.verified}
                      </span>
                      {serviceProfile.suspended && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800">
                          Suspended
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {serviceProfile.subcategory || serviceProfile.category_slug || "General Services"}
                  </p>

                  {serviceProfile.bio && (
                    <p className="text-xs text-foreground bg-muted/30 p-2.5 rounded-lg border border-border">
                      {serviceProfile.bio}
                    </p>
                  )}

                  {/* Provider Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    <button
                      onClick={() => toggleVerifyProvider(serviceProfile.verified === "verified" ? "none" : "verified")}
                      disabled={busy === "verify"}
                      className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition"
                    >
                      {serviceProfile.verified === "verified" ? "Revoke Verification" : "Verify Provider"}
                    </button>
                    <button
                      onClick={() => toggleVerifyProvider(serviceProfile.verified === "featured" ? "verified" : "featured")}
                      disabled={busy === "verify"}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition"
                    >
                      {serviceProfile.verified === "featured" ? "Remove Featured" : "Feature on Directory"}
                    </button>
                    <button
                      onClick={toggleSuspendProvider}
                      disabled={busy === "suspend"}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        serviceProfile.suspended
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-destructive text-white hover:bg-destructive/90"
                      }`}
                    >
                      {serviceProfile.suspended ? "Reinstate Listing" : "Suspend Listing"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  This user has not registered as a service provider yet.
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-6 py-3">
          <Link
            to="/u/$id"
            params={{ id: userId }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-navy hover:text-orange hover:underline transition"
          >
            Open as separate page ↗
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy/90 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
