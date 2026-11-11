import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/PhoneInput";
import { Loader2, UserCheck } from "lucide-react";
import { toast } from "sonner";

function isMissingOrUnnamed(name?: string | null): boolean {
  if (!name) return true;
  const clean = name.trim().toLowerCase();
  return (
    clean.length < 2 ||
    [
      "unnamed",
      "unnamed user",
      "unnamed provider",
      "anonymous",
      "anonymous user",
      "user",
      "null",
      "undefined",
    ].includes(clean)
  );
}

function isMissingPhone(phone?: string | null): boolean {
  if (!phone) return true;
  return phone.trim().length <= 10;
}

export function ContactPromptDialog() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [needsName, setNeedsName] = useState(false);
  const [needsPhone, setNeedsPhone] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null);

  const isOnboardingRoute = location.pathname.startsWith("/onboarding");

  // Reset check when user changes
  useEffect(() => {
    if (!user) {
      setOpen(false);
      setNeedsName(false);
      setNeedsPhone(false);
      setCheckedUserId(null);
    } else if (checkedUserId && checkedUserId !== user.id) {
      setCheckedUserId(null);
    }
  }, [user, checkedUserId]);

  useEffect(() => {
    if (authLoading || !user || isOnboardingRoute) return;
    if (checkedUserId === user.id) return;

    let mounted = true;
    const checkProfile = async () => {
      try {
        const res = await apiClient<any>("/profiles/me");
        const profile = res?.data?.data ?? res?.data ?? res;
        if (!mounted) return;

        const missingName = isMissingOrUnnamed(profile?.full_name);
        const missingPhone = isMissingPhone(profile?.phone);

        if (missingName || missingPhone) {
          setNeedsName(missingName);
          setNeedsPhone(missingPhone);
          setFullName(missingName ? "" : profile?.full_name || "");
          setPhone(missingPhone ? "" : profile?.phone || "");
          setOpen(true);
        } else {
          setOpen(false);
        }
        setCheckedUserId(user.id);
      } catch {
        if (mounted) setCheckedUserId(user.id);
      }
    };
    void checkProfile();

    return () => {
      mounted = false;
    };
  }, [user, authLoading, isOnboardingRoute, checkedUserId]);

  const trimmedName = fullName.trim();
  const validName = !needsName || !isMissingOrUnnamed(trimmedName);
  const validPhone = !needsPhone || !isMissingPhone(phone);
  const canSubmit = validName && validPhone && !busy;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameTouched(true);
    setPhoneTouched(true);

    if (!validName) {
      toast.error("Please enter your full name.");
      return;
    }
    if (!validPhone) {
      toast.error("Please enter a valid complete phone number.");
      return;
    }

    setBusy(true);
    try {
      const payload: Record<string, string> = {};
      if (needsName) payload.full_name = trimmedName;
      if (needsPhone) payload.phone = phone.trim();

      await apiClient.put("/profiles/me", payload);
      await supabase.auth
        .updateUser({
          data: {
            ...(needsName ? { full_name: trimmedName, name: trimmedName } : {}),
            ...(needsPhone ? { phone: phone.trim() } : {}),
          },
        })
        .catch(() => {});

      toast.success(
        needsName && needsPhone
          ? "Profile details saved!"
          : needsName
            ? "Full name saved!"
            : "Phone number saved!",
      );
      setOpen(false);
    } catch {
      toast.error("Failed to save your details. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (isOnboardingRoute) return null;

  const dialogTitle =
    needsName && needsPhone
      ? "Complete Your Profile"
      : needsName
        ? "Add Your Full Name"
        : "Add a Contact Number";

  const dialogDescription =
    needsName && needsPhone
      ? "Please enter your full name and phone number to continue using Tuungane."
      : needsName
        ? "Please enter your full name so customers and service providers know who they are connecting with."
        : "Please add a phone number to your profile so you can be reached easily.";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Compulsory modal: cannot be dismissed until required fields are saved
        if (!nextOpen && (needsName || needsPhone)) return;
        setOpen(nextOpen);
      }}
    >
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-lg bg-card/95 backdrop-blur-xl rounded-[2rem] sm:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-border/50 p-6 sm:p-10 overflow-hidden flex flex-col gap-6 [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Decorative blur blobs */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-orange/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-green/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange/15 text-orange">
            <UserCheck className="h-6 w-6" />
          </div>

          <DialogHeader>
            <DialogTitle className="text-center font-display text-2xl font-bold text-navy sm:text-3xl">
              {dialogTitle}
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground max-w-sm mx-auto mt-2">
              {dialogDescription}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-1">
            {needsName && (
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-navy">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Enter your full name"
                  value={fullName}
                  required
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={() => setNameTouched(true)}
                  className={`w-full min-h-[46px] rounded-xl border bg-background px-4 py-2.5 text-base outline-none focus:ring-2 transition-all ${
                    nameTouched && !validName
                      ? "border-destructive focus:ring-destructive/20"
                      : "border-border focus:border-orange focus:ring-orange/20"
                  }`}
                />
                {nameTouched && !validName && (
                  <p className="mt-1.5 text-xs font-medium text-destructive">
                    Please enter your full name to continue.
                  </p>
                )}
              </div>
            )}

            {needsPhone && (
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-navy">
                  Phone Number <span className="text-destructive">*</span>
                </label>
                <PhoneInput
                  value={phone}
                  onChange={(v) => {
                    setPhone(v);
                    setPhoneTouched(true);
                  }}
                  required
                />
                {phoneTouched && !validPhone && (
                  <p className="mt-1.5 text-xs font-medium text-destructive">
                    Please enter a valid complete phone number to continue.
                  </p>
                )}
              </div>
            )}

            <DialogFooter className="mt-2">
              <Button
                type="submit"
                disabled={!canSubmit}
                className="rounded-full w-full bg-orange hover:bg-orange/90 text-white font-bold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] px-6 py-6"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                {needsName && needsPhone
                  ? "Save & Continue"
                  : needsName
                    ? "Save Full Name"
                    : "Save Phone Number"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
