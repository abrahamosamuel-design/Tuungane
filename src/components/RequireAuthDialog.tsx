import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

/**
 * Soft-gate: lets guests browse freely but shows a friendly sign-up prompt
 * when they try to take a protected action (message, call, respond, etc.).
 *
 * Usage:
 *   const { requireAuth } = useAuthGate();
 *   const onClick = () => requireAuth(() => doProtectedThing(), "Sign in to message");
 *
 * `requireAuth(fn)` — if the user is signed in, runs `fn()` and returns true.
 * If not signed in, opens the modal and returns false (fn is not called).
 */

type GateOptions = {
  title?: string;
  message?: string;
  /** Where the sign-in / sign-up buttons should return the user after auth. */
  redirect?: string;
};

type Ctx = {
  requireAuth: (run?: () => void, options?: GateOptions) => boolean;
  isAuthed: boolean;
};

const AuthGateContext = createContext<Ctx | null>(null);

const DEFAULT_TITLE = "Create a free Tuungane account";
const DEFAULT_MESSAGE =
  "Sign up to contact providers, respond to requests, post your own request, and grow your opportunities on Tuungane.";

export function AuthGateProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<GateOptions>({});

  const requireAuth = useCallback(
    (run?: () => void, options?: GateOptions) => {
      if (user) {
        try { run?.(); } catch { /* swallow */ }
        return true;
      }
      setOpts(options ?? {});
      setOpen(true);
      return false;
    },
    [user],
  );

  const ctx = useMemo<Ctx>(() => ({ requireAuth, isAuthed: !!user }), [requireAuth, user]);

  const redirectSearch = opts.redirect
    ? ({ redirect: opts.redirect } as never)
    : (undefined as never);

  return (
    <AuthGateContext.Provider value={ctx}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              {opts.title || DEFAULT_TITLE}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {opts.message || DEFAULT_MESSAGE}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-col gap-2">
            <Link
              to="/signup"
              search={redirectSearch}
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center rounded-full bg-orange px-4 py-2.5 text-sm font-semibold text-orange-foreground hover:brightness-110"
            >
              Create account
            </Link>
            <Link
              to="/login"
              search={redirectSearch}
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold text-navy hover:border-navy"
            >
              Sign in
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-1 text-xs font-medium text-muted-foreground hover:text-navy"
            >
              Continue browsing
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </AuthGateContext.Provider>
  );
}

export function useAuthGate(): Ctx {
  const ctx = useContext(AuthGateContext);
  if (!ctx) {
    // Fallback so it degrades gracefully if used outside the provider.
    return {
      requireAuth: (run) => {
        try { run?.(); } catch { /* swallow */ }
        return true;
      },
      isAuthed: false,
    };
  }
  return ctx;
}
