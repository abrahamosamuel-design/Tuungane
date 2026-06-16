import { Check } from "lucide-react";
import type { RequestStatusValue } from "@/data/serviceRequestTypes";
import { toVisibleStatus } from "@/data/serviceRequestTypes";

const steps: { id: "open" | "in_progress" | "completed"; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
];

interface Props {
  status: RequestStatusValue;
  /** Kept for backwards compatibility; no longer rendered as a separate stage. */
  hasFeedback?: boolean;
}

export function StatusTracker({ status }: Props) {
  if (status === "cancelled") {
    return (
      <div className="rounded-xl border border-border bg-muted p-3 text-sm font-semibold text-muted-foreground">
        This request was cancelled.
      </div>
    );
  }
  if (status === "disputed") {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
        This request is in dispute. Tuungane will review.
      </div>
    );
  }

  const visible = toVisibleStatus(status) as "open" | "in_progress" | "completed";
  const order: Record<"open" | "in_progress" | "completed", number> = { open: 0, in_progress: 1, completed: 2 };
  const activeIdx = order[visible];

  return (
    <ol className="flex items-center gap-1">
      {steps.map((s, i) => {
        const done = i < activeIdx;
        const current = i === activeIdx;
        return (
          <li key={s.id} className="flex flex-1 items-center">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${
                  done
                    ? "bg-green text-green-foreground"
                    : current
                    ? "bg-orange text-orange-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={`text-center text-[11px] leading-tight ${
                  current ? "font-bold text-navy" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 ${done ? "bg-green" : "bg-border"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
