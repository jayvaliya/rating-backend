import express from 'express';
import { 
  getOwnerDashboard, 
  getOwnerStore, 
  getStoreRatings 
} from '../controllers/owner.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { verifyOwner } from '../middleware/owner.middleware.js';

const router = express.Router();

// Apply authentication and owner role check to all routes
router.use(verifyToken);
router.use(verifyOwner);

// Dashboard statistics
router.get('/dashboard', getOwnerDashboard);

// Store details
router.get('/store', getOwnerStore);

// Ratings for owner's store
router.get('/ratings', getStoreRatings);

export default router;
