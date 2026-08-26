import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Camera,
  Briefcase,
  ClipboardList,
  PartyPopper,
  Loader2,
} from "lucide-react";

import { Avatar } from "@/components/social/Avatar";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api";
import { uploadMedia } from "@/lib/upload";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Welcome to Tuungane" }] }),
  staticData: {
    hideHeader: true,
    hideBottomNavOnMobile: true,
  },
  component: Onboarding,
});

/* ---------- helpers ---------- */

function getDisplayName(
  user: { user_metadata?: Record<string, unknown> | null; email?: string | null } | null | undefined,
): string {
  if (!user) return "";
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const candidates = [meta.full_name, meta.name, meta.display_name];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return "";
}

function markOnboarded() {
  try {
    localStorage.setItem("tuungane_onboarded", "1");
    localStorage.setItem("tuungane_welcome_seen", "1");
  } catch {
    /* ignore */
  }
}

/* ---------- root component ---------- */

type NextAction = "list" | "request" | null;

function Onboarding() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [chosenAction, setChosenAction] = useState<NextAction>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [loading, user, nav]);

  if (!user) return null;

  const goToStep2 = () => setStep(2);

  const goToStep3 = (action: NextAction) => {
    setChosenAction(action);
    setStep(3);
  };

  const finish = async () => {
    markOnboarded();
    apiClient.put("/profiles/me", { has_completed_onboarding: true }).catch(() => {});

    const dest =
      chosenAction === "list"
        ? "/profiles/new"
        : chosenAction === "request"
          ? "/requests/new"
          : "/dashboard";

    nav({ to: dest });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange/5 via-background to-green/5 flex flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg bg-card/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/50 p-6 sm:p-10 relative overflow-hidden">
        {/* Decorative blur blobs */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-orange/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-green/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col">
          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <Logo className="h-10 w-auto" />
          </div>

          {/* Step indicator */}
          <StepIndicator current={step} />

          {/* Steps */}
          {step === 1 && <Step1Welcome user={user} onContinue={goToStep2} />}
          {step === 2 && <Step2Action onChoose={goToStep3} />}
          {step === 3 && <Step3ThankYou onFinish={finish} />}
        </div>
      </div>
    </main>
  );
}

/* ---------- step indicator ---------- */

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`h-2 rounded-full transition-all duration-500 ${
            s === current
              ? "w-8 bg-orange"
              : s < current
                ? "w-2 bg-orange/60"
                : "w-2 bg-border"
          }`}
        />
      ))}
    </div>
  );
}

/* ---------- step 1: welcome + photo + name ---------- */

function Step1Welcome({
  user,
  onContinue,
}: {
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null };
  onContinue: () => void;
}) {
  const prefillName = useMemo(() => getDisplayName(user), [user]);
  const [fullName, setFullName] = useState(prefillName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [nameError, setNameError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load existing avatar if any
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiClient<{ data: { avatar_url: string | null; full_name: string | null } }>("/profiles/me");
        if (cancelled) return;
        if (data.data?.avatar_url) setAvatarUrl(data.data.avatar_url);
        // If server has a name and we don't have one from Google metadata, use it
        if (data.data?.full_name && !fullName) setFullName(data.data.full_name);
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Image must be smaller than 8 MB"); return; }
    setUploadBusy(true);
    try {
      const url = await uploadMedia(user.id, file, "avatars");
      await apiClient.put("/profiles/me", { avatar_url: url });
      setAvatarUrl(url);
      toast.success("Photo added!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadBusy(false);
    }
  };

  const handleContinue = async () => {
    const trimmed = fullName.trim();
    if (!trimmed) {
      setNameError(true);
      return;
    }
    setSaveBusy(true);
    try {
      await apiClient.put("/profiles/me", { full_name: trimmed });
      onContinue();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save name");
    } finally {
      setSaveBusy(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-center font-display text-3xl font-bold text-navy sm:text-4xl">
        Welcome to Tuungane
      </h1>
      <p className="mt-3 text-center text-sm text-muted-foreground max-w-sm mx-auto">
        Let's set up your profile so people can connect with you.
      </p>

      {/* Avatar upload */}
      <div className="mt-8 flex flex-col items-center">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploadBusy}
          className="group relative"
        >
          <Avatar name={fullName || user.email || "You"} url={avatarUrl} size={100} />
          <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-orange text-white shadow-md transition-transform group-hover:scale-110">
            {uploadBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </span>
        </button>
        <p className="mt-3 text-xs text-muted-foreground">
          Tap to add a profile photo <span className="text-muted-foreground/60">(optional)</span>
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>

      {/* Name input */}
      <div className="mt-6">
        <label htmlFor="onboarding-name" className="block text-xs font-semibold text-navy mb-1.5">
          Your Name <span className="text-red-500">*</span>
        </label>
        <input
          id="onboarding-name"
          type="text"
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            if (nameError && e.target.value.trim()) setNameError(false);
          }}
          placeholder="Enter your full name"
          className={`w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition focus:ring-2 ${
            nameError
              ? "border-red-400 focus:border-red-400 focus:ring-red-200"
              : "border-border focus:border-orange focus:ring-orange/20"
          }`}
        />
        {nameError && (
          <p className="mt-1.5 text-xs text-red-500 animate-in fade-in">
            Please enter your name to continue
          </p>
        )}
      </div>

      {/* Continue */}
      <div className="mt-8">
        <button
          type="button"
          onClick={handleContinue}
          disabled={saveBusy}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-orange px-6 py-3.5 text-sm font-bold text-orange-foreground shadow-md transition-all hover:brightness-110 hover:shadow-lg disabled:opacity-50"
        >
          {saveBusy ? "Saving…" : "Continue"} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ---------- step 2: list or request ---------- */

function Step2Action({ onChoose }: { onChoose: (action: NextAction) => void }) {
  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500">
      <h1 className="text-center font-display text-2xl font-bold text-navy sm:text-3xl">
        What would you like to do?
      </h1>
      <p className="mt-3 text-center text-sm text-muted-foreground max-w-sm mx-auto">
        Pick a starting point — you can always do both later.
      </p>

      <div className="mt-8 grid gap-4">
        <button
          type="button"
          onClick={() => onChoose("list")}
          className="group flex items-start gap-4 rounded-2xl border-2 border-border/50 bg-background p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-green"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green text-white shadow-lg shadow-green/20 transition-transform group-hover:scale-105">
            <Briefcase className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-bold text-navy">List a Service</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Offer your skills — plumbing, cleaning, tutoring and more. Get discovered by people who need you.
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-green transition-transform group-hover:translate-x-1">
              Get started <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChoose("request")}
          className="group flex items-start gap-4 rounded-2xl border-2 border-border/50 bg-background p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-orange"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange text-orange-foreground shadow-lg shadow-orange/20 transition-transform group-hover:scale-105">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-bold text-navy">Request a Service</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Describe what you need — a leaky sink, a delivery, or anything else — and skilled people will respond.
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-orange transition-transform group-hover:translate-x-1">
              Post a request <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </button>
      </div>

      {/* Skip */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => onChoose(null)}
          className="text-xs font-medium text-muted-foreground hover:text-navy transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

/* ---------- step 3: thank you ---------- */

function Step3ThankYou({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center text-center py-4">
      {/* Celebration icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange/20 via-green/20 to-orange/20 mb-6">
        <PartyPopper className="h-10 w-10 text-orange" />
      </div>

      <h1 className="font-display text-3xl font-bold text-navy sm:text-4xl">
        Thank you for joining!
      </h1>
      <p className="mt-4 text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
        You're all set. Welcome to the Tuungane community — where neighbours connect and help each other thrive. 🎉
      </p>

      {/* Animated arrow button */}
      <button
        type="button"
        onClick={onFinish}
        className="mt-10 group flex items-center gap-3 rounded-full bg-navy px-8 py-4 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110 active:scale-95"
      >
        Let's go
        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
      </button>

      <p className="mt-4 text-[11px] text-muted-foreground/60">
        You can explore everything from your dashboard
      </p>
    </div>
  );
}
