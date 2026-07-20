import { supabaseAdmin } from "../lib/supabaseClient.js";

export async function getPackages(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from("credit_packages")
      .select("*")
      .eq("active", true)
      .order("sort_order");

    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) {
    console.error("Error fetching credit packages:", error);
    res.status(500).json({ error: error.message });
  }
}

export async function getPersonal(req, res) {
  try {
    const userId = req.user.id;
    const [ { data: txs, error: txsError }, { data: reqs, error: reqsError } ] = await Promise.all([
      supabaseAdmin
        .from("credit_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("credit_purchase_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20)
    ]);

    if (txsError) throw txsError;
    if (reqsError) throw reqsError;

    res.json({
      data: {
        transactions: txs || [],
        requests: reqs || []
      }
    });
  } catch (error) {
    console.error("Error fetching personal credit data:", error);
    res.status(500).json({ error: error.message });
  }
}

export async function getWallet(req, res) {
  try {
    const userId = req.user.id;
    const { data, error } = await supabaseAdmin
      .from("credit_wallets")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();
      
    if (error) throw error;
    res.json({ data: data || { balance: 0 } });
  } catch (error) {
    console.error("Error fetching credit wallet balance:", error);
    res.status(500).json({ error: error.message });
  }
}

export async function requestPurchase(req, res) {
  try {
    const userId = req.user.id;
    const { package_id, package_name, credits, amount_ugx } = req.body;

    const { data, error } = await supabaseAdmin
      .from("credit_purchase_requests")
      .insert({
        user_id: userId,
        package_id,
        package_name,
        credits_requested: credits,
        amount_ugx,
        status: "pending"
      })
      .select("*")
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (error) {
    console.error("Error submitting purchase request:", error);
    res.status(500).json({ error: error.message });
  }
}

export async function cancelRequest(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from("credit_purchase_requests")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("user_id", userId) // Ensure user owns it
      .select("*")
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (error) {
    console.error("Error cancelling purchase request:", error);
    res.status(500).json({ error: error.message });
  }
}

export const getBoostPricing = async (req, res) => {
  try {
    const { type } = req.query;
    let query = supabaseAdmin
      .from('boost_pricing')
      .select('*')
      .eq('active', true)
      .order('sort_order');

    if (type) {
      query = query.eq('boost_type', type);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ data });
  } catch (err) {
    console.error('Error fetching boost pricing:', err);
    res.status(500).json({ error: 'Failed to fetch boost pricing' });
  }
};

export const getActiveBoosts = async (req, res) => {
  try {
    const { entity_type, entity_id } = req.query;
    if (!entity_id) return res.json({ data: [] });

    const { data, error } = await supabaseAdmin
      .from('active_boosts_public')
      .select('id,boost_type,entity_type,entity_id,starts_at,expires_at,status')
      .eq('entity_type', entity_type)
      .eq('entity_id', entity_id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString());

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error fetching active boosts:', err);
    res.status(500).json({ error: 'Failed to fetch active boosts' });
  }
};

export const getBoostedSet = async (req, res) => {
  try {
    const { entity_type, types } = req.query;
    const boostTypes = types ? types.split(',') : [];
    if (!boostTypes.length) return res.json({ data: [] });

    const { data, error } = await supabaseAdmin
      .from('active_boosts_public')
      .select('entity_id')
      .eq('entity_type', entity_type)
      .in('boost_type', boostTypes)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString());

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error fetching boosted set:', err);
    res.status(500).json({ error: 'Failed to fetch boosted set' });
  }
};

export const activateBoost = async (req, res) => {
  try {
    const { pricingId, entityType, entityId } = req.body;
    const userId = req.user.id;

    const { data, error } = await supabaseAdmin.rpc('create_boost', {
      _pricing_id: pricingId,
      _entity_type: entityType,
      _entity_id: entityId,
    });

    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("boost_requires_verification")) {
        return res.status(403).json({ error: "Boosts are currently limited to verified profiles. Request verification from your profile to unlock boosting." });
      }
      if (msg.includes("profile_suspended")) {
        return res.status(403).json({ error: "This profile is suspended and cannot be boosted. Contact support for help." });
      }
      if (msg.includes("insufficient_funds")) {
        return res.status(400).json({ error: "Insufficient credits" });
      }
      throw error;
    }
    
    res.json({ data });
  } catch (err) {
    console.error('Error activating boost:', err);
    res.status(500).json({ error: err.message || 'Failed to activate boost' });
  }
};
