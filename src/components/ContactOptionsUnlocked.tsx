import { Phone, ShieldCheck } from "lucide-react";
import { logContactClick, logContactReveal } from "@/hooks/use-contact-gate";
import { useEffect, useRef, useState } from "react";
import { MessageButton } from "./MessageButton";

interface Props {
  customerId: string;
  providerId: string;
  serviceRequestId: string;
  phone?: string | null;
  /** Kept in the type for compatibility; the WhatsApp surface has been removed. */
  whatsapp?: string | null;
  email?: string | null;
  providerResponseId?: string | null;
}

/**
 * Contact options shown only after a tracked service_request exists
 * between the current customer and the provider.
 *
 * Primary action: "Message on Tuungane".
 * Secondary action: "Call / View Number" — only revealed when the customer
 * explicitly opts to view the phone number.
 */
export function ContactOptionsUnlocked({
  customerId,
  providerId,
  serviceRequestId,
  phone,
  email: _email,
  providerResponseId,
}: Props) {
  const loggedRef = useRef(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    logContactReveal({
      customerId, providerId, serviceRequestId,
      revealedPhone: phone ?? null,
      revealedWhatsapp: null,
      reason: "request_unlocked",
    });
  }, [customerId, providerId, serviceRequestId, phone]);

  const revealPhone = () => {
    if (!phone) return;
    setRevealed(true);
    logContactClick({ customerId, providerId, serviceRequestId, method: "call" });
  };

  return (
    <div className="rounded-2xl border border-green/30 bg-green/5 p-4">
      <div className="flex items-center gap-2 text-green">
        <ShieldCheck className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-wide">Tracked by Tuungane</p>
      </div>
      <p className="mt-1 text-xs text-foreground/70">
        For safety, tracking, and verified reviews, we recommend keeping communication on Tuungane.
        Phone contact is available as a backup.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <MessageButton
          serviceRequestId={serviceRequestId}
          providerId={providerId}
          providerResponseId={providerResponseId}
          variant="primary"
        />

        {phone && !revealed && (
          <button
            onClick={revealPhone}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-navy hover:border-orange"
          >
            <Phone className="h-3.5 w-3.5" /> Call / View number
          </button>
        )}

        {phone && revealed && (
          <a
            href={`tel:${phone}`}
            onClick={() => logContactClick({ customerId, providerId, serviceRequestId, method: "call" })}
            className="inline-flex items-center gap-1.5 rounded-full border border-orange/40 bg-orange/5 px-3 py-1.5 text-xs font-semibold text-orange hover:bg-orange/10"
          >
            <Phone className="h-3.5 w-3.5" /> {phone}
          </a>
        )}
      </div>

      {phone && revealed && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          For safety, tracking, and verified reviews, we recommend keeping communication on Tuungane.
        </p>
      )}
    </div>
  );
}
