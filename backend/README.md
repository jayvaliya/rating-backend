# Store Rating API

A comprehensive RESTful API that enables users to submit and manage ratings for stores. The system includes role-based access control, JWT authentication, and comprehensive data validation.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Authentication](#authentication)
- [Getting Started](#getting-started)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)

## Features

- **Role-Based Access Control**: Three distinct user roles (Admin, Owner, User) with appropriate permissions
- **JWT Authentication**: Secure token-based authentication system
- **Store Management**: Complete CRUD operations for store entries
- **Rating System**: Allow users to rate stores and manage their ratings
- **Data Validation**: Comprehensive request validation using Zod schemas
- **Error Handling**: Consistent error responses and logging
- **PostgreSQL Database**: Reliable data storage with Prisma ORM
- **API Documentation**: Complete documentation of all endpoints

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Zod
- **Password Security**: bcrypt

## Architecture

The application follows a modular architecture:

```
backend/
├── prisma/              # Database schema and migrations
├── src/
│   ├── controllers/     # Request handlers for business logic
│   ├── middleware/      # Authentication, validation, error handling
│   ├── routes/          # API endpoint definitions
│   ├── utils/           # Helper utilities
│   ├── generated/       # Generated Prisma client
│   └── server.js        # Express server configuration
└── index.js             # Entry point
```

### Key Components

- **Controllers**: Handle business logic and database operations
- **Middleware**: Process requests before they reach controllers
- **Routes**: Define API endpoints and connect them to controllers
- **Validation**: Ensure data integrity and security

## Database Schema

### User Model

```prisma
model User {
  id        String    @id @default(uuid())
  name      String    @db.VarChar(60)
  email     String    @unique
  password  String
  address   String    @db.VarChar(400)
  role      Role      @default(USER)
  store     Store?
  ratings   Rating[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}
```

### Store Model

```prisma
model Store {
  id          String    @id @default(uuid())
  name        String    @db.VarChar(60)
  address     String    @db.VarChar(400)
  contactEmail String   
  ownerId     String    @unique
  owner       User      @relation(fields: [ownerId], references: [id])
  ratings     Rating[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

### Rating Model

```prisma
model Rating {
  id        String    @id @default(uuid())
  value     Int       @db.SmallInt
  comment   String?   @db.VarChar(500)
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  storeId   String
  store     Store     @relation(fields: [storeId], references: [id])
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@unique([userId, storeId])
}
```

## API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Access | Request Body | Response |
|--------|----------|-------------|--------|-------------|----------|
| POST | `/api/auth/register` | Register a new user | Public | `{ name, email, password, address }` | `{ user, token }` |
| POST | `/api/auth/login` | User login | Public | `{ email, password }` | `{ user, token }` |
| GET | `/api/auth/me` | Get current user | Authenticated | - | `{ user }` |
| GET | `/api/auth/profile` | Get detailed user profile | Authenticated | - | User profile with stats |
| PATCH | `/api/auth/profile` | Update user profile | Authenticated | `{ name?, email?, address? }` | Updated user |
| PATCH | `/api/auth/password` | Update password | Authenticated | `{ currentPassword, newPassword }` | Success message |

### Admin Endpoints

| Method | Endpoint | Description | Access | Request Body | Response |
|--------|----------|-------------|--------|-------------|----------|
| GET | `/api/admin/dashboard` | Get admin statistics | Admin | - | Dashboard stats |
| GET | `/api/admin/users` | Get all users | Admin | - | List of users |
| POST | `/api/admin/users` | Create a user | Admin | User data | Created user |
| GET | `/api/admin/users/:id` | Get user by ID | Admin | - | User details |
| PATCH | `/api/admin/users/:id` | Update a user | Admin | Updated fields | Updated user |
| DELETE | `/api/admin/users/:id` | Delete a user | Admin | - | Success message |
| GET | `/api/admin/stores` | Get all stores | Admin | - | List of stores |
| POST | `/api/admin/stores` | Create store with owner | Admin | Store and owner data | Created store |
| GET | `/api/admin/stores/:id` | Get store by ID | Admin | - | Store details |
| PATCH | `/api/admin/stores/:id` | Update a store | Admin | Updated fields | Updated store |
| DELETE | `/api/admin/stores/:id` | Delete a store | Admin | - | Success message |

### Owner Endpoints

| Method | Endpoint | Description | Access | Request Body | Response |
|--------|----------|-------------|--------|-------------|----------|
| GET | `/api/owner/dashboard` | Get owner dashboard | Owner | - | Dashboard stats |
| GET | `/api/owner/store` | Get owner's store | Owner | - | Store details |
| GET | `/api/owner/ratings` | Get store ratings | Owner | - | List of ratings |

### User Endpoints

| Method | Endpoint | Description | Access | Request Body | Response |
|--------|----------|-------------|--------|-------------|----------|
| GET | `/api/user/activity` | Get user activity | User | - | Activity data |
| POST | `/api/user/stores/:id/ratings` | Create rating | User | `{ value, comment }` | Created rating |
| GET | `/api/user/ratings` | Get user ratings | User | - | List of ratings |
| GET | `/api/user/ratings/:id` | Get rating by ID | User | - | Rating details |
| PATCH | `/api/user/ratings/:id` | Update rating | User (owner) | Updated fields | Updated rating |
| DELETE | `/api/user/ratings/:id` | Delete rating | User (owner) | - | Success message |

### Public Endpoints

| Method | Endpoint | Description | Access | Request Body | Response |
|--------|----------|-------------|--------|-------------|----------|
| GET | `/api/public/stores` | Get public stores | Public | - | List of stores |
| GET | `/api/public/stores/:id` | Get store by ID | Public | - | Store details |
| GET | `/api/public/store-rating/:storeId` | Get user rating for store | Authenticated | - | Rating or 404 |

## Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. **Token Generation**: Created upon successful login/registration
2. **Token Format**: Bearer token in Authorization header
3. **Token Payload**: Contains user ID, email, and role
4. **Token Expiration**: 24 hours

### Authentication Flow

```
┌─────────┐     ┌────────────────┐     ┌─────────────────┐
│  Login  │────▶│ JWT Generated  │────▶│ Token Returned  │
└─────────┘     └────────────────┘     └─────────────────┘
                                              │
                                              ▼
┌─────────────────┐     ┌────────────────┐    ┌─────────────────┐
│ Protected Route │◀───▶│ Verify Token   │◀───│ Include Token   │
└─────────────────┘     └────────────────┘    └─────────────────┘
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/rating-backend.git
   cd rating-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/rating_db"
   JWT_SECRET="your-secure-jwt-secret"
   PORT=5000
   ```

4. Run database migrations:
   ```bash
   npm run prisma:migrate
   ```

5. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

## Development

### Running in Development Mode

```bash
npm run dev
```

### Database Management

- Generate Prisma client: `npm run prisma:generate`
- Run migrations: `npm run prisma:migrate`
- Reset database: `npx prisma migrate reset`

## Testing

1. Create a `.env.test` file with test database configuration
2. Run tests:
   ```bash
   npm test
   ```

## Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Set production environment variables
3. Start the production server:
   ```bash
   npm start
   ```

## License

This project is licensed under the MIT License.
