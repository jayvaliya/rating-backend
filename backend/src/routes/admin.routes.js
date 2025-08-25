import express from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { isAdmin } from '../middleware/role.middleware.js';
import { validateCreateUser, validateCreateStoreWithOwner, validateUpdateUser } from '../middleware/validation/admin.validation.js';

const router = express.Router();

// Apply authentication and admin role check to all routes
router.use(verifyToken);
router.use(isAdmin);

// Dashboard statistics
router.get('/dashboard', adminController.getAdminStats);

// User management
router.get('/users', adminController.getAllUsers);
router.post('/users', validateCreateUser, adminController.createUser);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id', validateUpdateUser, adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Store management
router.get('/stores', adminController.getAllStores);
router.get('/stores/:id', adminController.getStoreById);
router.patch('/stores/:id', adminController.updateStore);
router.delete('/stores/:id', adminController.deleteStore);

// Store with owner creation
router.post('/stores', validateCreateStoreWithOwner, adminController.createStoreWithOwner);

export default router;
