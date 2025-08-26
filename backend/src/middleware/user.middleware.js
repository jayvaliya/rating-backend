import prisma from '../utils/prisma.js';
import { 
  ratingCreateSchema, 
  ratingUpdateSchema 
} from '../../../common/zod/types.js';

/**
 * Middleware to verify the user has 'user' role
 */
export const verifyUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // We're just checking the user role here
    // If role is missing or not 'user', deny access
    if (!req.user || req.user.role !== 'USER') {
      return res.status(403).json({ 
        message: 'Access denied. Regular user role required.' 
      });
    }

    next();
  } catch (error) {
    console.error('Error in user verification middleware:', error);
    res.status(500).json({ message: 'Internal server error during authorization' });
  }
};

/**
 * Middleware to validate rating creation requests
 */
export const validateRatingCreate = (req, res, next) => {
  try {
    const validatedData = ratingCreateSchema.safeParse(req.body);
    
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
    console.error('Error in rating validation middleware:', error);
    res.status(500).json({ message: 'Error validating request' });
  }
};

/**
 * Middleware to validate rating update requests
 */
export const validateRatingUpdate = (req, res, next) => {
  try {
    const validatedData = ratingUpdateSchema.safeParse(req.body);
    
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
    console.error('Error in rating update validation middleware:', error);
    res.status(500).json({ message: 'Error validating request' });
  }
};

/**
 * Middleware to verify user owns the rating they're trying to modify
 */
export const canModifyRating = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const ratingId = req.params.id;

    // Check if rating exists and belongs to the user
    const rating = await prisma.rating.findUnique({
      where: { id: ratingId },
      select: { userId: true }
    });

    if (!rating) {
      return res.status(404).json({ message: 'Rating not found' });
    }

    if (rating.userId !== userId) {
      return res.status(403).json({ 
        message: 'Access denied. You can only modify your own ratings.' 
      });
    }

    next();
  } catch (error) {
    console.error('Error in rating ownership verification middleware:', error);
    res.status(500).json({ message: 'Internal server error during authorization' });
  }
};
