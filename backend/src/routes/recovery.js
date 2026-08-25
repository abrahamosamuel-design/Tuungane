import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'dummy_key_to_prevent_crash';
// We need the service role key to send magic links for other users
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/recovery/check
 * Checks if there is a duplicate/legacy account matching the current user's email or phone.
 */
router.get('/check', requireAuth, async (req, res) => {
  try {
    const { id, email, phone } = req.user;

    // We only want to search if we have an email or phone to match on
    if (!email && !phone) {
      return res.json({ isDuplicate: false });
    }

    // Build the query to find profiles that match email OR phone
    // BUT exclude the current user's own profile.
    let query = supabaseAdmin
      .from('public_profiles')
      .select('id, owner_id, name, avatar_url, phone, email, bio, category_slug')
      .neq('owner_id', id);

    // Filter by phone or email
    if (email && phone) {
      query = query.or(`email.eq.${email},phone.eq.${phone}`);
    } else if (email) {
      query = query.eq('email', email);
    } else if (phone) {
      query = query.eq('phone', phone);
    }

    const { data: legacyProfiles, error } = await query.limit(1);

    if (error) {
      throw error;
    }

    if (legacyProfiles && legacyProfiles.length > 0) {
      // Found a legacy profile!
      const legacyProfile = legacyProfiles[0];
      
      // We also need to get the email address of the owner_id so we can send the magic link to it
      // if it's different from the public profile's visible email.
      let authEmail = null;
      try {
        const { data: { user: legacyUser }, error: userError } = await supabaseAdmin.auth.admin.getUserById(legacyProfile.owner_id);
        if (!userError && legacyUser && legacyUser.email) {
          authEmail = legacyUser.email;
        }
      } catch (e) {
        console.error('Error fetching user from auth admin:', e.message);
      }

      // Fallback to the profile's own email column if the auth admin call fails
      if (!authEmail && legacyProfile.email) {
        authEmail = legacyProfile.email;
      }

      if (authEmail) {
         // Attach the true auth email to the profile so the frontend can mask it (e.g. j***@gmail.com)
         legacyProfile.auth_email = authEmail;
         
         return res.json({
           data: {
             isDuplicate: true,
             legacyProfile
           }
         });
      }
    }

    res.json({ data: { isDuplicate: false } });
  } catch (error) {
    console.error('Error checking for legacy profiles:', error);
    res.status(500).json({ error: 'Failed to check legacy profiles' });
  }
});

/**
 * POST /api/recovery/send-magic-link
 * Sends a magic link to the legacy account's email
 */
router.post('/send-magic-link', requireAuth, async (req, res) => {
  try {
    const { legacyOwnerId } = req.body;

    if (!legacyOwnerId) {
      return res.status(400).json({ error: 'legacyOwnerId is required' });
    }

    // Ensure this user actually has a right to this account by re-verifying the match
    const { email, phone } = req.user;
    
    let query = supabaseAdmin
      .from('public_profiles')
      .select('id')
      .eq('owner_id', legacyOwnerId);

    if (email && phone) {
      query = query.or(`email.eq.${email},phone.eq.${phone}`);
    } else if (email) {
      query = query.eq('email', email);
    } else if (phone) {
      query = query.eq('phone', phone);
    }

    const { data: match, error: matchError } = await query.single();
    
    if (matchError || !match) {
      return res.status(403).json({ error: 'Not authorized to recover this account.' });
    }

    // Retrieve the legacy user's actual email
    let authEmail = null;
    try {
      const { data: { user: legacyUser }, error: userError } = await supabaseAdmin.auth.admin.getUserById(legacyOwnerId);
      if (!userError && legacyUser && legacyUser.email) {
        authEmail = legacyUser.email;
      }
    } catch (e) {
      console.error('Error fetching user from auth admin:', e.message);
    }

    if (!authEmail) {
      // Fallback to public_profiles email column
      const { data: profile } = await supabaseAdmin
        .from('public_profiles')
        .select('email')
        .eq('owner_id', legacyOwnerId)
        .maybeSingle();
      if (profile && profile.email) {
        authEmail = profile.email;
      }
    }

    if (!authEmail) {
      return res.status(400).json({ error: 'Legacy account has no associated email address to send a link to.' });
    }

    // Send the magic link
    const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
      email: authEmail,
      options: {
        shouldCreateUser: false
      }
    });

    if (otpError) {
      throw otpError;
    }

    res.json({ success: true, message: 'Magic link sent successfully' });
  } catch (error) {
    console.error('Error sending magic link:', error);
    res.status(500).json({ error: 'Failed to send magic link' });
  }
});

export default router;
