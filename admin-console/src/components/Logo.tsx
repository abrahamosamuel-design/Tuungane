export function Logo({ variant = "horizontal", className = "" }: { variant?: "horizontal" | "full"; className?: string }) {
  return (
    <img
      src="/TUUNGANE-CLEAR.png"
      alt="Tuungane — Connect to Opportunity"
      className={className}
      loading="eager"
    />
  );
}
