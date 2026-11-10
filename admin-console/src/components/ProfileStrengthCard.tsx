import { Check, Sparkles } from "lucide-react";
import type { StrengthResult } from "@/lib/profile-strength";

type Props = {
  result: StrengthResult;
  title?: string;
  /** Primary call-to-action shown alongside the next suggestion (e.g. upload photo). */
  primaryAction?: { label: string; onClick: () => void };
  className?: string;
};

export function ProfileStrengthCard({ result, title = "Profile strength", primaryAction, className = "" }: Props) {
  const { score, level, color, items } = result;
  const nextItem = items.find((i) => !i.done);

  return (
    <section className={`rounded-2xl border border-border bg-card p-4 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-orange" />
          <h3 className="font-display text-sm font-bold text-navy">{title}</h3>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-navy/80">{level}</span>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Keep going — each step builds trust.</span>
          <span className="font-semibold text-navy">{score}%</span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className={`h-full ${color} transition-all`} style={{ width: `${Math.max(4, score)}%` }} />
        </div>
      </div>

      {nextItem && (
        <div className="mt-3 rounded-xl border border-orange/30 bg-orange/5 p-3">
          <p className="text-xs font-semibold text-navy">Next step: {nextItem.label}</p>
          {nextItem.hint && <p className="mt-0.5 text-xs text-muted-foreground">{nextItem.hint}</p>}
          {primaryAction && nextItem.key === "photo" && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="mt-2 inline-flex items-center gap-1 rounded-full bg-orange px-3 py-1.5 text-xs font-semibold text-orange-foreground hover:bg-orange/90"
            >
              {primaryAction.label}
            </button>
          )}
        </div>
      )}

      <ul className="mt-3 grid grid-cols-2 gap-1.5">
        {items.map((it) => (
          <li
            key={it.key}
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] ${
              it.done ? "bg-green/10 text-green" : "bg-muted/60 text-navy/60"
            }`}
          >
            <span
              className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                it.done ? "bg-green text-white" : "border border-border bg-card"
              }`}
            >
              {it.done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
            </span>
            <span className="truncate">{it.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
