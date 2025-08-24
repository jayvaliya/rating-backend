import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import {
  validateRegistration, 
  validateLogin, 
  validatePasswordUpdate 
} from '../middleware/validation/auth.validation.js';

const router = express.Router();

// Public routes
router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);

// Protected routes
router.get('/me', verifyToken, authController.getCurrentUser);
router.patch('/password', verifyToken, validatePasswordUpdate, authController.updatePassword);

export default router;
