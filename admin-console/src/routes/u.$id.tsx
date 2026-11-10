import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { timeAgo } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/u/$id")({
  component: UserProfileInspector,
});

type ManageableRole = "admin" | "moderator" | "finance_admin";

function UserProfileInspector() {
  const { id } = Route.useParams();
  const { isAdmin, isModerator, user: me } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [serviceProfile, setServiceProfile] = useState<any>(null);
  const [roles, setRoles] = useState<ManageableRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [{ data: prof }, { data: sp }, { data: roleRows }] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
          supabase.from("service_profiles").select("*").eq("user_id", id).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", id),
        ]);

        if (mounted) {
          setProfile(prof || null);
          setServiceProfile(sp || null);
          setRoles((roleRows || []).map((r: any) => r.role as ManageableRole));
        }
      } catch (err) {
        console.error("Error loading user profile:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadData();
    return () => { mounted = false; };
  }, [id]);

  const toggleRole = async (role: ManageableRole, has: boolean) => {
    if (!isAdmin) return;
    setBusy(`role-${role}`);
    try {
      await apiClient.post(`/admin/users/${id}/role/${role}`, { has });
      setRoles((prev) => (!has ? [...prev, role] : prev.filter((r) => r !== role)));
      toast.success(`${!has ? "Granted" : "Revoked"} ${role}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update role");
    } finally {
      setBusy(null);
    }
  };

  const toggleSuspendProvider = async () => {
    if (!serviceProfile) return;
    setBusy("suspend");
    try {
      const next = !serviceProfile.suspended;
      await apiClient.put(`/admin/providers/${id}/status`, { suspended: next });
      setServiceProfile((prev: any) => ({ ...prev, suspended: next }));
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
      await apiClient.put(`/admin/providers/${id}/status`, { verified: level });
      setServiceProfile((prev: any) => ({ ...prev, verified: level }));
      toast.success(`Verification set to ${level}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to set verification");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-muted-foreground">
        Loading user profile details…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-foreground">User Not Found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No profile found matching user ID: <code className="font-mono text-xs">{id}</code>
        </p>
        <div className="mt-6">
          <Link to="/admin" className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white">
            Return to Admin Console
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      {/* Back button & top bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
        >
          ← Back to Admin Console
        </Link>
        <span className="text-xs text-muted-foreground">User ID: <code className="font-mono">{id}</code></span>
      </div>

      {/* Main Profile Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-navy text-xl font-bold text-white shadow-inner">
              {profile.full_name ? profile.full_name[0].toUpperCase() : "U"}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">{profile.full_name || "Unnamed User"}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Joined {profile.created_at ? timeAgo(profile.created_at) : "recently"} · {[profile.district, profile.town].filter(Boolean).join(", ") || "Location unlisted"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {roles.map((r) => (
              <span key={r} className="rounded-full bg-navy px-3 py-1 text-xs font-semibold text-white">
                {r.replace("_", " ")}
              </span>
            ))}
            {roles.length === 0 && (
              <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                Standard User
              </span>
            )}
          </div>
        </div>

        {/* Roles Management */}
        <div className="mt-6 border-t border-border pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Manage Roles</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["admin", "moderator", "finance_admin"] as ManageableRole[]).map((role) => {
              const has = roles.includes(role);
              const isSelf = me?.id === id && role === "admin";
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
      </div>

      {/* Provider Card if registered */}
      {serviceProfile && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-navy">Service Provider</span>
              <h2 className="text-xl font-bold text-foreground mt-0.5">
                {serviceProfile.business_name || profile.full_name}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {serviceProfile.subcategory || serviceProfile.category_slug}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                serviceProfile.verified === "featured"
                  ? "bg-amber-100 text-amber-800"
                  : serviceProfile.verified === "verified"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-muted text-muted-foreground"
              }`}>
                {serviceProfile.verified}
              </span>
              {serviceProfile.suspended && (
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">
                  Suspended
                </span>
              )}
            </div>
          </div>

          {serviceProfile.bio && (
            <div>
              <span className="text-xs font-bold text-muted-foreground">About Provider</span>
              <p className="mt-1 text-sm text-foreground bg-muted/20 p-3 rounded-xl border border-border">
                {serviceProfile.bio}
              </p>
            </div>
          )}

          {/* Verification & Status Controls */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            <button
              onClick={() => toggleVerifyProvider(serviceProfile.verified === "verified" ? "none" : "verified")}
              disabled={busy === "verify"}
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition"
            >
              {serviceProfile.verified === "verified" ? "Revoke Verification" : "Verify Provider"}
            </button>
            <button
              onClick={() => toggleVerifyProvider(serviceProfile.verified === "featured" ? "verified" : "featured")}
              disabled={busy === "verify"}
              className="rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition"
            >
              {serviceProfile.verified === "featured" ? "Remove Featured" : "Feature on Directory"}
            </button>
            <button
              onClick={toggleSuspendProvider}
              disabled={busy === "suspend"}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                serviceProfile.suspended
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-destructive text-white hover:bg-destructive/90"
              }`}
            >
              {serviceProfile.suspended ? "Reinstate Listing" : "Suspend Listing"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
