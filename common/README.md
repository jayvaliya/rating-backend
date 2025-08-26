# Common Module for Store Rating Application

This module contains shared validation schemas and utilities used across both the backend and frontend of the Store Rating application.

## Overview

The Common module is designed to centralize validation logic, ensuring consistency across the application. By using Zod schemas, we maintain a single source of truth for validation rules, reducing code duplication and preventing inconsistencies between frontend and backend validation.

## Features

- **Centralized Validation Schemas**: All data validation rules defined in one place
- **Type Safety**: Zod provides runtime type checking and validation
- **Reusable Components**: Shared utilities for both frontend and backend
- **Consistent Error Messages**: Standardized error messaging for validation failures

## Directory Structure

```
common/
├── zod/              # Zod validation schemas
│   └── types.js      # Core validation schemas
├── package.json      # Package configuration
└── README.md         # Documentation
```

## Validation Schemas

The module provides the following schema categories:

### Basic Field Validations

- `idSchema`: UUID format validation
- `nameSchema`: Name validation (3-20 characters)
- `emailSchema`: Email format validation
- `passwordSchema`: Password complexity validation (8-16 chars, uppercase, special char)
- `addressSchema`: Address validation (max 400 characters)
- `scoreSchema`: Score validation (integers 1-5)
- `roleEnum`: Role enumeration ('USER', 'OWNER', 'ADMIN')

### Entity Schemas

- `userSchema`: Complete user object validation
- `storeSchema`: Store entity validation
- `ratingSchema`: Rating entity validation

### Request Schemas

- `registerSchema`: User registration validation
- `loginSchema`: Login credentials validation
- `passwordUpdateSchema`: Password update validation
- `createStoreSchema`: Store creation validation
- `createUserSchema`: User creation validation (admin)
- `profileUpdateSchema`: User profile update validation
- `adminUserUpdateSchema`: Admin user update validation
- `ratingCreateSchema`: Rating creation validation
- `ratingUpdateSchema`: Rating update validation
- `createStoreWithOwnerSchema`: Combined store and owner creation validation

## Usage

### Installation

```bash
cd common
npm install
```

### Import Schemas

```javascript
// In backend or frontend code
import { registerSchema, loginSchema } from '../common/zod/types.js';

// Use schemas for validation
const validateRegistration = (req, res, next) => {
  try {
    const validated = registerSchema.parse(req.body);
    req.validatedData = validated;
    next();
  } catch (error) {
    res.status(400).json({ 
      message: 'Validation failed', 
      errors: error.errors 
    });
  }
};
```

## Benefits of Shared Validation

1. **Consistency**: Same validation rules applied in frontend and backend
2. **Maintainability**: Update validation rules in one place
3. **Type Safety**: Runtime type checking and validation
4. **Developer Experience**: Clear error messages and autocomplete support

## License

This project is licensed under the MIT License.
