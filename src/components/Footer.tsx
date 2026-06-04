import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Twitter, Linkedin } from "lucide-react";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-navy text-navy-foreground">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="inline-flex rounded-lg bg-white p-2">
              <Logo className="h-10 w-auto" />
            </div>
            <p className="mt-4 max-w-sm text-sm text-white/70">
              Tuungane connects people with trusted local service providers. Create a request, get matched with skilled providers near you, and leave verified reviews.
            </p>
            <div className="mt-5 flex items-center gap-3">
              {[Facebook, Instagram, Twitter, Linkedin].map((Icon, i) => (
                <a key={i} href="#" aria-label="social" className="rounded-full bg-white/10 p-2 transition hover:bg-orange">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Explore</h4>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              <li><Link to="/services" className="hover:text-orange">Services</Link></li>
              <li><Link to="/requests/browse" className="hover:text-orange">Requests</Link></li>
              <li><Link to="/about" className="hover:text-orange">About</Link></li>
              <li><Link to="/contact" className="hover:text-orange">Contact</Link></li>
              <li><Link to="/terms" className="hover:text-orange">Terms & Safety</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">For providers</h4>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              <li><Link to="/login" className="hover:text-orange">Post your skill</Link></li>
              <li><Link to="/login" className="hover:text-orange">Log in</Link></li>
              <li><Link to="/terms" className="hover:text-orange">Verification</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Tuungane. All rights reserved.</p>
          <p>Made with care in Uganda. Expanding soon.</p>
        </div>
      </div>
    </footer>
  );
}
