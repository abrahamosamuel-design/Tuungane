// Shows up to 3 unfulfilled trust criteria for a profile, with deep links
// to the editor. Reads via the get_profile_trust_checklist RPC (owner-only).
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Circle, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Kind = "service_profile" | "business_page";
type Row = { key: string; label: string; done: boolean; unlocks: string };

const EDIT_LINK: Record<Kind, string> = {
  service_profile: "/me",
  business_page: "/businesses/new",
};

export function NextStepsCard({ kind, id }: { kind: Kind; id: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase.rpc("get_profile_trust_checklist", {
        _kind: kind,
        _id: id,
      });
      if (!alive) return;
      if (error) { setRows([]); return; }
      setRows((data ?? []) as Row[]);
    })();
    return () => { alive = false; };
  }, [kind, id]);

  if (!rows) return null;
  const remaining = rows.filter((r) => !r.done);
  if (remaining.length === 0) return null;

  const preview = remaining.slice(0, 3);
  const shown = open ? remaining : preview;

  return (
    <div className="mt-2 rounded-lg border border-dashed border-border/80 bg-surface/50 p-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Next steps to level up
        </p>
        {remaining.length > 3 && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-0.5 text-[11px] font-medium text-navy hover:underline"
          >
            {open ? "Show less" : `+${remaining.length - 3} more`}
            {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
      </div>
      <ul className="mt-1.5 space-y-1">
        {shown.map((r) => (
          <li key={r.key} className="flex items-start gap-2 text-xs text-foreground/80">
            <Circle className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
            <span className="flex-1">
              {r.label}
              <span className="ml-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                → {r.unlocks}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <Check className="h-3 w-3 text-green" />
          {rows.length - remaining.length} of {rows.length} done
        </span>
        <Link
          to={EDIT_LINK[kind]}
          className="text-[11px] font-semibold text-orange hover:underline"
        >
          Edit profile →
        </Link>
      </div>
    </div>
  );
}
