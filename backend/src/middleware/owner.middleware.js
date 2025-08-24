import prisma from '../utils/prisma.js';

/**
 * Middleware to verify user is a store owner
 * This checks if the authenticated user has the 'owner' role
 */
export const verifyOwner = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Check if the user has owner role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || user.role !== 'OWNER') {
      return res.status(403).json({ message: 'Access denied. User is not a store owner.' });
    }

    // Check if the user actually has a store
    const store = await prisma.store.findUnique({
      where: { ownerId: userId },
      select: { id: true }
    });

    if (!store) {
      return res.status(403).json({ 
        message: 'Access denied. No store associated with this owner account.'
      });
    }

    next();
  } catch (error) {
    console.error('Error in owner verification middleware:', error);
    res.status(500).json({ message: 'Internal server error during authorization' });
  }
};

/**
 * Middleware to validate request bodies for owner routes
 * Uses Zod schemas from common/zod/types.js
 */
export const validateOwnerRequest = (schema) => {
  return (req, res, next) => {
    try {
      // Validate request body using the provided schema
      const validatedData = schema.safeParse(req.body);
      
      if (!validatedData.success) {
        // Format Zod errors into a more user-friendly format
        const formattedErrors = validatedData.error.errors.reduce((acc, error) => {
          const path = error.path.join('.');
          acc[path] = error.message;
          return acc;
        }, {});
        
        return res.status(400).json({
          message: 'Validation failed',
          errors: formattedErrors
        });
      }
      
      // Attach validated data to request
      req.validatedData = validatedData.data;
      next();
    } catch (error) {
      console.error('Error in owner validation middleware:', error);
      res.status(500).json({ message: 'Error validating request' });
    }
  };
};
