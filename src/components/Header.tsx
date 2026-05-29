import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";

const nav = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <Logo className="h-9 w-auto" />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="text-sm font-medium text-foreground/70 transition-colors hover:text-orange"
              activeProps={{ className: "text-orange" }}
              activeOptions={{ exact: n.to === "/" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link to="/login" className="text-sm font-medium text-navy hover:text-orange">Log in</Link>
          <Link
            to="/login"
            className="inline-flex items-center rounded-full bg-orange px-4 py-2 text-sm font-semibold text-orange-foreground shadow-sm transition-all hover:brightness-110"
          >
            Post your skill
          </Link>
        </div>
        <button
          aria-label="Toggle menu"
          className="rounded-md p-2 text-navy md:hidden"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="space-y-1 px-4 py-3">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted"
              >
                {n.label}
              </Link>
            ))}
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="mt-2 block rounded-full bg-orange px-4 py-2 text-center text-sm font-semibold text-orange-foreground"
            >
              Post your skill
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
