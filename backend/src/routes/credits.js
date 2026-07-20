import { Router } from 'express';
import { getPackages, getPersonal, getWallet, requestPurchase, cancelRequest, getBoostPricing, getActiveBoosts, getBoostedSet, activateBoost } from '../controllers/credits.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get("/packages", getPackages);
router.get("/personal", requireAuth, getPersonal);
router.get("/wallet", requireAuth, getWallet);
router.post("/requests", requireAuth, requestPurchase);
router.put("/requests/:id/cancel", requireAuth, cancelRequest);

router.get("/boost-pricing", getBoostPricing);
router.get("/active-boosts", getActiveBoosts);
router.get("/boosted-set", getBoostedSet);
router.post("/activate-boost", requireAuth, activateBoost);

export default router;
