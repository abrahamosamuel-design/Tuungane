import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getPresignedUploadUrl, getPublicUrl } from '../lib/r2Client.js';
import crypto from 'crypto';

const router = express.Router();

router.post('/presign', requireAuth, async (req, res) => {
  try {
    const { folder = 'misc', fileName, contentType } = req.body;
    const userId = req.user.id;

    if (!fileName || !contentType) {
      return res.status(400).json({ error: 'fileName and contentType are required' });
    }

    // Only allow images
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'Only images are allowed' });
    }

    // Generate a secure unique key
    const ext = fileName.split('.').pop() || 'jpeg';
    const timestamp = Date.now();
    const randomHex = crypto.randomBytes(4).toString('hex');
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '');
    const key = `${userId}/${safeFolder}/${timestamp}-${randomHex}.${ext}`;

    const uploadUrl = await getPresignedUploadUrl(key, contentType, 3600); // 1 hour expiry
    const publicUrl = getPublicUrl(key);

    res.json({
      uploadUrl,
      publicUrl,
      key
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

export default router;
