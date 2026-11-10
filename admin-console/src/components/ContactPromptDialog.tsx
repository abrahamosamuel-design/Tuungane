import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/PhoneInput";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ContactPromptDialog() {
  const { user, loading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (authLoading || !user || checked) return;

    let mounted = true;
    const checkProfile = async () => {
      try {
        const { data: profile } = await apiClient<{ data: { phone?: string | null } }>("/profiles/me");
        if (mounted) {
          if (!profile?.phone) {
            setOpen(true);
          }
          setChecked(true);
        }
      } catch (e) {
        if (mounted) setChecked(true); // Don't retry infinitely on error
      }
    };
    void checkProfile();

    return () => { mounted = false; };
  }, [user, authLoading, checked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length <= 10) {
      toast.error("Please enter a valid complete phone number.");
      return;
    }
    setBusy(true);
    try {
      await apiClient.put("/profiles/me", { phone });
      toast.success("Phone number saved!");
      setOpen(false);
    } catch (e) {
      toast.error("Failed to save phone number. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent 
        className="w-[calc(100%-2rem)] max-w-lg bg-card/95 backdrop-blur-xl rounded-[2rem] sm:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-border/50 p-6 sm:p-10 overflow-hidden flex flex-col gap-6 [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Decorative blur blobs */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-orange/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-green/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle className="text-center font-display text-2xl font-bold text-navy sm:text-3xl">Add a Contact Number</DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground max-w-sm mx-auto mt-2">
              Please add a phone number to your profile so you can be reached easily.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 mt-2">
            <div>
              <PhoneInput value={phone} onChange={setPhone} required />
            </div>
            <DialogFooter className="mt-2">
              <Button 
                type="submit" 
                disabled={busy || phone.length <= 10} 
                className="rounded-full w-full bg-orange hover:bg-orange/90 text-white font-bold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] px-6 py-6"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                Save Phone
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
