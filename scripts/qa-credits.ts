/**
 * QA runner: verify credit purchase requests & transactions are consistent.
 *
 * Single user:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... bun run scripts/qa-credits.ts <user_id>
 *
 * Batch mode:
 *   bun run scripts/qa-credits.ts --batch <uid1> <uid2> <uid3> ...
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(2);
}

const args = process.argv.slice(2);
const batchMode = args.includes("--batch");
const userIds = batchMode ? args.filter((a) => a !== "--batch") : args;

if (userIds.length === 0) {
  console.error("Usage: bun run scripts/qa-credits.ts [--batch] <user_id> [<user_id> ...]");
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

type UserResult = {
  userId: string;
  walletBalance: number | null;
  txCount: number;
  reqCount: number;
  paidCount: number;
  pendingCount: number;
  checks: Check[];
  failed: number;
};

const VALID_STATUSES = new Set(["pending", "paid", "rejected", "cancelled"]);
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

async function runForUser(userId: string): Promise<UserResult> {
  const checks: Check[] = [];
  const add = (name: string, pass: boolean, detail?: string) =>
    checks.push({ name, pass, detail });

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

  const failed = checks.filter((c) => !c.pass).length;
  return {
    userId,
    walletBalance: wallet?.balance ?? null,
    txCount: transactions.length,
    reqCount: requests.length,
    paidCount: paid.length,
    pendingCount: requests.filter((r) => r.status === "pending").length,
    checks,
    failed,
  };
}

function printUserReport(res: UserResult) {
  console.log(`\nQA report for user ${res.userId}`);
  console.log(
    `  wallet balance: ${res.walletBalance ?? "—"} | txs: ${res.txCount} | reqs: ${res.reqCount} (paid=${res.paidCount}, pending=${res.pendingCount})`,
  );
  for (const c of res.checks) {
    const mark = c.pass ? "PASS" : "FAIL";
    console.log(`    [${mark}] ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  }
  console.log(`  ${res.failed === 0 ? "All checks passed." : `${res.failed} check(s) failed.`}`);
}

function printSummary(results: UserResult[]) {
  const total = results.length;
  const allPassed = results.filter((r) => r.failed === 0).length;
  const someFailed = total - allPassed;

  console.log("\n========================================");
  console.log("          CONSOLIDATED SUMMARY          ");
  console.log("========================================");
  console.log(`Users scanned:  ${total}`);
  console.log(`All passed:     ${allPassed}`);
  console.log(`With failures:  ${someFailed}`);
  console.log("----------------------------------------");

  if (someFailed > 0) {
    console.log("\nMismatches / failures by user:");
    for (const r of results.filter((x) => x.failed > 0)) {
      const fails = r.checks.filter((c) => !c.pass);
      console.log(`\n  ${r.userId} (${r.failed} fail(s)):`);
      for (const c of fails) {
        console.log(`    - ${c.name}: ${c.detail ?? ""}`);
      }
    }
  }

  // Per-check aggregation
  console.log("\nPer-check pass/fail across all users:");
  const checkNames = results[0]?.checks.map((c) => c.name) ?? [];
  for (const name of checkNames) {
    let pass = 0;
    let fail = 0;
    for (const r of results) {
      const c = r.checks.find((x) => x.name === name);
      if (c?.pass) pass++;
      else fail++;
    }
    const status = fail === 0 ? "✓" : "✗";
    console.log(`  ${status} ${name}: ${pass} pass / ${fail} fail`);
  }

  console.log("\n========================================");
}

async function main() {
  const results: UserResult[] = [];

  for (const uid of userIds) {
    try {
      const res = await runForUser(uid);
      results.push(res);
      if (!batchMode) printUserReport(res);
    } catch (err) {
      console.error(`\nError processing user ${uid}:`, err);
      results.push({
        userId: uid,
        walletBalance: null,
        txCount: 0,
        reqCount: 0,
        paidCount: 0,
        pendingCount: 0,
        checks: [{ name: "Script execution", pass: false, detail: String(err) }],
        failed: 1,
      });
    }
  }

  if (batchMode) {
    // In batch mode, print a compact line per user first, then summary
    console.log("\nQuick per-user overview:");
    console.log("User ID                                 | Balance | Txs | Reqs | Paid | Pend | Fails");
    console.log("-".repeat(90));
    for (const r of results) {
      const id = r.userId.padEnd(40);
      const bal = (r.walletBalance ?? "—").toString().padStart(7);
      console.log(`${id} | ${bal} | ${r.txCount.toString().padStart(3)} | ${r.reqCount.toString().padStart(4)} | ${r.paidCount.toString().padStart(4)} | ${r.pendingCount.toString().padStart(4)} | ${r.failed}`);
    }
  }

  printSummary(results);

  const anyFailed = results.some((r) => r.failed > 0);
  process.exit(anyFailed ? 1 : 0);
}

main().catch((err) => {
  console.error("QA runner crashed:", err);
  process.exit(1);
});
