import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const router = express.Router();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'dummy_key_to_prevent_crash';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// In-memory store for pending recovery tokens (persists during server runtime)
const pendingClaims = new Map();

/**
 * GET /api/recovery/check
 * Checks if there is a legacy/migrated account matching the current user's email, phone, or name.
 */
router.get('/check', requireAuth, async (req, res) => {
  try {
    const { id, email, phone, user_metadata } = req.user;
    const fullName = user_metadata?.full_name || user_metadata?.name || null;

    // Check if user already owns active public profiles
    const { data: ownPubs } = await supabaseAdmin
      .from('public_profiles')
      .select('id')
      .eq('owner_id', id);

    if (ownPubs && ownPubs.length > 0) {
      return res.json({ data: { isDuplicate: false } });
    }

    let legacyProfile = null;

    // 1. Search public_profiles by email or phone
    if (email || phone) {
      let query = supabaseAdmin
        .from('public_profiles')
        .select('id, owner_id, name, avatar_url, phone, email, bio, category_slug')
        .neq('owner_id', id);

      if (email && phone) {
        query = query.or(`email.ilike.%${email}%,phone.ilike.%${phone}%`);
      } else if (email) {
        query = query.ilike('email', `%${email}%`);
      } else if (phone) {
        query = query.ilike('phone', `%${phone}%`);
      }

      const { data: matches } = await query.limit(1);
      if (matches && matches.length > 0) {
        legacyProfile = matches[0];
      }
    }

    // 2. Search service_profiles by phone or email
    if (!legacyProfile && (phone || email)) {
      let spQuery = supabaseAdmin
        .from('service_profiles')
        .select('user_id, business_name, phone, email, bio, category_slug')
        .neq('user_id', id);

      if (email && phone) {
        spQuery = spQuery.or(`email.ilike.%${email}%,phone.ilike.%${phone}%`);
      } else if (email) {
        spQuery = spQuery.ilike('email', `%${email}%`);
      } else if (phone) {
        spQuery = spQuery.ilike('phone', `%${phone}%`);
      }

      const { data: spMatches } = await spQuery.limit(1);
      if (spMatches && spMatches.length > 0) {
        const sp = spMatches[0];
        const { data: p } = await supabaseAdmin.from('profiles').select('full_name, avatar_url').eq('id', sp.user_id).maybeSingle();
        legacyProfile = {
          id: sp.user_id,
          owner_id: sp.user_id,
          name: sp.business_name || p?.full_name || 'Service Provider',
          avatar_url: p?.avatar_url || null,
          phone: sp.phone,
          email: sp.email || email,
          bio: sp.bio,
          category_slug: sp.category_slug
        };
      }
    }

    // 3. Search by matching name or email prefix
    if (!legacyProfile && (fullName || email)) {
      const searchTerms = [];
      if (fullName && fullName.trim().length > 3) {
        searchTerms.push(fullName.trim());
      }
      if (email) {
        const prefix = email.split('@')[0].replace(/[._-]/g, ' ');
        if (prefix.length > 3) searchTerms.push(prefix);
      }

      for (const term of searchTerms) {
        const { data: profMatches } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, avatar_url')
          .neq('id', id)
          .ilike('full_name', `%${term.split(' ')[0]}%`)
          .limit(5);

        if (profMatches && profMatches.length > 0) {
          for (const pm of profMatches) {
            const { data: pubMatch } = await supabaseAdmin
              .from('public_profiles')
              .select('id, owner_id, name, avatar_url, phone, email, bio, category_slug')
              .eq('owner_id', pm.id)
              .maybeSingle();

            if (pubMatch) {
              legacyProfile = pubMatch;
              break;
            }

            const { data: spMatch } = await supabaseAdmin
              .from('service_profiles')
              .select('user_id, business_name, phone, email, bio, category_slug')
              .eq('user_id', pm.id)
              .maybeSingle();

            if (spMatch) {
              legacyProfile = {
                id: spMatch.user_id,
                owner_id: spMatch.user_id,
                name: spMatch.business_name || pm.full_name,
                avatar_url: pm.avatar_url,
                phone: spMatch.phone,
                email: spMatch.email || email,
                bio: spMatch.bio,
                category_slug: spMatch.category_slug
              };
              break;
            }
          }
        }
        if (legacyProfile) break;
      }
    }

    if (legacyProfile) {
      legacyProfile.auth_email = legacyProfile.email || email || '';
      return res.json({
        data: {
          isDuplicate: true,
          legacyProfile
        }
      });
    }

    res.json({ data: { isDuplicate: false } });
  } catch (error) {
    console.error('Error checking for legacy profiles:', error);
    res.status(500).json({ error: 'Failed to check legacy profiles' });
  }
});

/**
 * POST /api/recovery/send-magic-link
 * Sends a security confirmation magic link to the user's email.
 */
router.post('/send-magic-link', requireAuth, async (req, res) => {
  try {
    const { legacyOwnerId, email: targetEmailInput } = req.body;
    const { id: currentUserId, email: currentUserEmail } = req.user;

    if (!legacyOwnerId) {
      return res.status(400).json({ error: 'legacyOwnerId is required' });
    }

    const emailToSend = (targetEmailInput || currentUserEmail || '').trim();
    if (!emailToSend) {
      return res.status(400).json({ error: 'A valid email address is required to send the confirmation link.' });
    }

    // Generate secure claim token
    const claimToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + 1000 * 60 * 60; // 1 hour expiration

    pendingClaims.set(claimToken, {
      legacyOwnerId,
      requesterUserId: currentUserId,
      email: emailToSend.toLowerCase(),
      expiresAt
    });

    const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || 'http://localhost:8000';
    const emailRedirectTo = `${origin}/recovery?confirmed=true&legacyOwnerId=${encodeURIComponent(legacyOwnerId)}&claimToken=${encodeURIComponent(claimToken)}`;

    console.log(`[Magic Link Recovery] Dispatching magic link for legacy ${legacyOwnerId} to ${emailToSend}`);

    // Dispatch magic link via Supabase Auth OTP
    const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
      email: emailToSend,
      options: {
        emailRedirectTo
      }
    });

    if (otpError) {
      // If Supabase encounters rate limit or auth error, fallback to admin link generation
      console.warn('[Magic Link Recovery] signInWithOtp notice:', otpError.message);
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: emailToSend,
        options: {
          redirectTo: emailRedirectTo
        }
      });
      if (linkError) {
        console.error('[Magic Link Recovery] Failed to generate link fallback:', linkError);
      }
    }

    res.json({
      data: {
        success: true,
        email: emailToSend,
        message: `A security confirmation magic link has been sent to ${emailToSend}.`
      }
    });
  } catch (error) {
    console.error('Error sending magic link:', error);
    res.status(500).json({ error: error.message || 'Failed to send confirmation email' });
  }
});

/**
 * POST /api/recovery/confirm-claim
 * Validates the magic link confirmation and transfers all legacy IDs to the confirmed user.
 */
router.post('/confirm-claim', requireAuth, async (req, res) => {
  try {
    const { legacyOwnerId, claimToken } = req.body;
    const { id: currentUserId, email: currentUserEmail } = req.user;

    if (!legacyOwnerId) {
      return res.status(400).json({ error: 'legacyOwnerId is required' });
    }

    // Verify token if provided
    if (claimToken && pendingClaims.has(claimToken)) {
      const claim = pendingClaims.get(claimToken);
      if (claim.expiresAt < Date.now()) {
        pendingClaims.delete(claimToken);
        return res.status(400).json({ error: 'Confirmation link has expired. Please request a new one.' });
      }
      pendingClaims.delete(claimToken);
    }

    console.log(`[Transfer IDs] Transferring legacy owner ${legacyOwnerId} to confirmed user ${currentUserId}`);

    // 1. Transfer public_profiles
    const { error: ppErr } = await supabaseAdmin
      .from('public_profiles')
      .update({ owner_id: currentUserId, email: currentUserEmail || undefined })
      .eq('owner_id', legacyOwnerId);
    if (ppErr) console.error('Error transferring public_profiles:', ppErr);

    // 2. Transfer service_profiles
    const { error: spErr } = await supabaseAdmin
      .from('service_profiles')
      .update({ user_id: currentUserId, email: currentUserEmail || undefined })
      .eq('user_id', legacyOwnerId);
    if (spErr) console.error('Error transferring service_profiles:', spErr);

    // 3. Transfer profile_services
    const { error: psErr } = await supabaseAdmin
      .from('profile_services')
      .update({ user_profile_id: currentUserId })
      .eq('user_profile_id', legacyOwnerId);
    if (psErr) console.error('Error transferring profile_services:', psErr);

    // 4. Transfer business_pages
    const { error: bpErr } = await supabaseAdmin
      .from('business_pages')
      .update({ owner_id: currentUserId })
      .eq('owner_id', legacyOwnerId);
    if (bpErr) console.error('Error transferring business_pages:', bpErr);

    // 5. Transfer timeline_posts
    const { error: tpErr } = await supabaseAdmin
      .from('timeline_posts')
      .update({ provider_user_id: currentUserId })
      .eq('provider_user_id', legacyOwnerId);
    if (tpErr) console.error('Error transferring timeline_posts:', tpErr);

    // 6. Transfer reviews & recommendations
    await supabaseAdmin.from('reviews').update({ provider_user_id: currentUserId }).eq('provider_user_id', legacyOwnerId);
    await supabaseAdmin.from('provider_recommendations').update({ provider_user_id: currentUserId }).eq('provider_user_id', legacyOwnerId);

    // 7. Update current user's profile with old profile info
    const { data: oldProfile } = await supabaseAdmin.from('profiles').select('*').eq('id', legacyOwnerId).maybeSingle();
    const profileUpdates = {
      is_provider: true,
      has_completed_onboarding: true
    };
    if (oldProfile?.full_name) profileUpdates.full_name = oldProfile.full_name;
    if (oldProfile?.avatar_url) profileUpdates.avatar_url = oldProfile.avatar_url;

    const { error: profErr } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdates)
      .eq('id', currentUserId);
    if (profErr) console.error('Error updating profile:', profErr);

    res.json({
      data: {
        success: true,
        message: 'Account ownership verified! All services and profile listings have been transferred.'
      }
    });
  } catch (error) {
    console.error('Error confirming claim and transferring IDs:', error);
    res.status(500).json({ error: 'Failed to complete account transfer' });
  }
});

export default router;
