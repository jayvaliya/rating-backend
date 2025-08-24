import { 
  registerSchema, 
  loginSchema, 
  passwordUpdateSchema 
} from '../../../../common/zod/types.js';

// Middleware factory for validating requests using Zod schemas
const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      // Log the incoming request body for debugging
      console.log('Validating request body:', req.body);
      
      // Validate request body against schema
      schema.parse(req.body);
      next();
    } catch (error) {
      // Log validation errors for debugging
      console.error('Validation failed:', error.errors);
      
      // Format Zod validation errors
      const formattedErrors = error.errors || [];
      
      // Special handling for common validation errors
      const enhancedErrors = formattedErrors.map(err => {
        let enhancedMessage = err.message;
        
        // Add more helpful messages for specific validation errors
        if (err.path.includes('name') && err.message.includes('at least')) {
          enhancedMessage = 'Name must be at least 3 characters. Please provide your full name.';
        }
        
        return {
          path: err.path.join('.'),
          message: enhancedMessage
        };
      });
      
      return res.status(400).json({ 
        message: 'Validation failed. Please check your input and try again.',
        errors: enhancedErrors
      });
    }
  };
};

// Export validation middleware for different operations
export const validateRegistration = validateRequest(registerSchema);
export const validateLogin = validateRequest(loginSchema);
export const validatePasswordUpdate = validateRequest(passwordUpdateSchema);
