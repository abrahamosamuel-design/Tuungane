import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { TrustBadge, type TrustLevel } from "./TrustBadge";
import { NextStepsCard } from "./NextStepsCard";
import { RequestVerificationDialog } from "./RequestVerificationDialog";

type Row = {
  kind: "service_profile" | "business_page";
  id: string;
  name: string;
  level: TrustLevel;
  has_pending: boolean;
  requested_type: "verified_provider" | "verified_business" | "verified_organization";
};

export function MyTrustStatusCard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState<Row | null>(null);

  const load = async () => {
    if (!user) return;
    const [sp, bp, ts, pvr] = await Promise.all([
      supabase.from("service_profiles").select("user_id,business_name,subcategory").eq("user_id", user.id),
      supabase.from("business_pages").select("id,name,org_type").eq("owner_id", user.id),
      supabase.from("profile_trust_status").select("profile_kind,profile_id,manual_level,auto_level").eq("owner_user_id", user.id),
      supabase.from("profile_verification_requests").select("profile_kind,profile_id,status").eq("owner_user_id", user.id).in("status", ["pending", "more_info"]),
    ]);
    const statusMap = new Map<string, TrustLevel>();
    for (const r of (ts.data ?? []) as Array<{ profile_kind: string; profile_id: string; manual_level: TrustLevel | null; auto_level: TrustLevel }>) {
      statusMap.set(`${r.profile_kind}:${r.profile_id}`, (r.manual_level ?? r.auto_level) as TrustLevel);
    }
    const pending = new Set<string>();
    for (const r of (pvr.data ?? []) as Array<{ profile_kind: string; profile_id: string }>) {
      pending.add(`${r.profile_kind}:${r.profile_id}`);
    }
    const out: Row[] = [];
    for (const s of (sp.data ?? []) as Array<{ user_id: string; business_name: string | null; subcategory: string }>) {
      const key = `service_profile:${s.user_id}`;
      out.push({
        kind: "service_profile",
        id: s.user_id,
        name: s.business_name || s.subcategory || "Provider profile",
        level: statusMap.get(key) ?? "new",
        has_pending: pending.has(key),
        requested_type: "verified_provider",
      });
    }
    for (const b of (bp.data ?? []) as Array<{ id: string; name: string; org_type: string }>) {
      const key = `business_page:${b.id}`;
      out.push({
        kind: "business_page",
        id: b.id,
        name: b.name,
        level: statusMap.get(key) ?? "new",
        has_pending: pending.has(key),
        requested_type: b.org_type === "business" ? "verified_business" : "verified_organization",
      });
    }
    setRows(out);
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  if (!user || rows.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="font-display text-base font-bold text-navy">Trust & verification</h3>
      <p className="text-xs text-muted-foreground">Your public profiles and their current trust level.</p>
      <div className="mt-2 space-y-2">
        {rows.map((r) => (
          <div key={`${r.kind}:${r.id}`} className="rounded-xl border border-border bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-navy truncate">{r.name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <TrustBadge level={r.level} variant="internal" />
                  {r.has_pending && <span className="text-[10px] font-bold uppercase text-orange">Verification pending</span>}
                </div>
              </div>
              {!r.has_pending && !["verified_provider", "verified_business", "verified_organization"].includes(r.level) && (
                <button onClick={() => setOpen(r)} className="rounded-md bg-orange px-3 py-1.5 text-xs font-semibold text-orange-foreground">
                  Request verification
                </button>
              )}
            </div>
            <NextStepsCard kind={r.kind} id={r.id} />
          </div>
        ))}
      </div>
      {open && (
        <RequestVerificationDialog
          open={!!open}
          onClose={() => setOpen(null)}
          profileKind={open.kind}
          profileId={open.id}
          ownerUserId={user.id}
          defaultType={open.requested_type}
          onSubmitted={load}
        />
      )}
    </div>
  );
}
