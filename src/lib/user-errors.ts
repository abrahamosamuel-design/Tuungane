/**
 * Convert raw backend / network errors into plain-language messages
 * with a hint about what the user can do next.
 *
 * Keep these short, calm, and action-oriented — no codes, no stack traces.
 */
import { toast } from "sonner";

type AnyError = unknown;

const NETWORK_HINT = "Check your internet connection and try again.";

export type UserErrorKind =
  | "offline"
  | "auth_expired"
  | "forbidden"
  | "duplicate"
  | "rate_limit"
  | "server"
  | "invalid_credentials"
  | "email_not_confirmed"
  | "already_registered"
  | "invalid_otp"
  | "unknown";

export function toUserMessage(err: AnyError, fallback = "Something didn't work"): {
  title: string;
  description?: string;
  kind?: UserErrorKind;
} {
  if (!err) return { title: fallback };
  if (typeof err === "string") return { title: fallback, description: err };

  const raw = (err as any).message ?? "";
  const code = (err as any).code ?? "";
  const status = (err as any).status ?? 0;
  const msg = String(raw).toLowerCase();

  if (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed")
  ) {
    return { title: "You appear to be offline", description: NETWORK_HINT, kind: "offline" };
  }

  if (status === 401 || code === "PGRST301" || msg.includes("jwt") || msg.includes("not authenticated")) {
    return { title: "Please sign in again", description: "Your session expired.", kind: "auth_expired" };
  }
  if (status === 403 || code === "42501" || msg.includes("permission denied") || msg.includes("row-level security")) {
    return { title: "You don't have access to do that", description: "If this seems wrong, contact support.", kind: "forbidden" };
  }

  if (code === "23505" || msg.includes("duplicate key")) {
    return { title: "That already exists", description: "Try a different value.", kind: "duplicate" };
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

  if (status === 429 || msg.includes("rate limit") || msg.includes("too many requests")) {
    return { title: "Too many attempts", description: "Wait a moment and try again.", kind: "rate_limit" };
  }

  if (status >= 500) {
    return { title: "Our service is having trouble", description: "Please try again in a minute.", kind: "server" };
  }

  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
    return { title: "Email or password is incorrect", description: "Double-check, or reset your password below.", kind: "invalid_credentials" };
  }
  if (msg.includes("email not confirmed")) {
    return { title: "Confirm your email first", description: "Check your inbox for a verification link.", kind: "email_not_confirmed" };
  }
  if (msg.includes("user already registered") || msg.includes("already been registered")) {
    return { title: "That email is already registered", description: "Try signing in instead.", kind: "already_registered" };
  }
  if (msg.includes("token has expired") || msg.includes("invalid otp") || msg.includes("otp_expired") || msg.includes("invalid token") || msg.includes("token_not_found")) {
    return { title: "That code didn't work", description: "Request a new code and try again.", kind: "invalid_otp" };
  }

  if (raw && raw.length < 120 && !/[{}<>]/.test(raw)) {
    return { title: fallback, description: raw, kind: "unknown" };
  }
  return { title: fallback, description: "Please try again.", kind: "unknown" };
}

/** Show a user-friendly error toast. */
export function toastError(err: AnyError, fallback = "Something didn't work") {
  const { title, description } = toUserMessage(err, fallback);
  toast.error(title, description ? { description } : undefined);
}
