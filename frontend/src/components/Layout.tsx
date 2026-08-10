import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { MobileBottomNav } from "./MobileBottomNav";
import { RequestFab } from "./RequestFab";
import { OfflineBanner } from "./OfflineBanner";
import { AuthGateProvider } from "./RequireAuthDialog";
import { useAuth } from "@/hooks/use-auth";
import { Link, useMatches } from "@tanstack/react-router";

export function Layout({ children }: { children: ReactNode }) {
  const matches = useMatches();
  
  const hideFooter = matches.some((m) => m.staticData?.hideFooter);
  const hideBottomNavOnMobileUnauth = matches.some((m) => m.staticData?.hideBottomNavOnMobileUnauth);
  const hideBottomNavOnMobile = matches.some((m) => m.staticData?.hideBottomNavOnMobile);
  const hideHeaderOnMobile = matches.some((m) => m.staticData?.hideHeaderOnMobile);
  const hideHeader = matches.some((m) => m.staticData?.hideHeader);

  const { user } = useAuth();
  const shouldHideFooter = hideFooter || !!user;

  const headerPaddingClass = hideHeader 
    ? "" 
    : hideHeaderOnMobile 
      ? "md:pt-[4.5rem] lg:pt-[5rem]" 
      : "pt-14 md:pt-[4.5rem] lg:pt-[5rem]";

  return (
    <AuthGateProvider>
      <div className="flex min-h-dvh flex-col relative bg-background overflow-x-hidden">
        <OfflineBanner />
        
        {/* Conditionally hide Header on mobile or entirely for specific routes */}
        {!hideHeader && (
          <div className={`${hideHeaderOnMobile ? "hidden md:block" : ""} sticky top-0 z-50`}>
            <Header />
          </div>
        )}

        <main className={`flex-1 w-full min-w-0 flex flex-col ${headerPaddingClass}`}>{children}</main>
        {!shouldHideFooter && <Footer />}
        <RequestFab />
        
        {hideBottomNavOnMobile ? (
          <div className="hidden md:block">
            <MobileBottomNav />
          </div>
        ) : hideBottomNavOnMobileUnauth && !user ? (
          <div className="hidden md:block">
            <MobileBottomNav />
          </div>
        ) : (
          <MobileBottomNav />
        )}
      </div>
    </AuthGateProvider>
  );
}
