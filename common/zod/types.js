import { z } from 'zod';

// Define validation schemas using Zod

// Basic field validations
// -----------------------

// ID validation (UUID format)
const idSchema = z.string().uuid({ message: 'Invalid ID format' }).optional();

// Name validation (3-20 characters)
const nameSchema = z.string()
  .min(3, { message: 'Name must be at least 3 characters' })
  .max(20, { message: 'Name cannot exceed 20 characters' });

// Email validation
const emailSchema = z.string()
  .email({ message: 'Invalid email address' });

// Password validation (8-16 chars, at least 1 uppercase, 1 special char)
const passwordSchema = z.string()
  .min(8, { message: 'Password must be at least 8 characters' })
  .max(16, { message: 'Password cannot exceed 16 characters' })
  .refine(
    (value) => /[A-Z]/.test(value),
    { message: 'Password must contain at least one uppercase letter' }
  )
  .refine(
    (value) => /[!@#$%^&*]/.test(value),
    { message: 'Password must contain at least one special character (!@#$%^&*)' }
  );

// Address validation (max 400 characters)
const addressSchema = z.string()
  .max(400, { message: 'Address cannot exceed 400 characters' });

// Score validation (1-5)
const scoreSchema = z.number()
  .int()
  .min(1, { message: 'Score must be at least 1' })
  .max(5, { message: 'Score cannot exceed 5' });

// Role enum
const roleEnum = z.enum(['USER', 'OWNER', 'ADMIN']);

// Entity Schemas
// --------------

// User schema - matching database fields
const userSchema = z.object({
  id: idSchema,
  name: nameSchema,
  email: emailSchema,
  passwordHash: z.string().optional(),
  address: addressSchema,
  role: roleEnum.default('USER'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// Store schema - matching database fields
const storeSchema = z.object({
  id: idSchema,
  name: nameSchema,
  contactEmail: emailSchema,
  address: addressSchema,
  ownerId: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// Rating schema - matching database fields
const ratingSchema = z.object({
  id: idSchema,
  storeId: z.string(),
  score: scoreSchema,
  userId: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// Admin Schemas
// -----------------

// User creation schema for admin
const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  address: addressSchema,
  role: roleEnum.optional()
});

// Store creation schema for admin
const createStoreSchema = z.object({
  name: nameSchema,
  address: addressSchema,
  contactEmail: emailSchema,
  ownerId: z.string().uuid({ message: 'Invalid user ID format' })
});

// Update user role schema
const updateUserRoleSchema = z.object({
  role: roleEnum
});




// Operation Schemas
// -----------------

// Registration schema
const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  address: addressSchema
});

// Login schema
const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: 'Password is required' })
});

// Password update schema
const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1, { message: 'Current password is required' }),
  newPassword: passwordSchema
});

// Export all schemas
export {
  idSchema,
  nameSchema,
  emailSchema,
  passwordSchema,
  addressSchema,
  scoreSchema,
  roleEnum,
  userSchema,
  storeSchema,
  ratingSchema,
  registerSchema,
  loginSchema,
  passwordUpdateSchema,
  updateUserRoleSchema,
  createStoreSchema,
  createUserSchema
};

// Export default for compatibility
export default {
  idSchema,
  nameSchema,
  emailSchema,
  passwordSchema,
  addressSchema,
  scoreSchema,
  roleEnum,
  userSchema,
  storeSchema,
  ratingSchema,
  registerSchema,
  loginSchema,
  passwordUpdateSchema,
  updateUserRoleSchema,
  createStoreSchema,
  createUserSchema
};

