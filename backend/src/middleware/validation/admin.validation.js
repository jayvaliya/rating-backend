import {
  updateUserRoleSchema,
  createStoreSchema,
  createUserSchema
} from '../../../../common/zod/types.js';

// Middleware factory for validating requests using Zod schemas
const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      // Validate request body against schema
      schema.parse(req.body);
      next();
    } catch (error) {
      // Format Zod validation errors
      console.log('Validation failed:', error);
      
      // Parse and extract the error details properly
      let errorDetails = [];
      
      if (error.errors && Array.isArray(error.errors)) {
        errorDetails = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
      }
      
      return res.status(400).json({
        message: 'Validation failed',
        errors: errorDetails
      });
    }
  };
};

// Validation middleware
export const validateCreateUser = validateRequest(createUserSchema);
export const validateCreateStore = validateRequest(createStoreSchema);
export const validateUpdateUserRole = validateRequest(updateUserRoleSchema);
