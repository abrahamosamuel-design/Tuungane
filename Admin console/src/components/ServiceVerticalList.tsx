import { ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export type ServiceListItem = {
  id: string;
  name: string;
  icon: React.ReactNode;
  subtitle?: string;
  to: string;
};

export function ServiceVerticalList({ title, items }: { title: string; items: ServiceListItem[] }) {
  return (
    <div className="py-4 bg-white md:hidden">
      {title && (
        <div className="mb-4 px-6 flex items-center justify-between">
          <h3 className="text-base font-bold text-navy">{title}</h3>
          <Link to="/services" className="text-sm font-semibold text-orange hover:underline">
            View All
          </Link>
        </div>
      )}
      <div className="flex flex-col gap-4 px-6 pb-6">
        {items.map((item) => (
          <Link
            key={item.id}
            to={item.to as any}
            className="flex items-center gap-4 rounded-[24px] border border-border/30 bg-white p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100 text-navy">
              {item.icon}
            </div>
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-bold text-navy">{item.name}</span>
              {item.subtitle && (
                <span className="text-[13px] font-medium text-muted-foreground/80">{item.subtitle}</span>
              )}
            </div>
            <ChevronRight className="h-5 w-5 text-navy/40" />
          </Link>
        ))}
      </div>
    </div>
  );
}
