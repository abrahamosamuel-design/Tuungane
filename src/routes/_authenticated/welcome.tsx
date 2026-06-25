import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Briefcase, MessageSquare, ArrowRight, Camera, Check, Shield, Heart } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Avatar } from "@/components/social/Avatar";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/upload";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/welcome")({
  head: () => ({ meta: [{ title: "Welcome to Tuungane" }] }),
  component: Welcome,
});

function markSeen() {
  try { localStorage.setItem("tuungane_welcome_seen", "1"); } catch { /* ignore */ }
}

function getFirstName(user: { user_metadata?: Record<string, unknown> | null; email?: string | null } | null | undefined): string | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const candidates = [meta.first_name, meta.given_name, meta.name, meta.full_name, meta.display_name];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) {
      const first = c.trim().split(/\s+/)[0];
      return first.charAt(0).toUpperCase() + first.slice(1);
    }
  }
  if (user.email) {
    const local = user.email.split("@")[0].replace(/[._-]+/g, " ").trim().split(/\s+/)[0];
    if (local) return local.charAt(0).toUpperCase() + local.slice(1);
  }
  return null;
}

function Welcome() {
  const nav = useNavigate();
  const { user } = useAuth();
  useEffect(() => { markSeen(); }, []);

  const firstName = useMemo(() => getFirstName(user), [user]);

  return (
    <Layout>
      <section className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-wider text-orange">
          {firstName ? `Welcome, ${firstName} 👋` : "Welcome 👋"}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-navy sm:text-4xl">
          What brings you to Tuungane today?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick the path that fits you best. You can always do both later.
        </p>

        {user && <WelcomePhotoStep userId={user.id} name={firstName ?? user.email ?? "You"} />}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => { markSeen(); nav({ to: "/requests/new" }); }}
            className="group rounded-2xl border-2 border-orange/30 bg-orange/5 p-5 text-left transition hover:border-orange hover:bg-orange/10"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange text-orange-foreground">
              <Search className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-display text-lg font-bold text-navy">I need help with something</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Describe a job — like a leaking sink or a delivery — and skilled people will reach out.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-orange">
              Post a request <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => { markSeen(); nav({ to: "/list-skill" }); }}
            className="group rounded-2xl border-2 border-green/30 bg-green/5 p-5 text-left transition hover:border-green hover:bg-green/10"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green text-green-foreground">
              <Briefcase className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-display text-lg font-bold text-navy">I offer a skill or service</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a free profile so customers can find you, see your work, and message you directly.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-green">
              List my skill <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-navy">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-navy">Just looking around?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Browse what people in your area are offering — no commitment.
              </p>
              <Link
                to="/services"
                onClick={markSeen}
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-navy hover:underline"
              >
                Browse services <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => { markSeen(); nav({ to: "/services" }); }}
            className="text-xs font-medium text-muted-foreground hover:text-navy"
          >
            Skip for now
          </button>
        </div>
      </section>
    </Layout>
  );
}

/**
 * Friendly, optional profile-photo step shown once on the welcome screen for
 * new users without an avatar. Strongly encouraged but never blocking — users
 * can skip and add it any time from Settings.
 */
function WelcomePhotoStep({ userId, name }: { userId: string; name: string }) {
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
      if (cancelled) return;
      setAvatarUrl((data?.avatar_url as string | null) ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading || avatarUrl || skipped) return null;

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Image must be smaller than 8MB"); return; }
    setBusy(true);
    try {
      const url = await uploadMedia(userId, file, "avatars");
      const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
      if (error) throw error;
      setAvatarUrl(url);
      toast.success("Looking great! Photo added.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-orange/30 bg-gradient-to-br from-orange/10 via-card to-card p-5">
      <div className="flex items-start gap-4">
        <Avatar name={name} url={avatarUrl} size={64} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold text-navy">Add a photo — optional, but it helps</p>
          <p className="mt-1 text-sm text-muted-foreground">
            A clear face photo builds trust and makes your messages and requests stand out. It's completely optional and you can add or change it any time.
          </p>

          <ul className="mt-3 space-y-1.5 text-xs text-navy/80">
            <li className="flex items-start gap-1.5"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green" /> Providers with photos receive more requests</li>
            <li className="flex items-start gap-1.5"><Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green" /> Only shown on your profile and chats — never sold</li>
            <li className="flex items-start gap-1.5"><Heart className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green" /> Helps neighbours connect with a real human</li>
          </ul>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full bg-orange px-4 py-2 text-sm font-semibold text-orange-foreground hover:brightness-110 disabled:opacity-50"
            >
              <Camera className="h-4 w-4" /> {busy ? "Uploading…" : "Add photo"}
            </button>
            <button
              type="button"
              onClick={() => setSkipped(true)}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-navy/70 hover:border-navy/30"
            >
              I'll add one later
            </button>
          </div>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );
}
