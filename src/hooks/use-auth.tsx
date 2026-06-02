import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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
    const enforceRememberMe = async (sess: Session | null): Promise<Session | null> => {
      if (!sess || typeof window === "undefined") return sess;
      const remember = localStorage.getItem(REMEMBER_KEY);
      if (remember === "false") {
        const active = sessionStorage.getItem(SESSION_ACTIVE_KEY);
        if (!active) {
          // Fresh browser session — user opted out of persistence
          await supabase.auth.signOut();
          localStorage.removeItem(REMEMBER_KEY);
          return null;
        }
        sessionStorage.setItem(SESSION_ACTIVE_KEY, "true");
      }
      return sess;
    };

    const syncAuth = async (sess: Session | null) => {
      const effective = await enforceRememberMe(sess);
      setSession(effective);
      setUser(effective?.user ?? null);

      if (effective?.user) {
        const { data } = await supabase.from("user_roles").select("role").eq("user_id", effective.user.id);
        setRoles((data ?? []).map((r) => r.role as Role));
      } else {
        setRoles([]);
      }

      setLoading(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      void syncAuth(sess);
    });

    void supabase.auth.getSession().then(({ data }) => syncAuth(data.session));

    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider value={{
      user, session, loading, isAuthenticated: !!session?.user, roles,
      isAdmin: roles.includes("admin"),
      isModerator: roles.includes("admin") || roles.includes("moderator"),
      signOut: async () => {
        await supabase.auth.signOut();
        if (typeof window !== "undefined") {
          localStorage.removeItem(REMEMBER_KEY);
          sessionStorage.removeItem(SESSION_ACTIVE_KEY);
        }
      },
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
