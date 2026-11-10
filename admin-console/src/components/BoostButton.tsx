import { useState } from "react";
import { Sparkles } from "lucide-react";
import { BoostDialog } from "./BoostDialog";
import type { BoostType } from "@/hooks/use-boosts";

interface Props {
  boostType: BoostType;
  entityType: string;
  entityId: string;
  label?: string;
  dialogTitle?: string;
  dialogDescription?: string;
  isActive?: boolean;
  className?: string;
  onActivated?: () => void;
}

export function BoostButton({ boostType, entityType, entityId, label = "Boost", dialogTitle, dialogDescription, isActive, className, onActivated }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${isActive ? "border-orange bg-orange/10 text-orange" : "border-border text-navy hover:border-orange hover:text-orange"}`}
      >
        <Sparkles className="h-3.5 w-3.5" /> {isActive ? `${label} active` : label}
      </button>
      <BoostDialog
        open={open}
        onClose={() => setOpen(false)}
        boostType={boostType}
        entityType={entityType}
        entityId={entityId}
        title={dialogTitle}
        description={dialogDescription}
        onActivated={onActivated}
      />
    </>
  );
}
