import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Tuungane" }] }),
  component: SettingsPage,
});

type ProfileRow = {
  full_name: string | null;
  phone: string | null;
  is_provider?: boolean | null;
  availability?: string | null;
  areas_served?: string | null;
  main_category?: string | null;
  contact_preference?: string | null;
};

function SettingsPage() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [busy, setBusy] = useState(false);

  // Notification prefs (local-only MVP)
  const [notif, setNotif] = useState({ requests: true, messages: true, credits: true, official: true });
  // Privacy prefs (local-only MVP)
  const [privacy, setPrivacy] = useState({ showPhone: true, whatsapp: true, calls: true, chatOnly: false });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name,phone")
        .eq("id", user.id)
        .maybeSingle();
      setProfile((data as ProfileRow) ?? { full_name: "", phone: "" });
    })();
    try {
      const n = localStorage.getItem("tuungane_notif_prefs");
      if (n) setNotif(JSON.parse(n));
      const p = localStorage.getItem("tuungane_privacy_prefs");
      if (p) setPrivacy(JSON.parse(p));
    } catch {}
  }, [user?.id]);

  if (!user || !profile) return null;

  const saveProfile = async (patch: Partial<ProfileRow>) => {
    setBusy(true);
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Saved");
  };

  const changePassword = async () => {
    const np = prompt("Enter a new password (min 6 characters):");
    if (!np || np.length < 6) return;
    const { error } = await supabase.auth.updateUser({ password: np });
    if (error) toast.error(error.message);
    else toast.success("Password updated");
  };

  const persistNotif = (next: typeof notif) => {
    setNotif(next);
    localStorage.setItem("tuungane_notif_prefs", JSON.stringify(next));
  };
  const persistPrivacy = (next: typeof privacy) => {
    setPrivacy(next);
    localStorage.setItem("tuungane_privacy_prefs", JSON.stringify(next));
  };

  const isProvider = !!profile.is_provider;

  return (
    <Layout>
      <section className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="font-display text-2xl font-bold text-navy">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account and preferences.</p>

        <Section title="Account">
          <Field label="Name" defaultValue={profile.full_name ?? ""} onSave={(v) => saveProfile({ full_name: v })} disabled={busy} />
          <Field label="Email" defaultValue={user.email ?? ""} disabled readOnly />
          <Field label="Phone number" defaultValue={profile.phone ?? ""} onSave={(v) => saveProfile({ phone: v })} disabled={busy} />
          <button onClick={changePassword} className="mt-2 inline-flex rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-navy hover:border-orange">
            Change password
          </button>
        </Section>

        <Section title="Notifications">
          <Toggle label="Request responses" checked={notif.requests} onChange={(v) => persistNotif({ ...notif, requests: v })} />
          <Toggle label="Messages" checked={notif.messages} onChange={(v) => persistNotif({ ...notif, messages: v })} />
          <Toggle label="Credit updates" checked={notif.credits} onChange={(v) => persistNotif({ ...notif, credits: v })} />
          <Toggle label="Official Tuungane updates" checked={notif.official} onChange={(v) => persistNotif({ ...notif, official: v })} />
        </Section>

        <Section title="Privacy & contact">
          <Toggle label="Show phone number" checked={privacy.showPhone} onChange={(v) => persistPrivacy({ ...privacy, showPhone: v })} />
          <Toggle label="Allow WhatsApp contact" checked={privacy.whatsapp} onChange={(v) => persistPrivacy({ ...privacy, whatsapp: v })} />
          <Toggle label="Allow phone calls" checked={privacy.calls} onChange={(v) => persistPrivacy({ ...privacy, calls: v })} />
          <Toggle label="Use platform chat only" checked={privacy.chatOnly} onChange={(v) => persistPrivacy({ ...privacy, chatOnly: v })} />
        </Section>

        {isProvider && (
          <Section title="Provider settings">
            <Field label="Availability" defaultValue={profile.availability ?? ""} onSave={(v) => saveProfile({ availability: v })} disabled={busy} />
            <Field label="Areas served" defaultValue={profile.areas_served ?? ""} onSave={(v) => saveProfile({ areas_served: v })} disabled={busy} />
            <Field label="Main skill / category" defaultValue={profile.main_category ?? ""} onSave={(v) => saveProfile({ main_category: v })} disabled={busy} />
            <Field label="Contact preference" defaultValue={profile.contact_preference ?? ""} onSave={(v) => saveProfile({ contact_preference: v })} disabled={busy} />
          </Section>
        )}

        <Section title="Security">
          <button onClick={() => signOut()} className="inline-flex rounded-full border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10">
            Log out
          </button>
          <p className="mt-3 text-xs text-muted-foreground">
            Need to delete your account? <Link to="/contact" className="text-orange underline">Contact support</Link>.
          </p>
        </Section>
      </section>
    </Layout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-base font-bold text-navy">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  defaultValue,
  onSave,
  disabled,
  readOnly,
}: {
  label: string;
  defaultValue: string;
  onSave?: (v: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-navy">{label}</label>
      <input
        defaultValue={defaultValue}
        readOnly={readOnly}
        disabled={disabled}
        onBlur={(e) => onSave && e.target.value !== defaultValue && onSave(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-orange disabled:opacity-60"
      />
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
      <span className="text-sm text-navy">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-orange" />
    </label>
  );
}
