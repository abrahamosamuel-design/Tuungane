import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { TrustBadge, type TrustLevel } from "./TrustBadge";
import { NextStepsCard } from "./NextStepsCard";
import { RequestVerificationDialog } from "./RequestVerificationDialog";
import { AppealDialog } from "./AppealDialog";

type Row = {
  kind: "service_profile" | "business_page";
  id: string;
  name: string;
  level: TrustLevel;
  has_pending: boolean;
  last_rejected_request_id: string | null;
  has_open_appeal: boolean;
  requested_type: "verified_provider" | "verified_business" | "verified_organization";
};

type AppealTarget = { row: Row; kind: "suspension" | "under_review" | "rejected_verification"; relatedRequestId: string | null };

export function MyTrustStatusCard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState<Row | null>(null);
  const [appeal, setAppeal] = useState<AppealTarget | null>(null);

  const load = async () => {
    if (!user) return;
    try {
      const { data } = await apiClient<{ data: any }>(`/trust/my-status`);
      if (!data) return;

      const { service_profiles, business_pages, trust_status, pending_requests, rejected_requests, open_appeals } = data;

      const statusMap = new Map<string, TrustLevel>();
      for (const r of (trust_status ?? []) as Array<{ profile_kind: string; profile_id: string; manual_level: TrustLevel | null; auto_level: TrustLevel }>) {
        statusMap.set(`${r.profile_kind}:${r.profile_id}`, (r.manual_level ?? r.auto_level) as TrustLevel);
      }
      const pending = new Set<string>();
      for (const r of (pending_requests ?? []) as Array<{ profile_kind: string; profile_id: string }>) {
        pending.add(`${r.profile_kind}:${r.profile_id}`);
      }
      const lastRejected = new Map<string, string>();
      for (const r of (rejected_requests ?? []) as Array<{ id: string; profile_kind: string; profile_id: string }>) {
        const key = `${r.profile_kind}:${r.profile_id}`;
        if (!lastRejected.has(key)) lastRejected.set(key, r.id);
      }
      const openAppealsSet = new Set<string>();
      for (const a of (open_appeals ?? []) as Array<{ profile_kind: string; profile_id: string }>) {
        openAppealsSet.add(`${a.profile_kind}:${a.profile_id}`);
      }
      const out: Row[] = [];
      for (const s of (service_profiles ?? []) as Array<{ user_id: string; business_name: string | null; subcategory: string }>) {
        const key = `service_profile:${s.user_id}`;
        out.push({
          kind: "service_profile",
          id: s.user_id,
          name: s.business_name || s.subcategory || "Provider profile",
          level: statusMap.get(key) ?? "new",
          has_pending: pending.has(key),
          last_rejected_request_id: lastRejected.get(key) ?? null,
          has_open_appeal: openAppealsSet.has(key),
          requested_type: "verified_provider",
        });
      }
      for (const b of (business_pages ?? []) as Array<{ id: string; name: string; org_type: string }>) {
        const key = `business_page:${b.id}`;
        out.push({
          kind: "business_page",
          id: b.id,
          name: b.name,
          level: statusMap.get(key) ?? "new",
          has_pending: pending.has(key),
          last_rejected_request_id: lastRejected.get(key) ?? null,
          has_open_appeal: openAppealsSet.has(key),
          requested_type: b.org_type === "business" ? "verified_business" : "verified_organization",
        });
      }
      setRows(out);
    } catch (err) {
      console.error("Failed to load trust status", err);
    }
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
        {rows.map((r) => {
          const isVerified = ["verified_provider", "verified_business", "verified_organization"].includes(r.level);
          const canAppealStatus = r.level === "suspended" || r.level === "under_review";
          const canAppealRejection = !!r.last_rejected_request_id && !isVerified && !r.has_pending;
          return (
            <div key={`${r.kind}:${r.id}`} className="rounded-xl border border-border bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy truncate">{r.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <TrustBadge level={r.level} variant="internal" />
                    {r.has_pending && <span className="text-[10px] font-bold uppercase text-orange">Verification pending</span>}
                    {r.has_open_appeal && <span className="text-[10px] font-bold uppercase text-orange">Appeal pending</span>}
                  </div>
                </div>
                {!r.has_pending && !isVerified && !canAppealStatus && (
                  <button onClick={() => setOpen(r)} className="rounded-md bg-orange px-3 py-1.5 text-xs font-semibold text-orange-foreground">
                    Request verification
                  </button>
                )}
              </div>

              {(canAppealStatus || canAppealRejection) && !r.has_open_appeal && (
                <div className="mt-3 flex flex-wrap items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <div className="flex-1">
                    {r.level === "suspended" && <p><b>Profile suspended.</b> If you believe this is a mistake, you can submit an appeal.</p>}
                    {r.level === "under_review" && <p><b>Under review.</b> You can send our team additional context to help the review.</p>}
                    {canAppealRejection && r.level !== "suspended" && r.level !== "under_review" && <p><b>Verification was rejected.</b> You can appeal the decision and provide more information.</p>}
                  </div>
                  <button
                    onClick={() => setAppeal({
                      row: r,
                      kind: r.level === "suspended" ? "suspension" : r.level === "under_review" ? "under_review" : "rejected_verification",
                      relatedRequestId: r.level === "suspended" || r.level === "under_review" ? null : r.last_rejected_request_id,
                    })}
                    className="rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-navy-foreground"
                  >
                    Submit appeal
                  </button>
                </div>
              )}

              <NextStepsCard kind={r.kind} id={r.id} />
            </div>
          );
        })}
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
      {appeal && (
        <AppealDialog
          open={!!appeal}
          onClose={() => setAppeal(null)}
          profileKind={appeal.row.kind}
          profileId={appeal.row.id}
          appealKind={appeal.kind}
          relatedRequestId={appeal.relatedRequestId}
          onSubmitted={load}
        />
      )}
    </div>
  );
}
