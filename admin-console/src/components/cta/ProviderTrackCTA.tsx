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
      className={`flex items-center gap-2.5 rounded-xl border border-green/30 bg-green/5 p-2.5 sm:gap-3 sm:rounded-2xl sm:p-4 ${className}`}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green text-white sm:h-9 sm:w-9">
        <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-xs font-bold text-navy sm:text-sm">{title}</p>
        <p className="mt-0.5 hidden truncate text-[11px] text-foreground/70 min-[380px]:block sm:text-xs">{text}</p>
      </div>
      <ListYourSkillButton
        variant="solid"
        withIcon={false}
        label="List Your Service"
        className="shrink-0 !px-3 !py-1.5 !text-xs"
      />

    </div>
  );
}
