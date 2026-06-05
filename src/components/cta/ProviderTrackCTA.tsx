import { Sparkles } from "lucide-react";
import { ListYourSkillButton } from "./ListYourSkillButton";

export function ProviderTrackCTA({
  title,
  text,
  className = "",
}: {
  title: string;
  text: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border border-green/30 bg-green/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green text-white">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-sm font-bold text-navy sm:text-base">{title}</p>
          <p className="mt-0.5 text-xs text-foreground/75 sm:text-sm">{text}</p>
        </div>
      </div>
      <ListYourSkillButton variant="solid" className="shrink-0" />
    </div>
  );
}
