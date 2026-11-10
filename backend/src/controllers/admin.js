import { supabaseAdmin } from "../lib/supabaseClient.js";

async function fetchAuthContactMap() {
  const cmap = {};
  try {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of data?.users || []) {
      cmap[u.id] = {
        email: u.email || u.user_metadata?.email || null,
        phone: u.phone || u.user_metadata?.phone || null,
      };
    }
  } catch (err) {
    console.warn("Could not list auth users:", err.message);
  }
  return cmap;
}

// Users
export async function getUsers(req, res) {
  try {
    const [
      { data: baseList, error },
      authContacts,
      { data: roles },
      { data: sps },
      { data: pps },
      { data: pts },
      { data: pServices },
      { data: wallets },
      { data: purchases },
    ] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id,full_name,avatar_url,district,town,area,phone,is_provider,registration_status,profile_identity,organisation_name,created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      fetchAuthContactMap(),
      supabaseAdmin.from("user_roles").select("user_id,role"),
      supabaseAdmin.from("service_profiles").select("user_id,business_name,subcategory,verified,suspended,phone,whatsapp,email"),
      supabaseAdmin.from("public_profiles").select("id,owner_id,name,subcategory,verified,suspended,phone,whatsapp,email"),
      supabaseAdmin.from("profile_trust_status").select("profile_id,owner_user_id,manual_level,auto_level"),
      supabaseAdmin.from("profile_services").select("id,profile_id,user_profile_id,active"),
      supabaseAdmin.from("credit_wallets").select("user_id,balance"),
      supabaseAdmin.from("credit_purchase_requests").select("user_id,credits_requested,amount_ugx,status"),
    ]);

    if (error) throw error;

    const spMap = new Map((sps || []).map((s) => [s.user_id, s]));
    const ppByOwner = new Map();
    const ppIdToOwner = new Map();
    for (const pp of pps || []) {
      if (pp.id && pp.owner_id) ppIdToOwner.set(pp.id, pp.owner_id);
      if (pp.owner_id && !ppByOwner.has(pp.owner_id)) {
        ppByOwner.set(pp.owner_id, pp);
      }
    }

    const ptsMap = new Map();
    for (const t of pts || []) {
      const uid = t.owner_user_id || t.profile_id;
      if (uid) ptsMap.set(uid, t);
    }

    const serviceCountMap = new Map();
    for (const s of pServices || []) {
      const ownerId = s.user_profile_id || (s.profile_id ? ppIdToOwner.get(s.profile_id) : null);
      if (ownerId) {
        serviceCountMap.set(ownerId, (serviceCountMap.get(ownerId) || 0) + 1);
      }
    }

    const walletMap = new Map((wallets || []).map((w) => [w.user_id, w.balance || 0]));
    const purchaseStatsMap = new Map();
    for (const pr of purchases || []) {
      if (pr.status === "paid" || pr.status === "approved") {
        const cur = purchaseStatsMap.get(pr.user_id) || { credits_bought: 0, ugx_spent: 0, purchases_count: 0 };
        cur.credits_bought += Number(pr.credits_requested || 0);
        cur.ugx_spent += Number(pr.amount_ugx || 0);
        cur.purchases_count += 1;
        purchaseStatsMap.set(pr.user_id, cur);
      }
    }

    const cmap = {};
    const list = (baseList || []).map((r) => {
      const sp = spMap.get(r.id);
      const pp = ppByOwner.get(r.id);
      const trust = ptsMap.get(r.id);
      const authC = authContacts[r.id] || {};
      const email = authC.email || sp?.email || pp?.email || null;
      const phone = r.phone || sp?.phone || pp?.phone || authC.phone || null;
      cmap[r.id] = { email, phone };

      const isSuspended =
        r.registration_status === "suspended" ||
        !!sp?.suspended ||
        !!pp?.suspended ||
        trust?.manual_level === "suspended";

      let verified = "none";
      if (
        sp?.verified === "featured" ||
        pp?.verified === "featured" ||
        r.registration_status === "featured" ||
        trust?.manual_reason === "featured"
      ) {
        verified = "featured";
      } else if (
        sp?.verified === "verified" ||
        pp?.verified === "verified" ||
        r.registration_status === "verified" ||
        trust?.manual_level === "verified_provider" ||
        trust?.manual_level === "verified_business" ||
        trust?.manual_level === "verified_organization"
      ) {
        verified = "verified";
      }

      const svcCount = serviceCountMap.get(r.id) || (sp ? 1 : 0);
      const pStats = purchaseStatsMap.get(r.id) || { credits_bought: 0, ugx_spent: 0, purchases_count: 0 };

      return {
        ...r,
        email,
        phone,
        suspended: isSuspended,
        verified,
        services_count: svcCount,
        is_provider: !!(r.is_provider || svcCount > 0 || sp || pp),
        business_name: sp?.business_name || pp?.name || r.organisation_name || null,
        subcategory: sp?.subcategory || pp?.subcategory || null,
        credits_balance: walletMap.get(r.id) ?? 0,
        credits_bought: pStats.credits_bought,
        ugx_spent: pStats.ugx_spent,
        purchases_count: pStats.purchases_count,
      };
    });

    const rmap = {};
    for (const r of roles || []) {
      if (["admin", "moderator", "finance_admin"].includes(r.role)) {
        (rmap[r.user_id] ||= []).push(r.role);
      }
    }

    res.json({ data: { users: list, contacts: cmap, roles: rmap } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function getUserDetails(req, res) {
  try {
    const { id } = req.params;
    const [
      { data: profile },
      { data: sp },
      { data: pps },
      { data: roleRows },
      { data: trust },
      { data: wallet },
      { data: purchases },
      authUserRes,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabaseAdmin.from("service_profiles").select("*").eq("user_id", id).maybeSingle(),
      supabaseAdmin.from("public_profiles").select("*").eq("owner_id", id),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", id),
      supabaseAdmin.from("profile_trust_status").select("*").or(`profile_id.eq.${id},owner_user_id.eq.${id}`).limit(1).maybeSingle(),
      supabaseAdmin.from("credit_wallets").select("*").eq("user_id", id).maybeSingle(),
      supabaseAdmin.from("credit_purchase_requests").select("*").eq("user_id", id).order("created_at", { ascending: false }),
      supabaseAdmin.auth.admin.getUserById(id).catch(() => ({ data: { user: null } })),
    ]);

    const pubIds = (pps || []).map((p) => p.id);
    let servicesQuery = supabaseAdmin.from("profile_services").select("*");
    if (pubIds.length > 0) {
      servicesQuery = servicesQuery.or(`profile_id.in.(${pubIds.join(",")}),user_profile_id.eq.${id}`);
    } else {
      servicesQuery = servicesQuery.eq("user_profile_id", id);
    }
    const { data: services } = await servicesQuery.order("created_at", { ascending: false });

    const pp = (pps || [])[0] || null;
    const authUser = authUserRes?.data?.user || null;
    const email = authUser?.email || sp?.email || pp?.email || profile?.org_email || null;
    const phone = profile?.phone || sp?.phone || pp?.phone || authUser?.phone || null;

    const suspended =
      profile?.registration_status === "suspended" ||
      !!sp?.suspended ||
      !!pp?.suspended ||
      trust?.manual_level === "suspended";

    let verified = "none";
    if (
      sp?.verified === "featured" ||
      pp?.verified === "featured" ||
      profile?.registration_status === "featured" ||
      trust?.manual_reason === "featured"
    ) {
      verified = "featured";
    } else if (
      sp?.verified === "verified" ||
      pp?.verified === "verified" ||
      profile?.registration_status === "verified" ||
      trust?.manual_level === "verified_provider" ||
      trust?.manual_level === "verified_business" ||
      trust?.manual_level === "verified_organization"
    ) {
      verified = "verified";
    }

    const paidPurchases = (purchases || []).filter((p) => p.status === "paid" || p.status === "approved");
    const creditsBought = paidPurchases.reduce((sum, p) => sum + Number(p.credits_requested || 0), 0);
    const ugxSpent = paidPurchases.reduce((sum, p) => sum + Number(p.amount_ugx || 0), 0);

    res.json({
      data: {
        profile,
        serviceProfile: sp || (pp ? {
          user_id: id,
          business_name: pp.name,
          subcategory: pp.subcategory,
          category_slug: pp.category_slug,
          bio: pp.bio,
          verified,
          suspended,
        } : (services && services.length > 0) || profile?.is_provider ? {
          user_id: id,
          business_name: services?.[0]?.title || profile?.full_name,
          subcategory: services?.[0]?.subcategory || "General Services",
          category_slug: services?.[0]?.category_slug || "general",
          bio: services?.[0]?.description || profile?.bio,
          verified,
          suspended,
        } : null),
        publicProfiles: pps || [],
        services: services || [],
        roles: (roleRows || []).map((r) => r.role),
        contact: { email, phone },
        suspended,
        verified,
        credits: {
          balance: wallet?.balance ?? 0,
          credits_bought: creditsBought,
          ugx_spent: ugxSpent,
          purchases: purchases || [],
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function toggleRole(req, res) {
  try {
    const { id: userId, role } = req.params;
    const { has } = req.body;
    if (has) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
      if (error) throw error;
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

// Providers
export async function getProviders(req, res) {
  try {
    const [spRes, pubPRes, vssRes, provProfilesRes, ptsRes, allProfilesRes, authContacts] = await Promise.all([
      supabaseAdmin.from("service_profiles").select("user_id, business_name, subcategory, category_slug, verified, suspended, phone, email"),
      supabaseAdmin.from("public_profiles").select("id, owner_id, name, subcategory, category_slug, verified, suspended, avatar_url, phone, email"),
      supabaseAdmin.from("v_search_services_enriched").select("service_id, user_id, business_name, subcategory, category_slug, verified, profile_full_name, final_avatar_url, town, district"),
      supabaseAdmin.from("profiles").select("id, full_name, avatar_url, is_provider, registration_status, district, town, phone").eq("is_provider", true),
      supabaseAdmin.from("profile_trust_status").select("profile_id, owner_user_id, manual_level, manual_reason, auto_level"),
      supabaseAdmin.from("profiles").select("id, full_name, avatar_url, registration_status, district, town, phone"),
      fetchAuthContactMap(),
    ]);

    const profileLookup = new Map((allProfilesRes.data || []).map((p) => [p.id, p]));
    const ptsMap = new Map();
    for (const t of ptsRes.data || []) {
      const uid = t.owner_user_id || t.profile_id;
      if (uid) ptsMap.set(uid, t);
    }

    const map = new Map();

    const getOrSet = (userId) => {
      if (!map.has(userId)) {
        const up = profileLookup.get(userId);
        const authC = authContacts[userId] || {};
        map.set(userId, {
          user_id: userId,
          business_name: null,
          subcategory: "General Services",
          category_slug: null,
          verified: "none",
          suspended: false,
          services_count: 0,
          services: [],
          district: up?.district || null,
          town: up?.town || null,
          email: authC.email || null,
          phone: up?.phone || authC.phone || null,
          profile: {
            full_name: up?.full_name || "Unnamed Provider",
            avatar_url: up?.avatar_url || null,
          },
        });
      }
      return map.get(userId);
    };

    // 1. Add from v_search_services_enriched (active directory listings)
    for (const s of vssRes.data || []) {
      if (!s.user_id) continue;
      const p = getOrSet(s.user_id);
      p.services_count++;
      if (s.business_name && !p.services.includes(s.business_name)) {
        p.services.push(s.business_name);
      }
      if (!p.business_name && s.business_name) p.business_name = s.business_name;
      if ((!p.subcategory || p.subcategory === "General Services") && s.subcategory) p.subcategory = s.subcategory;
      if (!p.category_slug && s.category_slug) p.category_slug = s.category_slug;
      if (!p.district && s.district) p.district = s.district;
      if (!p.town && s.town) p.town = s.town;
      if (s.verified && s.verified !== "none" && s.verified !== "unverified") p.verified = s.verified;
      if (s.profile_full_name && p.profile.full_name === "Unnamed Provider") p.profile.full_name = s.profile_full_name;
      if (s.final_avatar_url && !p.profile.avatar_url) p.profile.avatar_url = s.final_avatar_url;
    }

    // 2. Add / enrich from public_profiles
    for (const pb of pubPRes.data || []) {
      if (!pb.owner_id) continue;
      const p = getOrSet(pb.owner_id);
      if (!p.business_name && pb.name) p.business_name = pb.name;
      if ((!p.subcategory || p.subcategory === "General Services") && pb.subcategory) p.subcategory = pb.subcategory;
      if (!p.category_slug && pb.category_slug) p.category_slug = pb.category_slug;
      if (pb.verified && pb.verified !== "none" && pb.verified !== "unverified") p.verified = pb.verified;
      if (pb.suspended) p.suspended = true;
      if (pb.avatar_url && !p.profile.avatar_url) p.profile.avatar_url = pb.avatar_url;
      if (!p.phone && pb.phone) p.phone = pb.phone;
      if (!p.email && pb.email) p.email = pb.email;
    }

    // 3. Add / enrich from service_profiles
    for (const sp of spRes.data || []) {
      if (!sp.user_id) continue;
      const p = getOrSet(sp.user_id);
      if (!p.business_name && sp.business_name) p.business_name = sp.business_name;
      if ((!p.subcategory || p.subcategory === "General Services") && sp.subcategory) p.subcategory = sp.subcategory;
      if (!p.category_slug && sp.category_slug) p.category_slug = sp.category_slug;
      if (sp.verified && sp.verified !== "none" && sp.verified !== "unverified") p.verified = sp.verified;
      if (sp.suspended) p.suspended = true;
      if (!p.phone && sp.phone) p.phone = sp.phone;
      if (!p.email && sp.email) p.email = sp.email;
    }

    // 4. Enrich with provider user profiles
    for (const up of provProfilesRes.data || []) {
      if (!up.id) continue;
      const p = getOrSet(up.id);
      if (up.full_name && (p.profile.full_name === "Unnamed Provider" || !p.profile.full_name)) {
        p.profile.full_name = up.full_name;
      }
      if (up.avatar_url && !p.profile.avatar_url) {
        p.profile.avatar_url = up.avatar_url;
      }
    }

    // 5. Reconcile verification & suspension from profile_trust_status and profiles.registration_status
    for (const [uid, p] of map.entries()) {
      const up = profileLookup.get(uid);
      const trust = ptsMap.get(uid);

      if (
        up?.registration_status === "suspended" ||
        trust?.manual_level === "suspended"
      ) {
        p.suspended = true;
      }

      if (
        up?.registration_status === "featured" ||
        trust?.manual_reason === "featured"
      ) {
        p.verified = "featured";
      } else if (
        p.verified !== "featured" &&
        (up?.registration_status === "verified" ||
          trust?.manual_level === "verified_provider" ||
          trust?.manual_level === "verified_business" ||
          trust?.manual_level === "verified_organization")
      ) {
        p.verified = "verified";
      }
    }

    const result = Array.from(map.values()).sort((a, b) => {
      const rank = { featured: 3, verified: 2, none: 1, unverified: 1 };
      const rA = rank[a.verified] || 1;
      const rB = rank[b.verified] || 1;
      if (rA !== rB) return rB - rA;
      return b.services_count - a.services_count;
    });

    res.json({ data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function updateProviderStatus(req, res) {
  try {
    const { id } = req.params;
    const { verified, suspended } = req.body;
    const spUpdates = {};
    const ppUpdates = {};
    const profileUpdates = {};

    // Read current state so we don't overwrite verification when toggling suspension or vice versa
    const [{ data: curProfile }, { data: curTrust }] = await Promise.all([
      supabaseAdmin.from("profiles").select("registration_status, is_provider").eq("id", id).maybeSingle(),
      supabaseAdmin.from("profile_trust_status").select("*").eq("profile_kind", "service_profile").eq("profile_id", id).maybeSingle(),
    ]);

    if (verified !== undefined) {
      const normVerified = verified === "unverified" ? "none" : verified;
      spUpdates.verified = normVerified;
      ppUpdates.verified = normVerified;
      ppUpdates.is_featured = normVerified === "featured";
      if (normVerified === "verified" || normVerified === "featured") {
        profileUpdates.is_provider = true;
      }
      if (curProfile?.registration_status !== "suspended" && suspended !== true) {
        profileUpdates.registration_status = normVerified === "none" ? null : normVerified;
      }
    }

    if (suspended !== undefined) {
      spUpdates.suspended = !!suspended;
      ppUpdates.suspended = !!suspended;
      if (suspended) {
        profileUpdates.registration_status = "suspended";
      } else {
        // Restore registration_status to verified/featured if previously verified
        const prevVerified =
          verified !== undefined
            ? verified
            : curTrust?.manual_reason === "featured"
            ? "featured"
            : curTrust?.manual_level === "verified_provider"
            ? "verified"
            : null;
        profileUpdates.registration_status =
          prevVerified && prevVerified !== "none" ? prevVerified : null;
      }
    }

    // Determine profile_trust_status manual_level & manual_reason
    let nextManualLevel = curTrust?.manual_level ?? null;
    let nextManualReason = curTrust?.manual_reason ?? null;

    if (suspended === true) {
      nextManualLevel = "suspended";
      nextManualReason = nextManualReason === "featured" || nextManualReason === "verified" ? nextManualReason : "suspended";
    } else if (suspended === false) {
      if (nextManualReason === "featured" || nextManualReason === "verified") {
        nextManualLevel = "verified_provider";
      } else {
        nextManualLevel = null;
        nextManualReason = null;
      }
    }

    if (verified !== undefined) {
      const normVerified = verified === "unverified" ? "none" : verified;
      if (normVerified === "verified" || normVerified === "featured") {
        if (nextManualLevel !== "suspended") {
          nextManualLevel = "verified_provider";
        }
        nextManualReason = normVerified;
      } else {
        if (nextManualLevel !== "suspended") {
          nextManualLevel = null;
        }
        nextManualReason = null;
      }
    }

    const tasks = [];
    if (Object.keys(spUpdates).length > 0) {
      tasks.push(supabaseAdmin.from("service_profiles").update(spUpdates).eq("user_id", id));
    }
    if (Object.keys(ppUpdates).length > 0) {
      tasks.push(supabaseAdmin.from("public_profiles").update(ppUpdates).eq("owner_id", id));
    }
    if (Object.keys(profileUpdates).length > 0) {
      tasks.push(supabaseAdmin.from("profiles").update(profileUpdates).eq("id", id));
    }

    tasks.push(
      supabaseAdmin.from("profile_trust_status").upsert(
        {
          profile_kind: "service_profile",
          profile_id: id,
          owner_user_id: id,
          auto_level: curTrust?.auto_level || "new",
          manual_level: nextManualLevel,
          manual_reason: nextManualReason,
          manual_set_by: req.user?.id || null,
          manual_set_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "profile_kind,profile_id" }
      )
    );

    await Promise.allSettled(tasks);

    res.json({
      success: true,
      data: {
        user_id: id,
        verified: verified !== undefined ? verified : (nextManualReason === "featured" ? "featured" : nextManualLevel === "verified_provider" ? "verified" : "none"),
        suspended: suspended !== undefined ? !!suspended : nextManualLevel === "suspended",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

// Services
export async function getAdminServices(req, res) {
  try {
    const [
      { data: psRows, error: psErr },
      { data: vssRows },
      { data: profiles },
      { data: pps },
      { data: sps },
      { data: pts },
    ] = await Promise.all([
      supabaseAdmin.from("profile_services").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("v_search_services_enriched").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("profiles").select("id, full_name, avatar_url, registration_status, district, town, phone"),
      supabaseAdmin.from("public_profiles").select("id, owner_id, name, avatar_url, verified, suspended, district, town"),
      supabaseAdmin.from("service_profiles").select("user_id, business_name, verified, suspended, district, town"),
      supabaseAdmin.from("profile_trust_status").select("profile_id, owner_user_id, manual_level, manual_reason"),
    ]);

    if (psErr) throw psErr;

    const profMap = new Map((profiles || []).map((p) => [p.id, p]));
    const ppById = new Map((pps || []).map((p) => [p.id, p]));
    const ppByOwner = new Map((pps || []).filter((p) => p.owner_id).map((p) => [p.owner_id, p]));
    const spByUser = new Map((sps || []).map((s) => [s.user_id, s]));
    const ptsByUser = new Map((pts || []).map((t) => [t.owner_user_id || t.profile_id, t]));

    const resolveProviderMeta = (userId, pubProfileId) => {
      const prof = userId ? profMap.get(userId) : null;
      const pp = (pubProfileId ? ppById.get(pubProfileId) : null) || (userId ? ppByOwner.get(userId) : null);
      const sp = userId ? spByUser.get(userId) : null;
      const trust = userId ? ptsByUser.get(userId) : null;

      const suspended =
        prof?.registration_status === "suspended" ||
        !!sp?.suspended ||
        !!pp?.suspended ||
        trust?.manual_level === "suspended";

      let verified = "none";
      if (
        sp?.verified === "featured" ||
        pp?.verified === "featured" ||
        prof?.registration_status === "featured" ||
        trust?.manual_reason === "featured"
      ) {
        verified = "featured";
      } else if (
        sp?.verified === "verified" ||
        pp?.verified === "verified" ||
        prof?.registration_status === "verified" ||
        trust?.manual_level === "verified_provider" ||
        trust?.manual_level === "verified_business"
      ) {
        verified = "verified";
      }

      return {
        provider_name: pp?.name || sp?.business_name || prof?.full_name || "Provider",
        owner_name: prof?.full_name || pp?.name || "Unknown",
        avatar_url: prof?.avatar_url || pp?.avatar_url || null,
        verified,
        suspended,
        district: prof?.district || pp?.district || sp?.district || null,
        town: prof?.town || pp?.town || sp?.town || null,
      };
    };

    const seenIds = new Set();
    const allServices = [];

    for (const s of psRows || []) {
      seenIds.add(s.id);
      const pp = s.profile_id ? ppById.get(s.profile_id) : null;
      const ownerId = s.user_profile_id || pp?.owner_id || null;
      const meta = resolveProviderMeta(ownerId, s.profile_id);

      allServices.push({
        id: s.id,
        source: "profile_services",
        title: s.title || s.subcategory || "Untitled Service",
        description: s.description || "",
        category_slug: s.category_slug || "general",
        subcategory: s.subcategory || "General",
        active: s.active !== false,
        price_fixed_ugx: s.price_fixed_ugx,
        price_min_ugx: s.price_min_ugx,
        price_max_ugx: s.price_max_ugx,
        price_currency: s.price_currency || "UGX",
        price_note: s.price_note,
        district: s.district || meta.district,
        town: s.town || meta.town,
        photos: s.photos || [],
        owner_id: ownerId,
        provider_name: meta.provider_name,
        owner_name: meta.owner_name,
        avatar_url: meta.avatar_url,
        verified: meta.verified,
        suspended: meta.suspended,
        created_at: s.created_at,
      });
    }

    // Include legacy directory services from v_search_services_enriched not in profile_services
    for (const v of vssRows || []) {
      if (!v.service_id || seenIds.has(v.service_id)) continue;
      seenIds.add(v.service_id);
      const meta = resolveProviderMeta(v.user_id, null);

      allServices.push({
        id: v.service_id,
        source: "directory_profile",
        title: v.business_name || v.subcategory || meta.provider_name || "Service Listing",
        description: v.bio || "",
        category_slug: v.category_slug || "general",
        subcategory: v.subcategory || "General",
        active: !meta.suspended,
        price_fixed_ugx: v.price_fixed_ugx,
        price_min_ugx: v.price_min_ugx,
        price_max_ugx: v.price_max_ugx,
        price_currency: v.price_currency || "UGX",
        price_note: v.price_note,
        district: v.district || meta.district,
        town: v.town || meta.town,
        photos: v.media_urls || (v.cover_url ? [v.cover_url] : []),
        owner_id: v.user_id,
        provider_name: v.business_name || meta.provider_name,
        owner_name: v.profile_full_name || meta.owner_name,
        avatar_url: v.final_avatar_url || meta.avatar_url,
        verified: meta.verified,
        suspended: meta.suspended,
        created_at: v.created_at,
      });
    }

    res.json({
      data: {
        total: allServices.length,
        profileServicesCount: (psRows || []).length,
        activeCount: allServices.filter((s) => s.active && !s.suspended).length,
        services: allServices,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function toggleAdminServiceActive(req, res) {
  try {
    const { id } = req.params;
    const { active } = req.body;
    const { data: updated, error } = await supabaseAdmin
      .from("profile_services")
      .update({ active: !!active })
      .eq("id", id)
      .select("id");
    if (error) throw error;

    // If not in profile_services, it may be a legacy public_profile or service_profile
    if (!updated || updated.length === 0) {
      await Promise.allSettled([
        supabaseAdmin.from("public_profiles").update({ suspended: !active }).eq("id", id),
        supabaseAdmin.from("service_profiles").update({ suspended: !active }).eq("user_id", id),
      ]);
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function deleteAdminService(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from("profile_services").delete().eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

// Posts
export async function getPosts(req, res) {
  try {
    const { data: p, error } = await supabaseAdmin
      .from("timeline_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    const ids = Array.from(new Set((p || []).map((x) => x.provider_user_id).filter(Boolean)));
    const serviceIds = Array.from(new Set((p || []).map((x) => x.service_id).filter(Boolean)));

    const [pmRes, spRes, ptsRes, svcRes] = await Promise.all([
      ids.length > 0
        ? supabaseAdmin.from("profiles").select("id,full_name,avatar_url,is_provider,district,town,registration_status").in("id", ids)
        : Promise.resolve({ data: [] }),
      ids.length > 0
        ? supabaseAdmin.from("service_profiles").select("user_id,business_name,verified").in("user_id", ids)
        : Promise.resolve({ data: [] }),
      ids.length > 0
        ? supabaseAdmin.from("profile_trust_status").select("owner_user_id,profile_id,manual_level").in("owner_user_id", ids)
        : Promise.resolve({ data: [] }),
      serviceIds.length > 0
        ? supabaseAdmin.from("profile_services").select("id,title").in("id", serviceIds)
        : Promise.resolve({ data: [] }),
    ]);

    const spMap = new Map((spRes.data || []).map((x) => [x.user_id, x]));
    const ptsMap = new Map((ptsRes.data || []).map((x) => [x.owner_user_id || x.profile_id, x]));
    const svcMap = new Map((svcRes.data || []).map((x) => [x.id, x.title]));
    const map = new Map(
      (pmRes.data || []).map((x) => {
        const sp = spMap.get(x.id);
        const trust = ptsMap.get(x.id);
        const isVerified =
          sp?.verified === "verified" ||
          sp?.verified === "featured" ||
          x.registration_status === "verified" ||
          x.registration_status === "featured" ||
          trust?.manual_level === "verified_provider";
        return [
          x.id,
          {
            full_name: sp?.business_name || x.full_name || "User",
            owner_name: x.full_name || "User",
            avatar_url: x.avatar_url,
            is_provider: !!x.is_provider || !!sp,
            is_verified: isVerified,
            district: x.district,
            town: x.town,
          },
        ];
      })
    );

    const result = (p || []).map((x) => ({
      ...x,
      service_title: x.service_id ? svcMap.get(x.service_id) || null : null,
      author: map.get(x.provider_user_id) || { full_name: "User", avatar_url: null, is_provider: false },
    }));

    res.json({ data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function updatePost(req, res) {
  try {
    const { id } = req.params;
    const { featured } = req.body;
    const { error } = await supabaseAdmin.from("timeline_posts").update({ featured }).eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function toggleHideAdminPost(req, res) {
  try {
    const { id } = req.params;
    const { hidden } = req.body;
    let nextHidden = hidden;
    if (nextHidden === undefined) {
      const { data: cur } = await supabaseAdmin.from("timeline_posts").select("hidden").eq("id", id).maybeSingle();
      nextHidden = !cur?.hidden;
    }
    const { error } = await supabaseAdmin.from("timeline_posts").update({ hidden: !!nextHidden }).eq("id", id);
    if (error) throw error;
    res.json({ success: true, hidden: !!nextHidden });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function deleteAdminPost(req, res) {
  try {
    const { id } = req.params;
    await Promise.allSettled([
      supabaseAdmin.from("post_comments").delete().eq("post_id", id),
      supabaseAdmin.from("post_likes").delete().eq("post_id", id),
    ]);
    const { error } = await supabaseAdmin.from("timeline_posts").delete().eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

// Recs
export async function getRecs(req, res) {
  try {
    const { data, error } = await supabaseAdmin.from("provider_recommendations").select("*").order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function updateRec(req, res) {
  try {
    const { id } = req.params;
    const { hidden } = req.body;
    const { error } = await supabaseAdmin.from("provider_recommendations").update({ hidden }).eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

// Reports
export async function getReports(req, res) {
  try {
    const { status } = req.query;
    let q = supabaseAdmin.from("reports").select("*").order("created_at", { ascending: false }).limit(100);
    if (status && status !== "all") {
      q = q.eq("status", status);
    }
    const { data, error } = await q;
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function updateReport(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { error } = await supabaseAdmin.from("reports").update({ status }).eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

// Official
export async function getOfficialData(req, res) {
  try {
    const [a, p, sp, c] = await Promise.all([
      supabaseAdmin.from("official_accounts").select("*").order("created_at").limit(1).maybeSingle(),
      supabaseAdmin.from("official_posts").select("*").order("created_at", { ascending: false }).limit(100),
      supabaseAdmin.from("service_profiles").select("user_id,business_name,subcategory,seeded_status,verified").eq("seeded_by_official", true),
      supabaseAdmin.from("profile_claim_requests").select("id,service_profile_user_id,requester_user_id,full_name,relationship_to_profile,explanation,status,created_at").order("created_at", { ascending: false }),
    ]);
    res.json({
      data: {
        account: a.data || null,
        posts: p.data || [],
        seeded: sp.data || [],
        claims: c.data || []
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function revealClaimContact(req, res) {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from("profile_claim_requests")
      .select("phone_number,email,whatsapp_number,supporting_file_url")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    res.json({ data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function updateOfficialPost(req, res) {
  try {
    const { id } = req.params;
    const payload = req.body;
    let patch;
    if (payload.field !== undefined && payload.value !== undefined) {
      patch = { [payload.field]: payload.value };
    } else {
      patch = payload;
    }
    const { error } = await supabaseAdmin.from("official_posts").update(patch).eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function createOfficialPost(req, res) {
  try {
    const payload = req.body;
    const { error } = await supabaseAdmin.from("official_posts").insert(payload);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export const deleteOfficialPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from("official_posts").delete().eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const getOfficialPostInteractions = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    const [{ data: lc }, { count: cc }] = await Promise.all([
      supabaseAdmin.rpc("get_official_post_like_count", { _post_id: id }),
      supabaseAdmin.from("official_post_comments").select("*", { count: "exact", head: true }).eq("post_id", id)
    ]);
    
    let liked = false;
    if (userId) {
      const { data } = await supabaseAdmin.from("official_post_likes").select("post_id").eq("post_id", id).eq("user_id", userId).maybeSingle();
      liked = !!data;
    }
    
    res.json({ data: { likes: typeof lc === "number" ? lc : 0, liked, commentCount: cc || 0 } });
  } catch (err) {
    console.error('Error fetching official post interactions:', err);
    res.status(500).json({ error: 'Failed to fetch interactions' });
  }
};

export const toggleOfficialPostLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const { data: existing } = await supabaseAdmin.from("official_post_likes").select("post_id").eq("post_id", id).eq("user_id", userId).maybeSingle();
    
    if (existing) {
      await supabaseAdmin.from("official_post_likes").delete().eq("post_id", id).eq("user_id", userId);
      res.json({ liked: false });
    } else {
      await supabaseAdmin.from("official_post_likes").insert({ post_id: id, user_id: userId });
      res.json({ liked: true });
    }
  } catch (err) {
    console.error('Error toggling official post like:', err);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
};

export async function updateSeededStatus(req, res) {
  try {
    const { id: uid } = req.params;
    const { seeded_status } = req.body;
    const { error } = await supabaseAdmin.from("service_profiles").update({ seeded_status, seeded_by_official: true }).eq("user_id", uid);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

export async function reviewClaim(req, res) {
  try {
    const { id } = req.params;
    const { requester_user_id, service_profile_user_id, decision } = req.body;
    
    await supabaseAdmin.from("profile_claim_requests").update({ status: decision, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (decision === "approved") {
      await supabaseAdmin.from("service_profiles").update({ seeded_status: "claimed", user_id: requester_user_id }).eq("user_id", service_profile_user_id);
    } else {
      await supabaseAdmin.from("service_profiles").update({ seeded_status: "unclaimed" }).eq("user_id", service_profile_user_id);
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
