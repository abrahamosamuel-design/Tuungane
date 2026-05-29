import logo from "@/assets/tuungane-logo.png";
import logoFull from "@/assets/tuungane-logo-full.png";

export function Logo({ variant = "horizontal", className = "" }: { variant?: "horizontal" | "full"; className?: string }) {
  return (
    <img
      src={variant === "full" ? logoFull : logo}
      alt="Tuungane — Connect to Opportunity"
      className={className}
      loading="eager"
    />
  );
}
