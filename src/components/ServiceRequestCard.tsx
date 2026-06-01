import { Link } from "@tanstack/react-router";
import { Phone, MapPin, Flag, AlertTriangle } from "lucide-react";
import { Avatar } from "@/components/social/Avatar";
import { timeAgo } from "@/lib/format";
import { requestStatusMap, type ServiceRequestRow } from "@/data/serviceRequestTypes";
import { VerifiedReviewBadge } from "./VerifiedReviewBadge";

export interface RequestWithParty extends ServiceRequestRow {
  customer?: { full_name: string; avatar_url: string | null };
  provider?: { full_name: string; avatar_url: string | null };
  has_feedback?: boolean;
}

interface Props {
  r: RequestWithParty;
  viewerRole: "customer" | "provider";
  onStatus?: (s: ServiceRequestRow["status"]) => void;
  onFeedback?: () => void;
  onDispute?: () => void;
  onReport?: () => void;
}

export function ServiceRequestCard({ r, viewerRole, onStatus, onFeedback, onDispute, onReport }: Props) {
  const meta = requestStatusMap[r.status];
  const counterpart = viewerRole === "customer" ? r.provider : r.customer;
  const counterpartId = viewerRole === "customer" ? r.provider_id : r.customer_id;

  const canAccept = viewerRole === "provider" && r.status === "requested";
  const canProgress = viewerRole === "provider" && r.status === "accepted";
  const canComplete = (viewerRole === "provider" && (r.status === "accepted" || r.status === "in_progress")) || (viewerRole === "customer" && (r.status === "in_progress" || r.status === "accepted"));
  const canCancel = r.status === "requested" || r.status === "accepted";
  const canDispute = (r.status !== "cancelled" && r.status !== "disputed");
  const canFeedback = viewerRole === "customer" && r.status === "completed" && !r.has_feedback;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <Link to="/u/$id" params={{ id: counterpartId }}>
          <Avatar name={counterpart?.full_name ?? "User"} url={counterpart?.avatar_url ?? null} size={40} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/u/$id" params={{ id: counterpartId }} className="text-sm font-semibold text-navy hover:text-orange">{counterpart?.full_name ?? "User"}</Link>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${meta.color}`}>{meta.label}</span>
            {r.urgency !== "normal" && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive">
                <AlertTriangle className="h-3 w-3" /> {r.urgency}
              </span>
            )}
            {r.has_feedback && <VerifiedReviewBadge />}
            <span className="ml-auto text-[10px] text-muted-foreground">{timeAgo(r.created_at)}</span>
          </div>

          <p className="mt-1 font-semibold text-navy">{r.service_needed}</p>
          {r.subcategory && <p className="text-xs text-muted-foreground">{r.subcategory}</p>}

          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.location}{r.town && `, ${r.town}`}</span>
            {r.preferred_date && <span>Preferred: {r.preferred_date}{r.preferred_time && ` ${r.preferred_time}`}</span>}
            {r.budget_range && <span>Budget: {r.budget_range}</span>}
          </div>

          {r.description && <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/85">{r.description}</p>}

          {r.attachment_url && <a href={r.attachment_url} target="_blank" rel="noreferrer"><img src={r.attachment_url} alt="" className="mt-2 max-h-40 rounded-lg border border-border" /></a>}

          {viewerRole === "provider" && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-muted px-2 py-0.5">Prefers: {r.preferred_contact_method}</span>
              {r.customer_phone && <a href={`tel:${r.customer_phone}`} className="inline-flex items-center gap-1 rounded-full bg-orange/10 px-2 py-1 font-semibold text-orange"><Phone className="h-3 w-3" /> {r.customer_phone}</a>}
              {r.customer_whatsapp && <a href={`https://wa.me/${r.customer_whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-green/10 px-2 py-1 font-semibold text-green"><Phone className="h-3 w-3" /> WhatsApp</a>}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            {canAccept && <Btn onClick={() => onStatus?.("accepted")} variant="primary">Accept</Btn>}
            {canProgress && <Btn onClick={() => onStatus?.("in_progress")}>Mark in progress</Btn>}
            {canComplete && <Btn onClick={() => onStatus?.("completed")} variant="primary">Mark completed</Btn>}
            {canCancel && <Btn onClick={() => onStatus?.("cancelled")}>Cancel</Btn>}
            {canFeedback && <Btn onClick={onFeedback} variant="primary">Leave verified review</Btn>}
            {canDispute && onDispute && <Btn onClick={onDispute} variant="danger">Open dispute</Btn>}
            {onReport && (
              <button onClick={onReport} className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-muted-foreground hover:text-destructive">
                <Flag className="h-3 w-3" /> Report
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Btn({ children, onClick, variant }: { children: React.ReactNode; onClick?: () => void; variant?: "primary" | "danger" }) {
  const cls =
    variant === "primary"
      ? "bg-orange text-orange-foreground hover:brightness-110"
      : variant === "danger"
      ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
      : "border border-border text-navy hover:border-orange";
  return <button onClick={onClick} className={`rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>{children}</button>;
}
