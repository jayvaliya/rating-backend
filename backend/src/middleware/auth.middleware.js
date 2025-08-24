import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';

// JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Middleware to authenticate JWT token
const verifyToken = async (req, res, next) => {
  // Get the token from the Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN format
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        role: true, 
        address: true 
      }
    });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token. User not found.' });
    }
    
    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token.' });
  }
};

// Role-based authorization middleware
const authorize = (roles = []) => {
  // Convert string to array if only one role
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    // Check if user exists and has the required role
    if (!req.user || (roles.length && !roles.includes(req.user.role))) {
      return res.status(403).json({ 
        message: 'Forbidden: You do not have permission to access this resource' 
      });
    }
    
    next();
  };
};

export {
  verifyToken,
  authorize
};
