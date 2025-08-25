import prisma from '../utils/prisma.js';
import bcrypt from 'bcrypt';

/**
 * Get dashboard statistics for admin
 */
export const getAdminStats = async (req, res) => {
  try {
    const [userCount, storeCount, ratingCount, recentUsers, recentStores] = await Promise.all([
      prisma.user.count(),
      prisma.store.count(),
      prisma.rating.count(),
      // Get last 5 users
      prisma.user.findMany({
        take: 5,
        where: { role: { in: ['USER', 'ADMIN'] } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          address: true,
          createdAt: true
        }
      }),
      // Get last 5 stores
      prisma.store.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          address: true,
          contactEmail: true,
          createdAt: true,
          owner: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })
    ]);
    
    res.json({
      stats: {
        users: userCount,
        stores: storeCount,
        ratings: ratingCount
      },
      recentUsers,
      recentStores
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
    const filter = {
      role: { in: ['USER', 'ADMIN'] }
    };
    if (name) filter.name = { contains: name, mode: 'insensitive' };
    if (email) filter.email = { contains: email, mode: 'insensitive' };
    if (address) filter.address = { contains: address, mode: 'insensitive' };
    if (role && (role === 'USER' || role === 'ADMIN')) filter.role = role;

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

/**
 * Create a store with an owner in a single operation
 * Creates a new user with OWNER role and associates it with a new store
 */
export const createStoreWithOwner = async (req, res) => {
  try {
    const { store, owner } = req.body;
    
    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: owner.email }
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Using transaction to ensure both operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(owner.password, saltRounds);
      
      // Create the owner with OWNER role
      const newOwner = await tx.user.create({
        data: {
          name: owner.name,
          email: owner.email,
          password: hashedPassword,
          address: owner.address,
          role: 'OWNER'
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          address: true,
          createdAt: true
        }
      });
      
      // Create the store and link it to the owner
      const newStore = await tx.store.create({
        data: {
          name: store.name,
          address: store.address,
          contactEmail: store.contactEmail,
          ownerId: newOwner.id
        },
        select: {
          id: true,
          name: true,
          contactEmail: true,
          address: true,
          createdAt: true
        }
      });
      
      return { owner: newOwner, store: newStore };
    });
    
    res.status(201).json({
      message: 'Store and owner created successfully',
      data: result
    });
  } catch (error) {
    console.error('Error creating store with owner:', error);
    res.status(500).json({ message: 'Failed to create store with owner' });
  }
};

/**
 * Update a user's details
 * Admin can update name, email, address, and role
 */
export const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, address, role } = req.body;
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // If email is being changed, check if the new email is already in use
    if (email && email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already in use by another user' });
      }
    }
    
    // Prepare update data
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (address) updateData.address = address;
    if (role) updateData.role = role;
    
    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
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
    
    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
};
