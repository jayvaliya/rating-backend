import express from 'express';
import {
  getPublicStores,
  getPublicStoreById,
  getUserStoreRating
} from '../controllers/public.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public store browsing routes
router.get('/stores', getPublicStores);
router.get('/stores/:id', getPublicStoreById);

// Get a user's rating for a store (uses token for auth)
router.get('/store-rating/:storeId', verifyToken, getUserStoreRating);

export default router;
