import prisma from '../utils/prisma.js';
import bcrypt from 'bcrypt';

/**
 * Get dashboard statistics for admin
 */
export const getAdminStats = async (req, res) => {
  try {
    const [userCount, storeCount, ratingCount] = await Promise.all([
      prisma.user.count(),
      prisma.store.count(),
      prisma.rating.count()
    ]);
    
    res.json({
      users: userCount,
      stores: storeCount,
      ratings: ratingCount
    });
  } catch (error) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
};

/**
 * Get list of all users with filters
 */
export const getAllUsers = async (req, res) => {
  try {
    const { name, email, address, role, sort, order } = req.query;
    
    // Build filter object based on provided query parameters
    const filter = {};
    if (name) filter.name = { contains: name, mode: 'insensitive' };
    if (email) filter.email = { contains: email, mode: 'insensitive' };
    if (address) filter.address = { contains: address, mode: 'insensitive' };
    if (role) filter.role = role;
    
    // Get users based on filters
    const users = await prisma.user.findMany({
      where: filter,
      select: {
        id: true,
        name: true,
        email: true,
        address: true,
        role: true,
        store: {
          select: {
            id: true,
            name: true,
            ratings: {
              select: {
                value: true
              }
            }
          }
        },
        createdAt: true,
        updatedAt: true
      },
      orderBy: sort ? { [sort]: order || 'asc' } : { createdAt: 'desc' }
    });
    
    // Calculate average rating for store owners
    const usersWithRating = users.map(user => {
      // Only process store owners
      if (user.role === 'OWNER' && user.store) {
        const totalRatings = user.store.ratings.length;
        const sumRatings = user.store.ratings.reduce((sum, rating) => sum + rating.value, 0);
        const avgRating = totalRatings > 0 ? sumRatings / totalRatings : 0;
        
        return {
          ...user,
          store: {
            ...user.store,
            averageRating: parseFloat(avgRating.toFixed(1)),
            totalRatings
          }
        };
      }
      return user;
    });
    
    res.json(usersWithRating);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

/**
 * Create a new user (admin only)
 */
export const createUser = async (req, res) => {
  try {
    const { name, email, password, address, role } = req.body;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create the user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        address,
        role: role || 'USER'
      },
      select: {
        id: true,
        name: true,
        email: true,
        address: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
};

/**
 * Get a single user by ID
 */
export const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        address: true,
        role: true,
        store: true,
        ratings: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // If user is a store owner, calculate their store's average rating
    if (user.role === 'OWNER' && user.store) {
      const ratings = await prisma.rating.findMany({
        where: { storeId: user.store.id },
        select: { value: true }
      });
      
      const totalRatings = ratings.length;
      const sumRatings = ratings.reduce((sum, rating) => sum + rating.value, 0);
      const avgRating = totalRatings > 0 ? sumRatings / totalRatings : 0;
      
      user.store.averageRating = parseFloat(avgRating.toFixed(1));
      user.store.totalRatings = totalRatings;
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
};

/**
 * Update user role
 */
export const updateUserRole = async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Failed to update user role' });
  }
};

/**
 * Delete a user
 */
export const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        store: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // If user is a store owner, prevent deletion if store exists
    if (user.store) {
      return res.status(400).json({ 
        message: 'Cannot delete user with an associated store. Delete the store first or transfer ownership.'
      });
    }
    
    // Delete user's ratings
    await prisma.rating.deleteMany({
      where: { userId }
    });
    
    // Delete user
    await prisma.user.delete({
      where: { id: userId }
    });
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

/**
 * Store management functions
 */

/**
 * Get all stores with filters and sorting
 */
export const getAllStores = async (req, res) => {
  try {
    const { name, email, address, minRating, maxRating, sort, order } = req.query;
    
    // Build filter object based on provided query parameters
    const filter = {};
    
    if (name) filter.name = { contains: name, mode: 'insensitive' };
    if (address) filter.address = { contains: address, mode: 'insensitive' };
    
    // Get stores with filters
    const stores = await prisma.store.findMany({
      where: filter,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        ratings: {
          select: {
            value: true
          }
        }
      },
      orderBy: sort ? { [sort]: order || 'asc' } : { createdAt: 'desc' }
    });
    
    // Filter by owner email if provided
    let filteredStores = stores;
    if (email) {
      filteredStores = filteredStores.filter(store => 
        store.owner.email.toLowerCase().includes(email.toLowerCase())
      );
    }
    
    // Calculate average rating for each store
    const storesWithRating = filteredStores.map(store => {
      const totalRatings = store.ratings.length;
      const sumRatings = store.ratings.reduce((sum, rating) => sum + rating.value, 0);
      const avgRating = totalRatings > 0 ? sumRatings / totalRatings : 0;
      
      return {
        ...store,
        averageRating: parseFloat(avgRating.toFixed(1)),
        totalRatings
      };
    });
    
    // Filter by rating if specified
    let ratingFilteredStores = storesWithRating;
    if (minRating) {
      ratingFilteredStores = ratingFilteredStores.filter(store => 
        store.averageRating >= parseFloat(minRating)
      );
    }
    if (maxRating) {
      ratingFilteredStores = ratingFilteredStores.filter(store => 
        store.averageRating <= parseFloat(maxRating)
      );
    }
    
    res.json(ratingFilteredStores);
  } catch (error) {
    console.error('Error getting stores:', error);
    res.status(500).json({ message: 'Failed to fetch stores' });
  }
};

/**
 * Create a new store
 */
export const createStore = async (req, res) => {
  try {
    const { name, address, contactEmail, ownerId } = req.body;
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: ownerId }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is already associated with a store
    const existingStore = await prisma.store.findUnique({
      where: { ownerId }
    });
    
    if (existingStore) {
      return res.status(400).json({ 
        message: 'This user is already a store owner. One user can only own one store.'
      });
    }
    
    // Create the store
    const store = await prisma.store.create({
      data: {
        name,
        address,
        contactEmail,
        ownerId
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Update user role to OWNER if not already
    if (user.role !== 'OWNER') {
      await prisma.user.update({
        where: { id: ownerId },
        data: { role: 'OWNER' }
      });
    }
    
    res.status(201).json(store);
  } catch (error) {
    console.error('Error creating store:', error);
    res.status(500).json({ message: 'Failed to create store' });
  }
};

/**
 * Get store by ID
 */
export const getStoreById = async (req, res) => {
  try {
    const storeId = req.params.id;
    
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        ratings: {
          select: {
            id: true,
            value: true,
            createdAt: true,
            updatedAt: true,
            userId: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });
    
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }
    
    // Calculate average rating
    const totalRatings = store.ratings.length;
    const sumRatings = store.ratings.reduce((sum, rating) => sum + rating.value, 0);
    const avgRating = totalRatings > 0 ? sumRatings / totalRatings : 0;
    
    const storeWithRating = {
      ...store,
      averageRating: parseFloat(avgRating.toFixed(1)),
      totalRatings
    };
    
    res.json(storeWithRating);
  } catch (error) {
    console.error('Error getting store:', error);
    res.status(500).json({ message: 'Failed to fetch store' });
  }
};

/**
 * Update a store
 */
export const updateStore = async (req, res) => {
  try {
    const storeId = req.params.id;
    const { name, address, contactEmail } = req.body;
    
    // Check if store exists
    const existingStore = await prisma.store.findUnique({
      where: { id: storeId }
    });
    
    if (!existingStore) {
      return res.status(404).json({ message: 'Store not found' });
    }
    
    // Update store
    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: {
        name,
        address,
        contactEmail
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    res.json(updatedStore);
  } catch (error) {
    console.error('Error updating store:', error);
    res.status(500).json({ message: 'Failed to update store' });
  }
};

/**
 * Delete a store
 */
export const deleteStore = async (req, res) => {
  try {
    const storeId = req.params.id;
    
    // Check if store exists
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: {
        owner: true
      }
    });
    
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }
    
    // Delete all ratings for the store
    await prisma.rating.deleteMany({
      where: { storeId }
    });
    
    // Delete the store
    await prisma.store.delete({
      where: { id: storeId }
    });
    
    // Update owner role back to USER if they don't have admin rights
    if (store.owner.role !== 'ADMIN') {
      await prisma.user.update({
        where: { id: store.ownerId },
        data: { role: 'USER' }
      });
    }
    
    res.json({ message: 'Store deleted successfully' });
  } catch (error) {
    console.error('Error deleting store:', error);
    res.status(500).json({ message: 'Failed to delete store' });
  }
};
