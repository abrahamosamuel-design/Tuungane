import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { apiClient } from "@/lib/api";

type Role = "admin" | "moderator" | "user";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  roles: Role[];
  isAdmin: boolean;
  isModerator: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null, session: null, loading: true, isAuthenticated: false, roles: [], isAdmin: false, isModerator: false,
  signOut: async () => {},
});

const REMEMBER_KEY = "tuungane_remember_me";
const SESSION_ACTIVE_KEY = "tuungane_session_active";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    let initialChecked = false;

    const enforceRememberMeOnce = async (sess: Session | null): Promise<Session | null> => {
      if (!sess || typeof window === "undefined") return sess;
      // Only enforce on the very first session check after app load.
      // Token refreshes and other auth events must NOT trigger sign-out.
      if (initialChecked) return sess;
      initialChecked = true;

      const remember = localStorage.getItem(REMEMBER_KEY);
      // Default to "remember" when no preference is stored (legacy sessions).
      if (remember !== "false") {
        sessionStorage.setItem(SESSION_ACTIVE_KEY, "true");
        return sess;
      }
      const active = sessionStorage.getItem(SESSION_ACTIVE_KEY);
      if (!active) {
        // Fresh browser session and user opted out of persistence — sign out.
        await supabase.auth.signOut();
        return null;
      }
      return sess;
    };

    const syncAuth = async (sess: Session | null) => {
      const effective = await enforceRememberMeOnce(sess);
      setSession(effective);
      setUser(effective?.user ?? null);

      setLoading(false);

      if (effective?.user) {
        let loadedRoles: Role[] = [];
        try {
          const apiRes = await apiClient("/profiles/me/roles");
          const raw = Array.isArray(apiRes?.data) ? apiRes.data : (Array.isArray(apiRes) ? apiRes : []);
          loadedRoles = raw.map((r: any) => (typeof r === 'object' && r?.role ? r.role : r) as Role);
        } catch (e) {
          console.warn("API role fetch failed, trying direct Supabase query...", e);
        }

        if (!loadedRoles.length) {
          try {
            const { data: dbRoles, error: dbErr } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", effective.user.id);
            if (!dbErr && dbRoles && dbRoles.length) {
              loadedRoles = dbRoles.map((r: any) => r.role as Role);
            }
          } catch (err2) {
            console.error("Direct role query also failed:", err2);
          }
        }

        console.log("Effective loaded roles for", effective.user.email, ":", loadedRoles);
        setRoles(loadedRoles);
      } else {
        setRoles([]);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      void syncAuth(sess);
    });

    void supabase.auth.getSession().then(({ data }) => syncAuth(data.session));

    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthCtx>(() => ({
    user, session, loading, isAuthenticated: !!session?.user, roles,
    isAdmin: roles.includes("admin"),
    isModerator: roles.includes("admin") || roles.includes("moderator"),
    signOut: async () => {
      await supabase.auth.signOut();
      if (typeof window !== "undefined") {
        localStorage.removeItem(REMEMBER_KEY);
        sessionStorage.removeItem(SESSION_ACTIVE_KEY);
        window.location.href = "/login";
      }
    },
  }), [user, session, loading, roles]);

  return (
    <Ctx.Provider value={value}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
