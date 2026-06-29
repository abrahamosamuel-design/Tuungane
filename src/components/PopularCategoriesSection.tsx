import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Wrench, Sparkles, Car, Scissors, GraduationCap, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type PopularCat = {
  label: string;
  query: string; // search term used on /services
  Icon: typeof Wrench;
};

const POPULAR: PopularCat[] = [
  { label: "Plumbing", query: "Plumbers", Icon: Wrench },
  { label: "Cleaning", query: "Cleaners", Icon: Sparkles },
  { label: "Mechanics", query: "Mechanics", Icon: Car },
  { label: "Beauty", query: "Hairdressers", Icon: Scissors },
  { label: "Tutoring", query: "Tutors", Icon: GraduationCap },
  { label: "Electrical", query: "Electricians", Icon: Zap },
];

export function PopularCategoriesSection() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        POPULAR.map(async (c) => {
          const { count } = await supabase
            .from("service_profiles")
            .select("user_id", { count: "exact", head: true })
            .eq("suspended", false)
            .ilike("subcategory", `%${c.query.replace(/s$/, "")}%`);
          return [c.label, count ?? 0] as const;
        }),
      );
      if (cancelled) return;
      setCounts(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold text-navy sm:text-xl">
            Popular categories
            <span className="mt-1 block h-1 w-10 rounded-full bg-green/80" />
          </h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Browse common services people look for on Tuungane.
          </p>
        </div>
        <Link
          to="/services"
          className="shrink-0 text-sm font-semibold text-navy hover:text-orange"
        >
          View all →
        </Link>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
        {POPULAR.map(({ label, query, Icon }) => {
          const n = counts[label] ?? 0;
          return (
            <li key={label}>
              <Link
                to="/services"
                search={{ q: query } as never}
                className="flex h-full items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)] transition hover:border-orange focus-visible:border-orange"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green/10 text-navy">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-navy">{label}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {n > 0 ? `${n} provider${n === 1 ? "" : "s"}` : "Browse providers"}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
