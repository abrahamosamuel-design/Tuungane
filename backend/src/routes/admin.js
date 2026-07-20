import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import * as admin from '../controllers/admin.js';
import {
  getOfficialData,
  revealClaimContact,
  updateOfficialPost,
  deleteOfficialPost,
  updateSeededStatus,
  reviewClaim,
  getOfficialPostInteractions,
  toggleOfficialPostLike
} from '../controllers/admin.js';
import * as adminRequests from '../controllers/admin_requests.js';
import * as adminCredits from '../controllers/admin_credits.js';
import * as adminOther from '../controllers/admin_other.js';
import * as adminTrust from '../controllers/admin_trust.js';

const router = Router();

// Middleware to check admin/moderator roles
const requireModerator = async (req, res, next) => {
  // Assuming requireAuth has already set req.user
  // In a real app we'd fetch the role from the db, 
  // but we can trust the route guard on the frontend for basic gating,
  // or add a quick role check here. Let's do a quick DB check.
  try {
    const { data: roles } = await req.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", req.user.id);
    const userRoles = (roles || []).map(r => r.role);
    if (userRoles.includes("admin") || userRoles.includes("moderator") || userRoles.includes("finance_admin")) {
      req.userRoles = userRoles;
      next();
    } else {
      res.status(403).json({ error: "Forbidden: Admin or Moderator role required" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.use(requireAuth);
router.use(requireModerator);

// Users
router.get("/users", admin.getUsers);
router.post("/users/:id/role/:role", admin.toggleRole);

// Providers
router.get("/providers", admin.getProviders);
router.put("/providers/:id/status", admin.updateProviderStatus);

// Posts
router.get("/posts", admin.getPosts);
router.put("/posts/:id/feature", admin.updatePost);

// Recs
router.get("/recs", admin.getRecs);
router.put("/recs/:id/hide", admin.updateRec);

// Reports
router.get("/reports", admin.getReports);
router.put("/reports/:id/status", admin.updateReport);

// Official
router.get('/official', getOfficialData);
router.get('/official-posts/:id/interactions', optionalAuth, getOfficialPostInteractions);
router.post('/official-posts/:id/likes', requireAuth, toggleOfficialPostLike);
router.get('/claims/:id/contact', revealClaimContact);
router.put("/official/posts/:id", updateOfficialPost);
router.post("/official/posts", admin.createOfficialPost);
router.delete("/official/posts/:id", deleteOfficialPost);
router.put("/official/seeded/:id/status", updateSeededStatus);
router.put("/official/claims/:id/review", reviewClaim);

// Requests
router.get("/requests", adminRequests.getRequests);
router.put("/requests/:id/status", adminRequests.setRequestStatus);
router.put("/requests/feedback/:id/hide", adminRequests.hideFeedback);
router.delete("/requests/feedback/:id", adminRequests.deleteFeedback);
router.put("/requests/disputes/:id/resolve", adminRequests.resolveDispute);

// Credits
router.get("/credits", adminCredits.getCreditsInfo);
router.post("/credits/requests/:id/approve", adminCredits.approveRequest);
router.post("/credits/requests/:id/reject", adminCredits.rejectRequest);
router.post("/credits/add", adminCredits.addCredits);
router.post("/credits/boosts/:id/expire", adminCredits.expireBoost);

// Other Tabs
router.get("/overview", adminOther.getOverviewStats);
router.get("/disputes", adminOther.getDisputes);
router.put("/disputes/:id", adminOther.updateDispute);
router.get("/contact-analytics", adminOther.getContactAnalytics);
router.post("/contact-analytics/settings", adminOther.saveContactSettings);
router.get("/activity", adminOther.getActivityLog);
router.get("/locations", adminOther.getLocations);
router.post("/locations", adminOther.addFeaturedLocation);
router.put("/locations/:id", adminOther.updateFeaturedLocation);
router.delete("/locations/:id", adminOther.deleteFeaturedLocation);
router.post("/locations/settings", adminOther.saveLocationSettings);
router.get("/categories", adminOther.getCategories);
router.post("/categories", adminOther.addCategory);
router.put("/categories/:id", adminOther.updateCategory);
router.delete("/categories/:id", adminOther.deleteCategory);
router.post("/subcategories", adminOther.addSubcategory);
router.put("/subcategories/:id", adminOther.updateSubcategory);
router.delete("/subcategories/:id", adminOther.deleteSubcategory);

// Trust Center
router.get("/trust/overview", adminTrust.getOverview);
router.get("/trust/appeals", adminTrust.getAppeals);
router.post("/trust/appeals/:id/decide", adminTrust.decideAppeal);
router.get("/trust/verification-requests", adminTrust.getVerificationRequests);
router.post("/trust/verification-requests/:id/decide", adminTrust.decideVerificationRequest);
router.get("/trust/reports", adminTrust.getReports);
router.post("/trust/reports/:id/resolve", adminTrust.resolveReport);
router.post("/trust/levels", adminTrust.setTrustLevel);
router.get("/trust/status", adminTrust.getStatus);
router.post("/trust/status/clear-manual", adminTrust.clearManualLevel);
router.get("/trust/notes", adminTrust.getNotes);
router.post("/trust/notes", adminTrust.addNote);
router.get("/trust/audit", adminTrust.getAuditLog);
router.get("/trust/settings", adminTrust.getSettings);
router.put("/trust/settings", adminTrust.updateSettings);

export default router;
