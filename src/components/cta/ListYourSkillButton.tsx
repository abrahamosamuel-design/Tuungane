import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { CTA, listSkillHref } from "@/lib/cta";

type Variant = "solid" | "outline" | "ghost";

const cls: Record<Variant, string> = {
  solid:
    "bg-green text-white hover:brightness-110 shadow-sm",
  outline:
    "border border-green/40 bg-green/5 text-green hover:bg-green/10",
  ghost:
    "text-green hover:underline",
};

export function ListYourSkillButton({
  variant = "solid",
  className = "",
  withIcon = true,
  label,
}: {
  variant?: Variant;
  className?: string;
  withIcon?: boolean;
  label?: string;
}) {
  const { user } = useAuth();
  return (
    <Link
      to={listSkillHref(user)}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${cls[variant]} ${className}`}
    >
      {withIcon && <Sparkles className="h-4 w-4" />}
      {label ?? CTA.listSkill.label}
    </Link>
  );
}
