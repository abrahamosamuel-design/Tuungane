import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { MobileBottomNav } from "./MobileBottomNav";
import { RequestFab } from "./RequestFab";
import { OfflineBanner } from "./OfflineBanner";

export function Layout({ children, hideFooter = false }: { children: ReactNode; hideFooter?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <OfflineBanner />
      <Header />
      <main className="flex-1">{children}</main>
      {!hideFooter && <Footer />}
      <RequestFab />
      <MobileBottomNav />
    </div>
  );
}
