import { Check } from "lucide-react";
import type { RequestStatusValue } from "@/data/serviceRequestTypes";

const steps: { id: RequestStatusValue | "feedback"; label: string }[] = [
  { id: "requested", label: "Open" },
  { id: "accepted", label: "Provider Selected" },
  { id: "in_progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
  { id: "feedback", label: "Feedback Given" },
];

interface Props {
  status: RequestStatusValue;
  hasFeedback?: boolean;
}

export function StatusTracker({ status, hasFeedback }: Props) {
  if (status === "cancelled" || status === "disputed") {
    return (
      <div className={`rounded-xl border p-3 text-sm font-semibold ${status === "disputed" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border bg-muted text-muted-foreground"}`}>
        {status === "disputed" ? "This request is in dispute. Tuungane will review." : "This request was cancelled."}
      </div>
    );
  }
  const order: Record<RequestStatusValue, number> = {
    requested: 0, accepted: 1, in_progress: 2, completed: 3, cancelled: -1, disputed: -1,
  };
  let activeIdx = order[status];
  if (status === "completed" && hasFeedback) activeIdx = 4;

  return (
    <ol className="flex items-center gap-1">
      {steps.map((s, i) => {
        const done = i < activeIdx;
        const current = i === activeIdx;
        return (
          <li key={s.id} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${done ? "bg-green text-green-foreground" : current ? "bg-orange text-orange-foreground" : "bg-muted text-muted-foreground"}`}>
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-[10px] text-center leading-tight ${current ? "font-bold text-navy" : "text-muted-foreground"}`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className={`h-0.5 flex-1 ${done ? "bg-green" : "bg-border"}`} />}
          </li>
        );
      })}
    </ol>
  );
}
