import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { apiClient } from "@/lib/api";

export type Role = "admin" | "moderator" | "finance_admin" | "user";

const ADMIN_CONSOLE_ROLES: Role[] = ["admin", "moderator", "finance_admin"];

export function hasAdminPrivilege(roles: string[]): boolean {
  return roles.some((r) => ADMIN_CONSOLE_ROLES.includes(r as Role));
}

export async function fetchUserRoles(userId: string, accessToken?: string): Promise<Role[]> {
  let loadedRoles: Role[] = [];
  try {
    const reqInit: RequestInit | undefined = accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined;
    const apiRes = await apiClient<any>("/profiles/me/roles", reqInit);
    const raw = Array.isArray(apiRes?.data) ? apiRes.data : Array.isArray(apiRes) ? apiRes : [];
    loadedRoles = raw.map((r: any) => (typeof r === "object" && r?.role ? r.role : r) as Role);
  } catch (e) {
    console.warn("API role fetch failed, trying direct Supabase query...", e);
  }

  if (!loadedRoles.length) {
    try {
      const { data: dbRoles, error: dbErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (!dbErr && dbRoles && dbRoles.length) {
        loadedRoles = dbRoles.map((r: any) => r.role as Role);
      }
    } catch (err2) {
      console.error("Direct role query also failed:", err2);
    }
  }

  return loadedRoles;
}

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
  user: null,
  session: null,
  loading: true,
  isAuthenticated: false,
  roles: [],
  isAdmin: false,
  isModerator: false,
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
    let mounted = true;

    const enforceRememberMeOnce = async (sess: Session | null): Promise<Session | null> => {
      if (!sess || typeof window === "undefined") return sess;
      if (initialChecked) return sess;
      initialChecked = true;

      const remember = localStorage.getItem(REMEMBER_KEY);
      if (remember !== "false") {
        sessionStorage.setItem(SESSION_ACTIVE_KEY, "true");
        return sess;
      }
      const active = sessionStorage.getItem(SESSION_ACTIVE_KEY);
      if (!active) {
        await supabase.auth.signOut();
        return null;
      }
      return sess;
    };

    const syncAuth = async (sess: Session | null) => {
      if (!mounted) return;
      setLoading(true);

      const effective = await enforceRememberMeOnce(sess);
      let loadedRoles: Role[] = [];

      if (effective?.user) {
        loadedRoles = await fetchUserRoles(effective.user.id, effective.access_token);
      }

      if (!mounted) return;
      setSession(effective);
      setUser(effective?.user ?? null);
      setRoles(loadedRoles);
      setLoading(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      // Defer out of onAuthStateChange callback to prevent Supabase JS v2 internal auth lock deadlock
      setLoading(true);
      setTimeout(() => {
        void syncAuth(sess);
      }, 0);
    });

    void supabase.auth.getSession().then(({ data }) => syncAuth(data.session));

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      session,
      loading,
      isAuthenticated: !!session?.user,
      roles,
      isAdmin: roles.includes("admin"),
      isModerator: hasAdminPrivilege(roles),
      signOut: async () => {
        await supabase.auth.signOut();
        if (typeof window !== "undefined") {
          localStorage.removeItem(REMEMBER_KEY);
          sessionStorage.removeItem(SESSION_ACTIVE_KEY);
          window.location.href = "/login";
        }
      },
    }),
    [user, session, loading, roles]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
