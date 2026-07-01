import { useNavigate } from "@tanstack/react-router";
import { MessageSquare, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { startOrGetConversation } from "@/lib/messaging";
import { logContactClick } from "@/hooks/use-contact-gate";
import { useAuthGate } from "@/components/RequireAuthDialog";

interface Props {
  serviceRequestId: string;
  providerId: string;
  providerResponseId?: string | null;
  label?: string;
  variant?: "primary" | "outline";
  className?: string;
  size?: "sm" | "md";
}

/**
 * Primary "Message on Tuungane" CTA. Opens or creates a conversation tied
 * to the service request and routes the user into the thread.
 */
export function MessageButton({
  serviceRequestId,
  providerId,
  providerResponseId,
  label = "Message on Tuungane",
  variant = "primary",
  className = "",
  size = "md",
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
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
      const id = await startOrGetConversation({
        serviceRequestId,
        providerId,
        providerResponseId: providerResponseId ?? null,
      });
      logContactClick({
        customerId: user.id,
        providerId,
        serviceRequestId,
        method: "message",
      }).catch(() => {});
      navigate({ to: "/messages/$id", params: { id } });
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? "Could not open conversation";
      if (msg === "blocked") toast.error("Messaging is unavailable between these users");
      else toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const padding = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  const base = variant === "primary"
    ? `bg-orange text-orange-foreground hover:brightness-110 shadow-sm`
    : `border border-border bg-card text-navy hover:border-orange`;
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition ${padding} ${base} disabled:opacity-60 ${className}`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
      {label}
    </button>
  );
}
