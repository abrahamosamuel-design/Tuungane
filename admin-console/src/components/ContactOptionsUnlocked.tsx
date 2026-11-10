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
        <p className="text-sm font-semibold text-navy">Contact this provider on Tuungane</p>
      </div>
      <p className="mt-1 text-xs text-foreground/70">
        For safety and verified reviews, keep key service details on Tuungane.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <MessageButton
          serviceRequestId={serviceRequestId}
          providerId={providerId}
          providerResponseId={providerResponseId}
          variant="primary"
          className="w-full"
        />

        {phone ? (
          !revealed ? (
            <button
              onClick={revealPhone}
              className="inline-flex w-full min-h-11 items-center justify-center gap-1.5 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold text-navy hover:border-orange/60 hover:text-orange"
            >
              <Phone className="h-4 w-4" /> Call instead
            </button>
          ) : (
            <a
              href={`tel:${phone}`}
              onClick={() => logContactClick({ customerId, providerId, serviceRequestId, method: "call" })}
              className="inline-flex w-full min-h-11 items-center justify-center gap-1.5 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold text-navy hover:border-orange/60 hover:text-orange"
            >
              <Phone className="h-4 w-4" /> {phone}
            </a>
          )
        ) : (
          <div className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-dashed border-border px-4 py-2 text-xs text-muted-foreground">
            Phone not shared yet
          </div>
        )}
      </div>
    </div>
  );
}
