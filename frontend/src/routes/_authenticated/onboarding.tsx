import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { User, Building2, Search, ClipboardList, Sparkles, Compass, ArrowRight, Check } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { organisationTypes, type OrganisationType } from "@/data/organisationTypes";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Welcome to Tuungane" }] }),
  component: Onboarding,
});

type Identity = "individual" | "institution";
type NextAction = "find" | "request" | "list" | "explore";

function Onboarding() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState<OrganisationType | "">("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [loading, user, nav]);

  const saveIdentity = async () => {
    if (!user || !identity) return;
    setBusy(true);
    const patch: {
      profile_identity: Identity;
      organisation_name?: string;
      organisation_type?: string;
    } = { profile_identity: identity };
    if (identity === "institution") {
      if (orgName.trim()) patch.organisation_name = orgName.trim();
      if (orgType) patch.organisation_type = orgType;
    }
    try {
      await apiClient.put("/profiles/me", patch);
      setStep(2);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update profile");
    } finally {
      setBusy(false);
    }
  };

  const finish = async (next: NextAction) => {
    try { localStorage.setItem("tuungane_welcome_seen", "1"); } catch { /* ignore */ }
    try { localStorage.setItem("tuungane_onboarded", "1"); } catch { /* ignore */ }
    if (user) {
      // Fire-and-forget: don't block navigation on the flag write.
      apiClient.put("/profiles/me", { has_completed_onboarding: true }).catch(() => {});
    }
    const map: Record<NextAction, string> = {
      find: "/services",
      request: "/requests/new",
      list: "/profiles/new",
      explore: "/",
    };
    nav({ to: map[next] });
  };

  if (!user) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange/5 via-background to-green/5 flex flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-2xl bg-card/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/50 p-6 sm:p-10 relative overflow-hidden">
        
        {/* Decorative blur blobs */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-orange/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-green/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col">
          <div className="mb-10 flex justify-center">
            <Logo className="h-10 w-auto" />
          </div>

          <div className="mb-8 flex items-center justify-center gap-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span className={step === 1 ? "text-orange" : ""}>Step 1</span>
            <span className="h-px w-8 bg-border" />
            <span className={step === 2 ? "text-orange" : ""}>Step 2</span>
          </div>

          {step === 1 ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-center font-display text-3xl font-bold text-navy sm:text-4xl">
                How are you joining Tuungane?
              </h1>
              <p className="mt-3 text-center text-sm text-muted-foreground max-w-md mx-auto">
                Pick the option that best describes you. You can always change this later in Settings.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <IdentityCard
                  selected={identity === "individual"}
                  onClick={() => setIdentity("individual")}
                  icon={<User className="h-6 w-6" />}
                  title="Individual Profile"
                  body="For people who want to connect, find or offer services, share updates, and grow their network."
                  tone="navy"
                />
                <IdentityCard
                  selected={identity === "institution"}
                  onClick={() => setIdentity("institution")}
                  icon={<Building2 className="h-6 w-6" />}
                  title="Institution / Organisation"
                  body="For schools, NGOs, churches, companies, SACCOs, training centres and other organisations."
                  tone="green"
                />
              </div>

              {identity === "institution" && (
                <div className="mt-6 space-y-4 rounded-2xl border border-green/20 bg-green/5 p-5 animate-in fade-in zoom-in-95 duration-300">
                  <p className="text-xs font-medium text-green-700/80">
                    A couple of quick details — you can complete the rest later.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-navy">Organisation name</label>
                      <input
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="e.g. Rabboni Christian Learning Center"
                        className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-green focus:ring-2 focus:ring-green/20"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-navy">Organisation type</label>
                      <select
                        value={orgType}
                        onChange={(e) => setOrgType(e.target.value as OrganisationType | "")}
                        className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-green focus:ring-2 focus:ring-green/20"
                      >
                        <option value="">Select a type…</option>
                        {organisationTypes.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
                <button
                  type="button"
                  onClick={() => finish("explore")}
                  className="text-sm font-semibold text-muted-foreground transition hover:text-navy"
                >
                  Skip for now
                </button>
                <button
                  type="button"
                  onClick={saveIdentity}
                  disabled={!identity || busy}
                  className="inline-flex items-center gap-2 rounded-full bg-orange px-6 py-3 text-sm font-bold text-orange-foreground shadow-md transition-all hover:brightness-110 hover:shadow-lg disabled:opacity-50 disabled:hover:shadow-md disabled:hover:brightness-100"
                >
                  {busy ? "Saving…" : "Continue"} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              <h1 className="text-center font-display text-3xl font-bold text-navy sm:text-4xl">
                What would you like to do first?
              </h1>
              <p className="mt-3 text-center text-sm text-muted-foreground max-w-md mx-auto">
                Just a starting point — you can do all of these later.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <ActionCard onClick={() => finish("find")} icon={<Search className="h-6 w-6" />} title="Find a service" body="Browse people offering services near you." tone="navy" />
                <ActionCard onClick={() => finish("request")} icon={<ClipboardList className="h-6 w-6" />} title="Post a service request" body="Describe what you need and get responses." tone="orange" />
                <ActionCard onClick={() => finish("list")} icon={<Sparkles className="h-6 w-6" />} title="List my service" body="Offer a skill and become discoverable." tone="green" />
                <ActionCard onClick={() => finish("explore")} icon={<Compass className="h-6 w-6" />} title="Explore Tuungane" body="Just look around — no commitment." tone="muted" />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function IdentityCard({
  selected, onClick, icon, title, body, tone,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  body: string;
  tone: "navy" | "green";
}) {
  const border = tone === "green" ? "border-green bg-green/5 ring-4 ring-green/10" : "border-navy bg-navy/5 ring-4 ring-navy/10";
  const iconBg = tone === "green" ? "bg-green text-white shadow-green/20" : "bg-navy text-white shadow-navy/20";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative rounded-2xl border-2 p-5 text-left transition-all duration-300 ${
        selected ? `${border} scale-[1.02] shadow-lg` : "border-border/50 bg-background hover:border-border hover:bg-muted/30"
      }`}
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-lg transition-transform group-hover:scale-105 ${iconBg}`}>
        {icon}
      </div>
      <h3 className="mt-4 font-display text-lg font-bold text-navy">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
      {selected && (
        <span className="absolute right-4 top-4 inline-flex h-6 w-6 items-center justify-center rounded-full bg-navy text-white shadow-sm animate-in zoom-in">
          <Check className="h-3.5 w-3.5" />
        </span>
      )}
    </button>
  );
}

function ActionCard({
  onClick, icon, title, body, tone,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  body: string;
  tone: "navy" | "orange" | "green" | "muted";
}) {
  const iconBg =
    tone === "orange" ? "bg-orange text-orange-foreground shadow-orange/20" :
    tone === "green" ? "bg-green text-green-foreground shadow-green/20" :
    tone === "muted" ? "bg-muted text-navy shadow-black/5" :
    "bg-navy text-white shadow-navy/20";
  
  const hoverBorder = 
    tone === "orange" ? "hover:border-orange" :
    tone === "green" ? "hover:border-green" :
    tone === "muted" ? "hover:border-muted-foreground" :
    "hover:border-navy";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-2xl border-2 border-border/50 bg-background p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${hoverBorder}`}
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-lg transition-transform group-hover:scale-105 ${iconBg}`}>
        {icon}
      </div>
      <h3 className="mt-4 font-display text-lg font-bold text-navy">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
      <span className={`mt-4 inline-flex items-center gap-1.5 text-xs font-bold transition-transform group-hover:translate-x-1 ${tone === 'orange' ? 'text-orange' : tone === 'green' ? 'text-green' : tone === 'muted' ? 'text-muted-foreground' : 'text-navy'}`}>
        Continue <ArrowRight className="h-4 w-4" />
      </span>
    </button>
  );
}
