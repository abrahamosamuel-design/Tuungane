import { Phone, MessageCircle, Mail, ShieldCheck } from "lucide-react";
import { logContactClick, logContactReveal } from "@/hooks/use-contact-gate";
import { useEffect, useRef } from "react";

interface Props {
  customerId: string;
  providerId: string;
  serviceRequestId: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
}

/**
 * Unlocked contact actions shown only after a tracked service_request exists
 * between the current customer and the provider.
 */
export function ContactOptionsUnlocked({ customerId, providerId, serviceRequestId, phone, whatsapp, email }: Props) {
  const loggedRef = useRef(false);
  useEffect(() => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    logContactReveal({
      customerId, providerId, serviceRequestId,
      revealedPhone: phone ?? null,
      revealedWhatsapp: whatsapp ?? null,
      reason: "request_unlocked",
    });
  }, [customerId, providerId, serviceRequestId, phone, whatsapp]);

  const onClick = (method: "whatsapp" | "call" | "in_app") => {
    logContactClick({ customerId, providerId, serviceRequestId, method });
  };

  return (
    <div className="rounded-2xl border border-green/30 bg-green/5 p-4">
      <div className="flex items-center gap-2 text-green">
        <ShieldCheck className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-wide">Contact options unlocked — tracked by Tuungane</p>
      </div>
      <p className="mt-1 text-xs text-foreground/70">
        Please agree on details, pricing, timing, and safety before work begins. After completion you'll be invited to leave a verified service review.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
            target="_blank" rel="noreferrer"
            onClick={() => onClick("whatsapp")}
            className="inline-flex items-center gap-1.5 rounded-full bg-green px-4 py-2 text-xs font-semibold text-green-foreground hover:brightness-110"
          >
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp Provider
          </a>
        )}
        {phone && (
          <a
            href={`tel:${phone}`}
            onClick={() => onClick("call")}
            className="inline-flex items-center gap-1.5 rounded-full bg-orange px-4 py-2 text-xs font-semibold text-orange-foreground hover:brightness-110"
          >
            <Phone className="h-3.5 w-3.5" /> Call Provider
          </a>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            onClick={() => onClick("in_app")}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-navy hover:border-orange"
          >
            <Mail className="h-3.5 w-3.5" /> Email
          </a>
        )}
      </div>
    </div>
  );
}
