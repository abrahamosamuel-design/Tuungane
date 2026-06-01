/**
 * QA runner: verify credit purchase requests & transactions are consistent for a user.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... bun run scripts/qa-credits.ts <user_id>
 *   # or
 *   bun run scripts/qa-credits.ts <user_id>   (if env vars already exported)
 *
 * Checks:
 *   1. Wallet row exists for user.
 *   2. Wallet balance equals SUM(credit_transactions.amount).
 *   3. Every `paid` purchase request has a matching `purchase_approved` transaction
 *      with amount === credits_requested and related_entity_id === request.id.
 *   4. No `purchase_approved` transaction exists without a corresponding paid request.
 *   5. No purchase request is stuck in `pending` for > 7 days.
 *   6. Every request has a valid status (pending|paid|rejected|cancelled).
 *   7. Rejected/cancelled requests have NO matching purchase_approved transaction.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userId = process.argv[2];

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(2);
}
if (!userId) {
  console.error("Usage: bun run scripts/qa-credits.ts <user_id>");
  process.exit(2);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

type Tx = {
  id: string;
  transaction_type: string;
  amount: number;
  reason: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: string;
};
type Req = {
  id: string;
  package_name: string;
  credits_requested: number;
  amount_ugx: number;
  status: string;
  created_at: string;
};

type Check = { name: string; pass: boolean; detail?: string };
const checks: Check[] = [];
const add = (name: string, pass: boolean, detail?: string) =>
  checks.push({ name, pass, detail });

const VALID_STATUSES = new Set(["pending", "paid", "rejected", "cancelled"]);
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

async function main() {
  const [{ data: wallet, error: wErr }, { data: txs, error: tErr }, { data: reqs, error: rErr }] =
    await Promise.all([
      supabase.from("credit_wallets").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("credit_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .returns<Tx[]>(),
      supabase
        .from("credit_purchase_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .returns<Req[]>(),
    ]);

  if (wErr) throw wErr;
  if (tErr) throw tErr;
  if (rErr) throw rErr;

  const transactions = txs ?? [];
  const requests = reqs ?? [];

  // 1. Wallet exists
  add("Wallet row exists", !!wallet, wallet ? `balance=${wallet.balance}` : "no wallet");

  // 2. Balance reconciles
  const sum = transactions.reduce((s, t) => s + (t.amount || 0), 0);
  add(
    "Wallet balance equals sum(transactions)",
    !!wallet && wallet.balance === sum,
    `wallet=${wallet?.balance ?? "—"} vs sum=${sum} (Δ=${(wallet?.balance ?? 0) - sum})`,
  );

  // 3. Paid request -> matching approved transaction
  const paid = requests.filter((r) => r.status === "paid");
  const approvedTxs = transactions.filter((t) => t.transaction_type === "purchase_approved");
  const unmatchedPaid = paid.filter(
    (r) =>
      !approvedTxs.some(
        (t) =>
          t.related_entity_id === r.id &&
          t.amount === r.credits_requested &&
          t.related_entity_type === "credit_purchase_request",
      ),
  );
  add(
    "Every paid request has matching purchase_approved tx",
    unmatchedPaid.length === 0,
    unmatchedPaid.length
      ? `unmatched: ${unmatchedPaid.map((r) => r.id).join(", ")}`
      : `${paid.length} paid, all matched`,
  );

  // 4. Approved tx without paid request
  const orphanTxs = approvedTxs.filter(
    (t) => !requests.some((r) => r.id === t.related_entity_id && r.status === "paid"),
  );
  add(
    "No orphan purchase_approved transactions",
    orphanTxs.length === 0,
    orphanTxs.length ? `orphans: ${orphanTxs.map((t) => t.id).join(", ")}` : "none",
  );

  // 5. Stuck pending
  const stuck = requests.filter(
    (r) => r.status === "pending" && Date.now() - new Date(r.created_at).getTime() > SEVEN_DAYS_MS,
  );
  add(
    "No pending request older than 7 days",
    stuck.length === 0,
    stuck.length ? `stuck: ${stuck.map((r) => r.id).join(", ")}` : "ok",
  );

  // 6. Valid statuses
  const bad = requests.filter((r) => !VALID_STATUSES.has(r.status));
  add(
    "All requests use a known status",
    bad.length === 0,
    bad.length ? `invalid: ${bad.map((r) => `${r.id}=${r.status}`).join(", ")}` : "ok",
  );

  // 7. Rejected/cancelled must not have approval tx
  const wronglyApproved = requests
    .filter((r) => r.status === "rejected" || r.status === "cancelled")
    .filter((r) => approvedTxs.some((t) => t.related_entity_id === r.id));
  add(
    "Rejected/cancelled requests have no approval tx",
    wronglyApproved.length === 0,
    wronglyApproved.length
      ? `bad: ${wronglyApproved.map((r) => `${r.id}(${r.status})`).join(", ")}`
      : "ok",
  );

  // Report
  console.log(`\nQA report for user ${userId}`);
  console.log(`  wallet balance: ${wallet?.balance ?? "—"}`);
  console.log(`  transactions:   ${transactions.length}`);
  console.log(`  requests:       ${requests.length} (paid=${paid.length}, pending=${requests.filter(r=>r.status==="pending").length})\n`);

  let failed = 0;
  for (const c of checks) {
    const mark = c.pass ? "PASS" : "FAIL";
    console.log(`  [${mark}] ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
    if (!c.pass) failed++;
  }

  console.log(`\n${failed === 0 ? "All checks passed." : `${failed} check(s) failed.`}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("QA runner crashed:", err);
  process.exit(1);
});
