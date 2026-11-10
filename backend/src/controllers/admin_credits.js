import { supabaseAdmin } from "../lib/supabaseClient.js";

export async function getCreditsInfo(req, res) {
  try {
    const [r, w, txsRes, pkgsRes, b, profilesRes, authUsersRes] = await Promise.all([
      supabaseAdmin.from("credit_purchase_requests").select("*").order("created_at", { ascending: false }).limit(500),
      supabaseAdmin.from("credit_wallets").select("*").order("balance", { ascending: false }).limit(500),
      supabaseAdmin.from("credit_transactions").select("*").order("created_at", { ascending: false }).limit(500),
      supabaseAdmin.from("credit_packages").select("*").eq("active", true).order("sort_order"),
      supabaseAdmin.from("boosts").select("*").eq("status", "active").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(100),
      supabaseAdmin.from("profiles").select("id,full_name,avatar_url,is_provider,phone"),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }).catch(() => ({ data: { users: [] } })),
    ]);

    const authMap = new Map();
    for (const u of authUsersRes?.data?.users || []) {
      authMap.set(u.id, {
        email: u.email || u.user_metadata?.email || null,
        phone: u.phone || u.user_metadata?.phone || null,
      });
    }

    const profMap = new Map(
      (profilesRes.data || []).map((p) => {
        const ac = authMap.get(p.id) || {};
        return [
          p.id,
          {
            full_name: p.full_name || "Unnamed User",
            avatar_url: p.avatar_url || null,
            is_provider: !!p.is_provider,
            email: ac.email || null,
            phone: p.phone || ac.phone || null,
          },
        ];
      })
    );

    const getProf = (uid) =>
      profMap.get(uid) || {
        full_name: uid ? `User ${uid.slice(0, 8)}` : "Unknown",
        avatar_url: null,
        is_provider: false,
        email: authMap.get(uid)?.email || null,
        phone: authMap.get(uid)?.phone || null,
      };

    const reqs = (r.data || []).map((reqRow) => {
      const prof = getProf(reqRow.user_id);
      return {
        ...reqRow,
        profile: prof,
        contact: { email: prof.email || null, phone: prof.phone || null },
      };
    });

    const transactions = (txsRes.data || []).map((tx) => {
      const prof = getProf(tx.user_id);
      return {
        ...tx,
        type: tx.type || tx.transaction_type || "credit",
        source: tx.source || tx.reason || tx.description || tx.transaction_type || null,
        profile: prof,
        contact: { email: prof.email || null, phone: prof.phone || null },
      };
    });

    // Build per-account stats across all wallets, purchase requests, and transactions
    const accountMap = new Map();
    const ensureAccount = (uid) => {
      if (!uid) return null;
      if (!accountMap.has(uid)) {
        const prof = getProf(uid);
        accountMap.set(uid, {
          user_id: uid,
          balance: 0,
          credits_bought: 0,
          amount_paid_ugx: 0,
          purchases_count: 0,
          pending_credits: 0,
          pending_amount_ugx: 0,
          starter_credits: 0,
          admin_credits: 0,
          credits_spent: 0,
          last_purchase_at: null,
          profile: prof,
          contact: { email: prof.email || null, phone: prof.phone || null },
        });
      }
      return accountMap.get(uid);
    };

    for (const wallet of w.data || []) {
      const acc = ensureAccount(wallet.user_id);
      if (acc) acc.balance = Number(wallet.balance || 0);
    }

    for (const pr of r.data || []) {
      const acc = ensureAccount(pr.user_id);
      if (!acc) continue;
      if (pr.status === "paid" || pr.status === "approved") {
        acc.credits_bought += Number(pr.credits_requested || 0);
        acc.amount_paid_ugx += Number(pr.amount_ugx || 0);
        acc.purchases_count += 1;
        if (!acc.last_purchase_at || new Date(pr.created_at) > new Date(acc.last_purchase_at)) {
          acc.last_purchase_at = pr.created_at;
        }
      } else if (pr.status === "pending") {
        acc.pending_credits += Number(pr.credits_requested || 0);
        acc.pending_amount_ugx += Number(pr.amount_ugx || 0);
      }
    }

    let totalStarterCredits = 0;
    let totalAdminGrantedCredits = 0;
    let totalCreditsSpent = 0;

    for (const tx of txsRes.data || []) {
      const acc = ensureAccount(tx.user_id);
      const amt = Number(tx.amount || 0);
      if (tx.transaction_type === "starter_credit") {
        totalStarterCredits += amt;
        if (acc) acc.starter_credits += amt;
      } else if (tx.transaction_type === "purchase_approved") {
        // already counted via paid credit_purchase_requests; if user had no paid request row, fallback
      } else if (amt > 0) {
        totalAdminGrantedCredits += amt;
        if (acc) acc.admin_credits += amt;
      } else if (amt < 0) {
        totalCreditsSpent += Math.abs(amt);
        if (acc) acc.credits_spent += Math.abs(amt);
      }
    }

    const paidReqs = reqs.filter((x) => x.status === "paid" || x.status === "approved");
    const pendingReqs = reqs.filter((x) => x.status === "pending");
    const rejectedReqs = reqs.filter((x) => x.status === "rejected");

    const totalRevenueUgx = paidReqs.reduce((s, x) => s + Number(x.amount_ugx || 0), 0);
    const pendingRevenueUgx = pendingReqs.reduce((s, x) => s + Number(x.amount_ugx || 0), 0);
    const rejectedAmountUgx = rejectedReqs.reduce((s, x) => s + Number(x.amount_ugx || 0), 0);
    const totalCreditsBought = paidReqs.reduce((s, x) => s + Number(x.credits_requested || 0), 0);
    const pendingCreditsCount = pendingReqs.reduce((s, x) => s + Number(x.credits_requested || 0), 0);
    const uniqueBuyersCount = new Set(paidReqs.map((x) => x.user_id)).size;
    const totalWalletBalance = Array.from(accountMap.values()).reduce((s, x) => s + Number(x.balance || 0), 0);

    // Deduplicate packages by name and compute sales per package
    const pkgSalesMap = new Map();
    for (const pr of paidReqs) {
      const key = pr.package_name || "Custom";
      const cur = pkgSalesMap.get(key) || {
        name: key,
        package_name: key,
        count: 0,
        credits: 0,
        credits_sold: 0,
        revenueUgx: 0,
        revenue_ugx: 0,
      };
      cur.count += 1;
      cur.credits += Number(pr.credits_requested || 0);
      cur.credits_sold += Number(pr.credits_requested || 0);
      cur.revenueUgx += Number(pr.amount_ugx || 0);
      cur.revenue_ugx += Number(pr.amount_ugx || 0);
      pkgSalesMap.set(key, cur);
    }

    const walletsList = Array.from(accountMap.values()).sort((a, b) => {
      if (b.credits_bought !== a.credits_bought) return b.credits_bought - a.credits_bought;
      if (b.pending_credits !== a.pending_credits) return b.pending_credits - a.pending_credits;
      return b.balance - a.balance;
    });

    res.json({
      data: {
        summary: {
          totalRevenueUgx,
          pendingRevenueUgx,
          rejectedAmountUgx,
          rejectedRevenueUgx: rejectedAmountUgx,
          totalCreditsBought,
          pendingCreditsCount,
          pendingCreditsTotal: pendingCreditsCount,
          paidPurchasesCount: paidReqs.length,
          paidRequestsCount: paidReqs.length,
          pendingPurchasesCount: pendingReqs.length,
          pendingRequestsCount: pendingReqs.length,
          rejectedPurchasesCount: rejectedReqs.length,
          uniqueBuyersCount,
          totalStarterCredits,
          totalAdminGrantedCredits,
          totalAdminAddedCredits: totalAdminGrantedCredits,
          totalCreditsSpent,
          totalWalletBalance,
          packageBreakdown: Array.from(pkgSalesMap.values()),
        },
        reqs,
        wallets: walletsList,
        transactions: transactions.slice(0, 100),
        boosts: (b.data || []).map((boost) => ({
          ...boost,
          profile: getProf(boost.user_id),
        })),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function approveRequest(req, res) {
  try {
    const { id } = req.params;
    const { payment_reference } = req.body;
    const adminId = req.user?.id || null;

    const { data: pr, error: prErr } = await supabaseAdmin
      .from("credit_purchase_requests")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (prErr) throw prErr;
    if (!pr) return res.status(404).json({ error: "Purchase request not found" });
    if (pr.status === "paid" || pr.status === "approved") {
      return res.status(400).json({ error: "Purchase request is already approved" });
    }

    const now = new Date().toISOString();
    const { error: updErr } = await supabaseAdmin
      .from("credit_purchase_requests")
      .update({
        status: "paid",
        payment_reference: payment_reference || pr.payment_reference || null,
        reviewed_by_admin_id: adminId,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", id);

    if (updErr) throw updErr;

    // Add credits to user's wallet
    const { data: existingWallet } = await supabaseAdmin
      .from("credit_wallets")
      .select("*")
      .eq("user_id", pr.user_id)
      .maybeSingle();

    const addAmt = Number(pr.credits_requested || 0);
    if (existingWallet) {
      await supabaseAdmin
        .from("credit_wallets")
        .update({
          balance: Number(existingWallet.balance || 0) + addAmt,
          updated_at: now,
        })
        .eq("user_id", pr.user_id);
    } else {
      await supabaseAdmin.from("credit_wallets").insert({
        user_id: pr.user_id,
        balance: addAmt,
        starter_credits_awarded: false,
      });
    }

    // Record credit transaction
    await supabaseAdmin.from("credit_transactions").insert({
      user_id: pr.user_id,
      transaction_type: "purchase_approved",
      amount: addAmt,
      reason: `Purchase approved: ${pr.package_name}`,
      related_entity_type: "credit_purchase_request",
      related_entity_id: pr.id,
      created_by_admin_id: adminId,
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function rejectRequest(req, res) {
  try {
    const { id } = req.params;
    const { admin_note } = req.body;
    const adminId = req.user?.id || null;
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from("credit_purchase_requests")
      .update({
        status: "rejected",
        admin_note: admin_note || null,
        reviewed_by_admin_id: adminId,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function addCredits(req, res) {
  try {
    const { user_id, amount, reason } = req.body;
    const numAmount = Number(amount);
    if (!user_id || isNaN(numAmount) || numAmount === 0) {
      return res.status(400).json({ error: "Valid user_id and non-zero amount required" });
    }

    const adminId = req.user?.id || null;
    const now = new Date().toISOString();

    const { data: existingWallet } = await supabaseAdmin
      .from("credit_wallets")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    if (existingWallet) {
      const nextBalance = Math.max(0, Number(existingWallet.balance || 0) + numAmount);
      const { error: wErr } = await supabaseAdmin
        .from("credit_wallets")
        .update({ balance: nextBalance, updated_at: now })
        .eq("user_id", user_id);
      if (wErr) throw wErr;
    } else {
      const { error: wErr } = await supabaseAdmin.from("credit_wallets").insert({
        user_id,
        balance: Math.max(0, numAmount),
        starter_credits_awarded: false,
      });
      if (wErr) throw wErr;
    }

    await supabaseAdmin.from("credit_transactions").insert({
      user_id,
      transaction_type: "admin_adjustment",
      amount: numAmount,
      reason: reason || "Manual credit adjustment by admin",
      created_by_admin_id: adminId,
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function expireBoost(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from("boosts")
      .update({ status: "expired", expires_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
