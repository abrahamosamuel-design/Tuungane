import { Link } from "@tanstack/react-router";
import { Coins } from "lucide-react";
import { useCreditWallet } from "@/hooks/use-credits";

export function CreditBalanceChip({ className = "" }: { className?: string }) {
  const { balance } = useCreditWallet();
  if (balance === null) return null;
  return (
    <Link
      to="/credits"
      className={`inline-flex items-center gap-1.5 rounded-full border border-orange/40 bg-orange/10 px-3 py-1 text-sm font-semibold text-orange transition hover:bg-orange/20 ${className}`}
      title="Tuungane Credits"
    >
      <Coins className="h-3.5 w-3.5" />
      {balance.toLocaleString()}
      <span className="hidden sm:inline text-xs font-medium opacity-80">credits</span>
    </Link>
  );
}
