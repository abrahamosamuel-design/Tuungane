import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, CheckCircle2, Mail, ArrowRight, ShieldCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/recovery")({
  validateSearch: (s: Record<string, unknown>) => ({
    confirmed: s.confirmed === "true" || s.confirmed === true,
    legacyOwnerId: typeof s.legacyOwnerId === "string" ? s.legacyOwnerId : undefined,
    claimToken: typeof s.claimToken === "string" ? s.claimToken : undefined,
  }),
  staticData: {
    hideHeader: true,
    hideBottomNav: true,
  },
  component: RecoveryPage,
});

function RecoveryPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { confirmed, legacyOwnerId, claimToken } = search;

  const [loading, setLoading] = useState(!confirmed);
  const [legacyProfile, setLegacyProfile] = useState<any>(null);
  const [emailInput, setEmailInput] = useState("");
  
  // Link sending state
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [sentToEmail, setSentToEmail] = useState("");

  // Transfer state when arriving from magic link
  const [transferring, setTransferring] = useState(confirmed);
  const [transferred, setTransferred] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transferInitiated = useRef(false);

  // 1. If user arrived from Magic Link (confirmed === true), execute ID transfer immediately
  useEffect(() => {
    if (confirmed && legacyOwnerId && !transferInitiated.current) {
      transferInitiated.current = true;
      setTransferring(true);
      setError(null);

      apiClient.post("/recovery/confirm-claim", {
        legacyOwnerId,
        claimToken,
      })
        .then(async (res: any) => {
          localStorage.setItem("tuungane_legacy_checked", "1");
          localStorage.setItem("tuungane_onboarded", "1");
          setTransferred(true);
          
          if (res.data?.requiresRelogin) {
            toast.success("Account confirmed! Please log back in to your original account to see your data.");
            const { supabase } = await import("@/integrations/supabase/client");
            await supabase.auth.signOut();
            setTimeout(() => {
              navigate({ to: "/login" });
            }, 3000);
          } else {
            toast.success("Account ownership confirmed! All services and listings have been transferred.");
            setTimeout(() => {
              navigate({ to: "/dashboard" });
            }, 2000);
          }
        })
        .catch((err) => {
          console.error("Error confirming claim:", err);
          setError(err.message || "Failed to transfer account. The link may have expired.");
        })
        .finally(() => {
          setTransferring(false);
        });
    }
  }, [confirmed, legacyOwnerId, claimToken, navigate]);

  // 2. If user arrived normally, check for duplicate legacy account
  useEffect(() => {
    if (!confirmed) {
      apiClient<{ data: { isDuplicate: boolean; legacyProfile: any } }>("/recovery/check")
        .then((res) => {
          const data = res.data;
          if (!data || !data.isDuplicate || !data.legacyProfile) {
            navigate({ to: "/dashboard" });
          } else {
            setLegacyProfile(data.legacyProfile);
            if (data.legacyProfile.auth_email) {
              setEmailInput(data.legacyProfile.auth_email);
            }
          }
        })
        .catch((err) => {
          console.error("Error checking legacy profile", err);
          setError("Failed to verify account status.");
        })
        .finally(() => setLoading(false));
    }
  }, [confirmed, navigate]);

  const handleSendMagicLink = async () => {
    if (!legacyProfile?.owner_id) return;
    const emailToSend = emailInput.trim();
    if (!emailToSend || !emailToSend.includes("@")) {
      setError("Please enter a valid email address to receive the confirmation link.");
      return;
    }

    setSendingLink(true);
    setError(null);
    try {
      const res = await apiClient.post<{ data: { email: string; message: string } }>("/recovery/send-magic-link", {
        legacyOwnerId: legacyProfile.owner_id,
        email: emailToSend,
      });

      setSentToEmail(res.data?.email || emailToSend);
      setLinkSent(true);
      toast.success("Magic link sent! Please check your email inbox.");
    } catch (err: any) {
      console.error("Failed to send magic link", err);
      setError(err.message || "Failed to send magic link. Please try again.");
    } finally {
      setSendingLink(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("tuungane_legacy_checked", "1");
    navigate({ to: "/dashboard" });
  };

  // State: Loading check
  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy" />
      </div>
    );
  }

  // State: Transferring via Magic Link
  if (transferring) {
    return (
      <div className="container mx-auto flex max-w-md flex-col items-center justify-center p-6 text-center mt-16">
        <div className="mb-6 rounded-full bg-orange-100 p-5 ring-8 ring-orange-50">
          <Loader2 className="h-12 w-12 animate-spin text-orange" />
        </div>
        <h1 className="mb-3 text-2xl font-bold text-navy">Verifying Magic Link...</h1>
        <p className="text-sm text-gray-600">
          Securing ownership and transferring your previous listings and profile IDs to your account.
        </p>
      </div>
    );
  }

  // State: Successfully Transferred
  if (transferred) {
    return (
      <div className="container mx-auto flex max-w-md flex-col items-center justify-center p-6 text-center mt-12 animate-in fade-in zoom-in-95 duration-500">
        <div className="mb-6 rounded-full bg-green-100 p-4 ring-8 ring-green-50">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        <h1 className="mb-3 text-2xl font-bold text-navy">Ownership Confirmed!</h1>
        <p className="mb-6 text-gray-600 text-sm leading-relaxed">
          Your profile, listings, and services from the previous platform have been successfully transferred to your new account.
        </p>
        <div className="flex items-center gap-2 text-xs font-semibold text-orange">
          <span>Redirecting to your dashboard</span>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        </div>
      </div>
    );
  }

  // State: Email Magic Link Sent — Waiting for user to click
  if (linkSent) {
    return (
      <div className="container mx-auto max-w-lg p-6 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border-t-4 border-t-orange shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 ring-8 ring-orange-50">
              <Mail className="h-7 w-7 text-orange" />
            </div>
            <CardTitle className="text-2xl text-navy">Check Your Email</CardTitle>
            <CardDescription className="text-sm pt-2">
              For security, we've sent a magic link to confirm ownership of this account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="rounded-xl border bg-gray-50 p-4 text-center">
              <p className="text-xs text-gray-500">Sent to</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{sentToEmail}</p>
            </div>
            <p className="text-xs text-gray-600 text-center leading-relaxed">
              Click the magic link in your email to instantly verify ownership and transfer your services, listings, and profile.
            </p>
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-xs text-red-600 text-center">
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2.5">
            <Button
              variant="outline"
              className="w-full text-xs font-semibold"
              onClick={handleSendMagicLink}
              disabled={sendingLink}
            >
              {sendingLink ? (
                <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Resending Link...</>
              ) : (
                <><RefreshCw className="mr-2 h-3.5 w-3.5" /> Resend Magic Link</>
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-gray-500 hover:text-gray-900 text-xs"
              onClick={handleDismiss}
            >
              Skip and continue without claiming
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // State: Initial Welcome / Confirmation screen
  return (
    <div className="container mx-auto max-w-lg p-6 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-t-4 border-t-orange shadow-lg">
        <CardHeader className="text-center pb-3">
          <div className="mx-auto mb-3 flex items-center justify-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-navy">
            <ShieldCheck className="h-4 w-4" />
            <span>Ownership Verification</span>
          </div>
          <CardTitle className="text-2xl font-bold text-navy">Welcome to the new Tuungane!</CardTitle>
          <CardDescription className="text-sm pt-1">
            We found an existing account matching your details from our previous platform. Is this you?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border bg-gray-50/80 p-5 flex flex-col items-center">
            <Avatar className="h-20 w-20 border-4 border-white shadow-sm mb-3">
              <AvatarImage src={legacyProfile?.avatar_url || ""} />
              <AvatarFallback className="bg-navy text-white text-xl font-bold">
                {legacyProfile?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-lg font-bold text-gray-900 text-center">{legacyProfile?.name}</h3>
            {legacyProfile?.category_slug && (
              <span className="mt-1 inline-flex items-center rounded-full bg-orange/10 px-2.5 py-0.5 text-xs font-semibold text-orange capitalize">
                {legacyProfile.category_slug}
              </span>
            )}

            <div className="mt-5 w-full space-y-2.5 text-xs text-gray-600">
              {legacyProfile?.phone && (
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <span className="font-semibold text-gray-700">Phone Number</span>
                  <span className="font-medium text-gray-900">{legacyProfile.phone}</span>
                </div>
              )}
              {legacyProfile?.bio && (
                <div className="pt-1">
                  <span className="block font-semibold text-gray-700 mb-0.5">Bio / Description</span>
                  <p className="text-gray-500 line-clamp-2">{legacyProfile.bio}</p>
                </div>
              )}
            </div>
          </div>

          {/* Email Confirmation Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700">
              Send verification magic link to:
            </label>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Enter your email address"
              className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-orange focus:ring-2 focus:ring-orange/20"
            />
            <p className="text-[11px] text-gray-500">
              For security, clicking the link in your email will confirm ownership and transfer your listings.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-xs text-red-600">
              {error}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2.5 pt-1">
          <Button
            className="w-full bg-navy hover:bg-navy/90 text-white font-bold h-11"
            size="lg"
            onClick={handleSendMagicLink}
            disabled={sendingLink}
          >
            {sendingLink ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Magic Link...</>
            ) : (
              <><Mail className="mr-2 h-4 w-4" /> Send Magic Link to Confirm</>
            )}
          </Button>
          <Button
            variant="ghost"
            className="w-full text-gray-500 hover:text-gray-900 text-xs"
            onClick={handleDismiss}
            disabled={sendingLink}
          >
            No, start fresh with a new account
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
