import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/recovery")({
  component: RecoveryPage,
});

function RecoveryPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [legacyProfile, setLegacyProfile] = useState<any>(null);
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient<{ data: { isDuplicate: boolean; legacyProfile: any } }>("/recovery/check")
      .then((res) => {
        const data = res.data;
        if (!data || !data.isDuplicate || !data.legacyProfile) {
          // If no duplicate found, they shouldn't be here. Send them to home.
          navigate({ to: "/" });
        } else {
          setLegacyProfile(data.legacyProfile);
        }
      })
      .catch((err) => {
        console.error("Error checking legacy profile", err);
        setError("Failed to verify account status.");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleConfirmAccount = async () => {
    if (!legacyProfile?.owner_id) return;
    
    setSendingLink(true);
    setError(null);
    try {
      await apiClient.post("/recovery/send-magic-link", {
        legacyOwnerId: legacyProfile.owner_id
      });
      setLinkSent(true);
    } catch (err: any) {
      console.error("Failed to send magic link", err);
      setError(err.message || "Failed to send magic link. Please try again.");
    } finally {
      setSendingLink(false);
    }
  };

  const handleDismiss = () => {
    // Mark as checked so they don't get trapped here again
    localStorage.setItem("tuungane_legacy_checked", "1");
    navigate({ to: "/" });
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-tuungane-blue" />
      </div>
    );
  }

  if (linkSent) {
    return (
      <div className="container mx-auto flex max-w-md flex-col items-center justify-center p-6 text-center mt-12">
        <div className="mb-6 rounded-full bg-green-100 p-4">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        <h1 className="mb-4 text-2xl font-bold text-tuungane-blue">Check Your Email</h1>
        <p className="mb-8 text-gray-600">
          We've sent a magic link to <span className="font-semibold">{legacyProfile?.auth_email}</span>. 
          Please click the link in that email to log into your account!
        </p>
        <p className="text-sm text-gray-500">
          You can safely close this page.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-lg p-6 mt-8">
      <Card className="border-t-4 border-t-tuungane-orange shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-tuungane-blue">Welcome to the new Tuungane!</CardTitle>
          <CardDescription className="text-base pt-2">
            We found an existing account matching your details from our previous platform. Is this you?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border bg-gray-50 p-6 flex flex-col items-center">
            <Avatar className="h-24 w-24 border-4 border-white shadow-sm mb-4">
              <AvatarImage src={legacyProfile?.avatar_url || ""} />
              <AvatarFallback className="bg-tuungane-blue text-white text-2xl">
                {legacyProfile?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-bold text-gray-900">{legacyProfile?.name}</h3>
            {legacyProfile?.category_slug && (
              <span className="mt-1 inline-flex items-center rounded-full bg-tuungane-orange/10 px-2.5 py-0.5 text-xs font-semibold text-tuungane-orange">
                {legacyProfile.category_slug}
              </span>
            )}
            
            <div className="mt-6 w-full space-y-3 text-sm text-gray-600">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-medium text-gray-900">Email</span>
                <span>{legacyProfile?.auth_email || "Not provided"}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-medium text-gray-900">Phone</span>
                <span>{legacyProfile?.phone || "Not provided"}</span>
              </div>
              {legacyProfile?.bio && (
                <div className="pt-2">
                  <span className="block font-medium text-gray-900 mb-1">Bio</span>
                  <p className="text-gray-500 line-clamp-3">{legacyProfile.bio}</p>
                </div>
              )}
            </div>
          </div>
          
          {error && (
            <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button 
            className="w-full bg-tuungane-blue hover:bg-tuungane-blue/90" 
            size="lg"
            onClick={handleConfirmAccount}
            disabled={sendingLink}
          >
            {sendingLink ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Link...</>
            ) : (
              <><Mail className="mr-2 h-4 w-4" /> Yes, send me a login link!</>
            )}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full text-gray-500 hover:text-gray-900"
            onClick={handleDismiss}
            disabled={sendingLink}
          >
            No, continue with my new account
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
