import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
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
router.get('/me', authenticateToken, authController.getCurrentUser);
router.patch('/password', authenticateToken, validatePasswordUpdate, authController.updatePassword);

export default router;
