import { useEffect, useState } from "react";
import { Phone, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getRevealablePhone, logContactClick } from "@/hooks/use-contact-gate";

type Source = "request_response" | "provider_profile" | "service_listing" | "search_result" | "request_detail" | "message_thread";

interface Props {
  providerId: string;
  source: Source;
  serviceId?: string | null;
  variant?: "inline" | "compact";
  onMessage?: () => void;
  showMessage?: boolean;
  className?: string;
}

/**
 * Quick Call (and optional Message) buttons that respect the provider's
 * phone_visibility setting. Used on provider profiles, service listings,
 * and search results so customers can contact faster.
 */
export function ProviderQuickContact({
  providerId,
  source,
  serviceId,
  variant = "inline",
  onMessage,
  showMessage = false,
  className = "",
}: Props) {
  const { user } = useAuth();
  const [phone, setPhone] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

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
  if (!phone && !showMessage) return null;

  const compact = variant === "compact";
  const base = compact
    ? "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-navy hover:border-orange"
    : "inline-flex items-center gap-1.5 rounded-full border border-orange/40 bg-card px-3 py-1.5 text-xs font-semibold text-orange hover:bg-orange/5";

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

  const handleMessage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMessage?.();
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {phone && (
        <button onClick={handleCall} aria-label="Call provider" className={base}>
          <Phone className={compact ? "h-4 w-4" : "h-3.5 w-3.5"} />
          {!compact && <span>Call</span>}
        </button>
      )}
      {showMessage && onMessage && (
        <button onClick={handleMessage} aria-label="Message provider" className={base}>
          <MessageSquare className={compact ? "h-4 w-4" : "h-3.5 w-3.5"} />
          {!compact && <span>Message</span>}
        </button>
      )}
    </div>
  );
}
