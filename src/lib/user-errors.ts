/**
 * Convert raw backend / network errors into plain-language messages
 * with a hint about what the user can do next.
 *
 * Keep these short, calm, and action-oriented — no codes, no stack traces.
 */
import { toast } from "sonner";

type AnyError = unknown;

const NETWORK_HINT = "Check your internet connection and try again.";

export function toUserMessage(err: AnyError, fallback = "Something didn't work"): {
  title: string;
  description?: string;
} {
  if (!err) return { title: fallback };
  if (typeof err === "string") return { title: fallback, description: err };

  const raw = (err as any).message ?? "";
  const code = (err as any).code ?? "";
  const status = (err as any).status ?? 0;
  const msg = String(raw).toLowerCase();

  // Network / offline
  if (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed")
  ) {
    return { title: "You appear to be offline", description: NETWORK_HINT };
  }

  // Auth
  if (status === 401 || code === "PGRST301" || msg.includes("jwt") || msg.includes("not authenticated")) {
    return { title: "Please sign in again", description: "Your session expired." };
  }
  if (status === 403 || code === "42501" || msg.includes("permission denied") || msg.includes("row-level security")) {
    return { title: "You don't have access to do that", description: "If this seems wrong, contact support." };
  }

  // Common Postgres codes
  if (code === "23505" || msg.includes("duplicate key")) {
    return { title: "That already exists", description: "Try a different value." };
  }
  if (code === "23503") {
    return { title: "Couldn't save — related item is missing", description: "Refresh and try again." };
  }
  if (code === "23514" || msg.includes("violates check constraint")) {
    return { title: "Some details aren't valid", description: "Please review the highlighted fields." };
  }
  if (code === "22P02") {
    return { title: "Some details aren't in the right format", description: "Please review the highlighted fields." };
  }

  // Rate limit
  if (status === 429 || msg.includes("rate limit")) {
    return { title: "Too many attempts", description: "Wait a moment and try again." };
  }

  // Server
  if (status >= 500) {
    return { title: "Our service is having trouble", description: "Please try again in a minute." };
  }

  // Supabase auth specific
  if (msg.includes("invalid login credentials")) {
    return { title: "Email or password is incorrect", description: "Double-check and try again." };
  }
  if (msg.includes("email not confirmed")) {
    return { title: "Confirm your email first", description: "Check your inbox for a verification link." };
  }
  if (msg.includes("user already registered")) {
    return { title: "That email is already registered", description: "Try signing in instead." };
  }

  // Fallback — show raw only if it looks human
  if (raw && raw.length < 120 && !/[{}<>]/.test(raw)) {
    return { title: fallback, description: raw };
  }
  return { title: fallback, description: "Please try again." };
}

/** Show a user-friendly error toast. */
export function toastError(err: AnyError, fallback = "Something didn't work") {
  const { title, description } = toUserMessage(err, fallback);
  toast.error(title, description ? { description } : undefined);
}
