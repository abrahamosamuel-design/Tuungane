// Lightweight PWA analytics. Persists events to localStorage and, when the
// user is authenticated, mirrors them into `pwa_events` if the table exists.
// Never throws — analytics failures must not affect UX.

import { supabase } from "@/integrations/supabase/client";

export type PwaEvent =
  | "pwa_prompt_available"
  | "pwa_prompt_shown"
  | "pwa_prompt_dismissed"
  | "pwa_install_clicked"
  | "pwa_install_accepted"
  | "pwa_install_rejected"
  | "pwa_app_installed"
  | "pwa_ios_instructions_shown";

const STORAGE_KEY = "tuungane_pwa_events";
const MAX_LOCAL = 100;

export function trackPwa(event: PwaEvent, meta: Record<string, unknown> = {}) {
  try {
    if (typeof window === "undefined") return;
    const record = { event, meta, at: new Date().toISOString() };
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as unknown[]) : [];
    list.push(record);
    if (list.length > MAX_LOCAL) list.splice(0, list.length - MAX_LOCAL);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    // Best-effort mirror; ignore if table doesn't exist or user isn't signed in.
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user?.id ?? null;
        const client = supabase as unknown as {
          from: (t: string) => { insert: (row: Record<string, unknown>) => Promise<unknown> };
        };
        await client.from("pwa_events").insert({ event, meta, user_id: uid });
      } catch {}
    })();
  } catch {}
}
