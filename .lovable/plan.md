## Problem

All four pages (`/feed`, `/credits`, `/dashboard`, `/me`) crash with the same runtime error caught by the route error boundary:

```
cannot add `postgres_changes` callbacks for realtime:wallet:<user-id> after `subscribe()`.
```

Source: `src/hooks/use-credits.ts`. The hook is rendered on every page via `CreditBalanceChip` in the header (Layout), so it brings down every authenticated page.

## Root cause

The realtime effect uses a deterministic channel name `wallet:${user.id}`. Under React StrictMode (dev) and on fast re-renders / route changes, the effect runs twice: the second invocation calls `supabase.channel("wallet:<id>")`, which **returns the existing already-subscribed channel** from the previous run, then calls `.on("postgres_changes", ...)` on it — which Supabase rejects after `subscribe()` has been called, throwing the error shown.

The cleanup `removeChannel(ch)` runs, but only after the second effect has already thrown.

## Fix

Edit `src/hooks/use-credits.ts` only:

1. Give each subscription a unique channel name, e.g. `wallet:${user.id}:${crypto.randomUUID()}`, so the second mount never collides with the first.
2. Register `.on(...)` BEFORE calling `.subscribe()` (already the case, keep it) and keep the cleanup that calls `removeChannel`.
3. Defensively wrap the subscription setup in a try/catch that logs but does not throw, so a transient realtime hiccup can never take down the entire app shell again.

No other files need changes. This restores `/feed`, `/credits`, `/dashboard`, `/me`, and every other authenticated route that renders the header.

## Verification

- Navigate to `/feed`, `/credits`, `/dashboard`, `/me` — pages render normally.
- Console no longer shows the `postgres_changes ... after subscribe()` error.
- Credit balance chip still updates in realtime when the wallet row changes.
