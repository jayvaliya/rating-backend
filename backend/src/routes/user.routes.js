import express from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import { 
  verifyUser,
  validateRatingCreate,
  validateRatingUpdate,
  canModifyRating
} from '../middleware/user.middleware.js';
import {
  getUserActivity,
  createRating,
  getUserRatings,
  getRatingById,
  updateRating,
  deleteRating
} from '../controllers/user.controller.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);
router.use(verifyUser);

// User activity routes
router.get('/activity', getUserActivity);

// Rating management routes
router.post('/stores/:id/ratings', validateRatingCreate, createRating);
router.get('/ratings', getUserRatings);
router.get('/ratings/:id', getRatingById);
router.patch('/ratings/:id', validateRatingUpdate, canModifyRating, updateRating);
router.delete('/ratings/:id', canModifyRating, deleteRating);

export default router;
