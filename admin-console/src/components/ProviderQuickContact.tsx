import { useEffect, useState } from "react";
import { Phone, MessageSquare, Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { getRevealablePhone, logContactClick } from "@/hooks/use-contact-gate";
import { startDirectConversation } from "@/lib/messaging";
import { useAuthGate } from "@/components/RequireAuthDialog";

type Source = "request_response" | "provider_profile" | "service_listing" | "search_result" | "request_detail" | "message_thread";


interface Props {
  providerId: string;
  source: Source;
  serviceId?: string | null;
  variant?: "inline" | "compact";
  showMessage?: boolean;
  className?: string;
}

/**
 * Quick Call + Message buttons. Honors provider phone_visibility for the
 * Call action and creates a direct (no-request) conversation for Message.
 */
export function ProviderQuickContact({
  providerId,
  source,
  serviceId,
  variant = "inline",
  showMessage = true,
  className = "",
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { requireAuth } = useAuthGate();
  const [busy, setBusy] = useState(false);

  const canMessage = showMessage && (!user || user.id !== providerId);
  // Always show call button, check availability on click to save initial queries
  const showCallButton = true; 

  const compact = variant === "compact";
  const base = compact
    ? "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-navy hover:border-orange disabled:opacity-60"
    : "inline-flex items-center gap-1.5 rounded-full border border-orange/40 bg-card px-3 py-1.5 text-xs font-semibold text-orange hover:bg-orange/5 disabled:opacity-60";

  const handleCall = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      requireAuth(undefined, {
        title: "Sign in to call this provider",
        message: "Create a free Tuungane account to view phone numbers and contact providers directly.",
      });
      return;
    }
    setBusy(true);
    try {
      const p = await getRevealablePhone(providerId);
      if (!p) {
        toast.error("Phone number not available or hidden.");
        return;
      }
      logContactClick({
        customerId: user.id,
        providerId,
        serviceId: serviceId ?? null,
        source,
        method: "call",
      }).catch(() => {});
      window.location.href = `tel:${p}`;
    } finally {
      setBusy(false);
    }
  };

  const handleMessage = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      requireAuth(undefined, {
        title: "Sign in to message this provider",
        message: "Create a free Tuungane account to message providers and get help fast.",
      });
      return;
    }
    if (user.id === providerId) {
      toast.error("You can't message yourself");
      return;
    }
    setBusy(true);
    try {
      const convId = await startDirectConversation(providerId);
      logContactClick({
        customerId: user.id,
        providerId,
        serviceId: serviceId ?? null,
        source,
        method: "message",
      }).catch(() => {});
      navigate({ to: "/messages/$id", params: { id: convId } });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Could not open conversation";
      toast.error(msg === "blocked" ? "Messaging is unavailable between these users" : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showCallButton && (
        <button onClick={handleCall} aria-label="Call provider" className={base}>
          <Phone className={compact ? "h-4 w-4" : "h-3.5 w-3.5"} />
          {!compact && <span>Call</span>}
        </button>
      )}
      {canMessage && (
        <button onClick={handleMessage} disabled={busy} aria-label="Message provider" className={base}>
          {busy ? <Loader2 className={`${compact ? "h-4 w-4" : "h-3.5 w-3.5"} animate-spin`} /> : <MessageSquare className={compact ? "h-4 w-4" : "h-3.5 w-3.5"} />}
          {!compact && <span>Message</span>}
        </button>
      )}
    </div>
  );
}
