import express from 'express';
import {
  getPublicStores,
  getPublicStoreById
} from '../controllers/public.controller.js';

const router = express.Router();

// Public store browsing routes
router.get('/stores', getPublicStores);
router.get('/stores/:id', getPublicStoreById);

export default router;
