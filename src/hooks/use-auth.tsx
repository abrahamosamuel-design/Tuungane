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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    const syncAuth = async (sess: Session | null) => {
      setSession(sess);
      setUser(sess?.user ?? null);

      if (sess?.user) {
        const { data } = await supabase.from("user_roles").select("role").eq("user_id", sess.user.id);
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
      signOut: async () => { await supabase.auth.signOut(); },
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
