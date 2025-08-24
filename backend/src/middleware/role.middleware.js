import prisma from '../utils/prisma.js';

/**
 * Middleware to check if user has admin role
 */
export const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  next();
};

/**
 * Middleware to check if user has store owner role
 */
export const isOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role !== 'OWNER') {
    return res.status(403).json({ message: 'Store owner access required' });
  }
  
  next();
};

/**
 * Middleware to check if user has admin or owner role
 */
export const isAdminOrOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role !== 'ADMIN' && req.user.role !== 'OWNER') {
    return res.status(403).json({ message: 'Admin or owner access required' });
  }
  
  next();
};

/**
 * Middleware to check if user is the owner of the requested store
 * This middleware should be used after authenticateToken
 */
export const isStoreOwner = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  const storeId = req.params.id;
  
  try {
    const store = await prisma.store.findUnique({
      where: { id: storeId }
    });
    
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }
    
    if (req.user.role === 'ADMIN' || store.ownerId === req.user.id) {
      req.store = store;
      return next();
    }
    
    return res.status(403).json({ message: 'You do not have permission to modify this store' });
  } catch (error) {
    console.error('Error checking store ownership:', error);
    return res.status(500).json({ message: 'Server error while checking permissions' });
  }
};
