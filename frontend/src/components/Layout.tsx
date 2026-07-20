import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { MobileBottomNav } from "./MobileBottomNav";
import { RequestFab } from "./RequestFab";
import { OfflineBanner } from "./OfflineBanner";
import { InstallPrompt } from "./InstallPrompt";
import { AuthGateProvider } from "./RequireAuthDialog";
import { useAuth } from "@/hooks/use-auth";
import { Link, useMatches } from "@tanstack/react-router";

export function Layout({ children }: { children: ReactNode }) {
  const matches = useMatches();
  
  const hideFooter = matches.some((m) => m.staticData?.hideFooter);
  const hideBottomNavOnMobileUnauth = matches.some((m) => m.staticData?.hideBottomNavOnMobileUnauth);
  const hideHeaderOnMobile = matches.some((m) => m.staticData?.hideHeaderOnMobile);

  const { user } = useAuth();
  const shouldHideFooter = hideFooter || !!user;

  return (
    <AuthGateProvider>
      <div className="flex min-h-dvh flex-col relative bg-background">
        <OfflineBanner />
        
        {/* Conditionally hide Header on mobile or entirely for specific routes */}
        <div className={`${hideHeaderOnMobile ? "hidden md:block" : ""} sticky top-0 z-50`}>
          <Header />
        </div>

        <main className="flex-1">{children}</main>
        {!shouldHideFooter && <Footer />}
        <RequestFab />
        
        {hideBottomNavOnMobileUnauth && !user ? (
          <div className="hidden md:block">
            <MobileBottomNav />
          </div>
        ) : (
          <MobileBottomNav />
        )}
        <InstallPrompt />
      </div>
    </AuthGateProvider>
  );
}
