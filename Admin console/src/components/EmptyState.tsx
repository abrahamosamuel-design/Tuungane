import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

type Action = { label: string; to?: string; onClick?: () => void };

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = "",
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: Action;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center ${className}`}>
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-display text-lg font-bold text-navy">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && (
        action.to ? (
          <Link to={action.to} className="mt-4 inline-flex items-center rounded-full bg-orange px-4 py-2 text-sm font-semibold text-white shadow hover:bg-orange/90">
            {action.label}
          </Link>
        ) : (
          <button onClick={action.onClick} className="mt-4 inline-flex items-center rounded-full bg-orange px-4 py-2 text-sm font-semibold text-white shadow hover:bg-orange/90">
            {action.label}
          </button>
        )
      )}
    </div>
  );
}
