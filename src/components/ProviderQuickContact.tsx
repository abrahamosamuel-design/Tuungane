import { useEffect, useState } from "react";
import { Phone, MessageSquare, Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { getRevealablePhone, logContactClick } from "@/hooks/use-contact-gate";
import { startDirectConversation } from "@/lib/messaging";

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
  const [phone, setPhone] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoaded(false);
    getRevealablePhone(providerId).then((p) => {
      if (alive) {
        setPhone(p);
        setLoaded(true);
      }
    });
    return () => {
      alive = false;
    };
  }, [providerId]);

  if (!loaded) return null;
  const canMessage = showMessage && (!user || user.id !== providerId);
  if (!phone && !canMessage) return null;

  const compact = variant === "compact";
  const base = compact
    ? "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-navy hover:border-orange disabled:opacity-60"
    : "inline-flex items-center gap-1.5 rounded-full border border-orange/40 bg-card px-3 py-1.5 text-xs font-semibold text-orange hover:bg-orange/5 disabled:opacity-60";

  const handleCall = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (user) {
      logContactClick({
        customerId: user.id,
        providerId,
        serviceId: serviceId ?? null,
        source,
        method: "call",
      }).catch(() => {});
    }
    window.location.href = `tel:${phone}`;
  };

  const handleMessage = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate({ to: "/login" });
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
      {phone && (
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
