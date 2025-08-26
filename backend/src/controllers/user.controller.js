import prisma from '../utils/prisma.js';

/**
 * Get user's rating activity
 */
export const getUserActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    // Parse page and limit to integers
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const totalCount = await prisma.rating.count({
      where: { userId: userId }
    });

    // Get user's ratings with store details
    const ratings = await prisma.rating.findMany({
      where: { userId: userId },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      totalCount,
      page: pageNum,
      totalPages,
      ratings
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ message: 'Failed to fetch user activity' });
  }
};

/**
 * List all available stores with filtering and pagination
 */
export const getAllStores = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = 'name_asc',
      minRating,
      maxRating,
      search
    } = req.query;

    // Parse page and limit to integers
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filter object
    const filter = {};

    // Add search filter if provided
    if (search) {
      filter.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Determine sorting
    let orderBy = {};
    switch (sort) {
      case 'name_asc':
        orderBy = { name: 'asc' };
        break;
      case 'name_desc':
        orderBy = { name: 'desc' };
        break;
      case 'rating_highest':
        // Will handle this after query
        orderBy = { name: 'asc' }; // Default sort for now
        break;
      case 'rating_lowest':
        // Will handle this after query
        orderBy = { name: 'asc' }; // Default sort for now
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      default:
        orderBy = { name: 'asc' };
    }

    // Get total count
    const totalCount = await prisma.store.count({ where: filter });

    // Get stores with rating information
    const stores = await prisma.store.findMany({
      where: filter,
      select: {
        id: true,
        name: true,
        address: true,
        contactEmail: true,
        createdAt: true,
        ratings: {
          select: {
            value: true
          }
        }
      },
      orderBy,
      skip,
      take: limitNum
    });

    // Calculate average rating for each store
    const storesWithRatings = stores.map(store => {
      const ratings = store.ratings;
      const totalRatings = ratings.length;
      const avgRating = totalRatings > 0
        ? parseFloat((ratings.reduce((sum, r) => sum + r.value, 0) / totalRatings).toFixed(1))
        : 0;

      return {
        ...store,
        ratingStats: {
          count: totalRatings,
          average: avgRating
        },
        ratings: undefined // Remove the ratings array
      };
    });

    // Handle rating-based sorting
    let sortedStores = storesWithRatings;
    if (sort === 'rating_highest') {
      sortedStores = storesWithRatings.sort((a, b) => b.ratingStats.average - a.ratingStats.average);
    } else if (sort === 'rating_lowest') {
      sortedStores = storesWithRatings.sort((a, b) => a.ratingStats.average - b.ratingStats.average);
    }

    // Filter by rating if specified
    if (minRating || maxRating) {
      sortedStores = sortedStores.filter(store => {
        const rating = store.ratingStats.average;
        if (minRating && maxRating) {
          return rating >= Number(minRating) && rating <= Number(maxRating);
        } else if (minRating) {
          return rating >= Number(minRating);
        } else if (maxRating) {
          return rating <= Number(maxRating);
        }
        return true;
      });
    }

    // Calculate total pages based on filtered results
    const filteredCount = sortedStores.length;
    const totalPages = Math.ceil(filteredCount / limitNum);

    res.json({
      totalCount: filteredCount,
      page: pageNum,
      totalPages,
      stores: sortedStores,
      filters: {
        applied: {
          minRating: minRating ? Number(minRating) : undefined,
          maxRating: maxRating ? Number(maxRating) : undefined,
          search
        },
        availableSorts: [
          'name_asc',
          'name_desc',
          'rating_highest',
          'rating_lowest',
          'newest'
        ]
      }
    });
  } catch (error) {
    console.error('Error fetching stores:', error);
    res.status(500).json({ message: 'Failed to fetch stores', error: error.message });
  }
};

/**
 * Get detailed information about a specific store
 */
export const getStoreById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get store with ratings
    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        ratings: {
          select: {
            id: true,
            value: true,
            comment: true,
            createdAt: true,
            userId: true,
            user: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        owner: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    // Calculate rating statistics
    const allRatings = await prisma.rating.findMany({
      where: { storeId: id },
      select: { value: true }
    });

    const totalRatings = allRatings.length;
    const avgRating = totalRatings > 0
      ? parseFloat((allRatings.reduce((sum, r) => sum + r.value, 0) / totalRatings).toFixed(1))
      : 0;

    // Check if user has already rated this store
    const userRating = await prisma.rating.findFirst({
      where: {
        storeId: id,
        userId: userId
      },
      select: {
        id: true,
        value: true,
        comment: true,
        createdAt: true
      }
    });

    // Calculate rating distribution
    const distribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };

    allRatings.forEach(rating => {
      distribution[rating.value]++;
    });

    // Format response
    const response = {
      id: store.id,
      name: store.name,
      address: store.address,
      contactEmail: store.contactEmail,
      owner: store.owner,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
      ratingStats: {
        average: avgRating,
        total: totalRatings,
        distribution
      },
      recentRatings: store.ratings,
      userRating
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching store details:', error);
    res.status(500).json({ message: 'Failed to fetch store details' });
  }
};

/**
 * Submit a new rating for a store
 */
export const createRating = async (req, res) => {
  try {
    const { id: storeId } = req.params;
    const userId = req.user.id;
    const { value, comment } = req.validatedData;

    // Check if store exists
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true }
    });

    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    // Check if user already rated this store
    const existingRating = await prisma.rating.findFirst({
      where: {
        storeId,
        userId
      }
    });

    if (existingRating) {
      return res.status(400).json({ 
        message: 'You have already rated this store. Please update your existing rating instead.' 
      });
    }

    // Create the rating
    const rating = await prisma.rating.create({
      data: {
        value,
        comment,
        store: {
          connect: { id: storeId }
        },
        user: {
          connect: { id: userId }
        }
      }
    });

    res.status(201).json({
      message: 'Rating submitted successfully',
      rating
    });
  } catch (error) {
    console.error('Error creating rating:', error);
    res.status(500).json({ message: 'Failed to create rating' });
  }
};

/**
 * Get all ratings created by the user
 */
export const getUserRatings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, sort = 'newest' } = req.query;

    // Parse page and limit to integers
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Determine sorting
    let orderBy = {};
    switch (sort) {
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'highest':
        orderBy = { value: 'desc' };
        break;
      case 'lowest':
        orderBy = { value: 'asc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    // Get total count
    const totalCount = await prisma.rating.count({
      where: { userId }
    });

    // Get ratings with store details
    const ratings = await prisma.rating.findMany({
      where: { userId },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      },
      orderBy,
      skip,
      take: limitNum
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      totalCount,
      page: pageNum,
      totalPages,
      ratings,
      filters: {
        availableSorts: ['newest', 'oldest', 'highest', 'lowest']
      }
    });
  } catch (error) {
    console.error('Error fetching user ratings:', error);
    res.status(500).json({ message: 'Failed to fetch user ratings' });
  }
};

/**
 * Get detailed information about a specific rating
 */
export const getRatingById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get rating with store details
    const rating = await prisma.rating.findUnique({
      where: { id },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            address: true,
            contactEmail: true
          }
        }
      }
    });

    if (!rating) {
      return res.status(404).json({ message: 'Rating not found' });
    }

    // Check if user is authorized to view detailed rating info
    if (rating.userId !== userId) {
      // For non-owners, only return basic public info
      return res.status(403).json({ 
        message: 'You can only view detailed information for your own ratings' 
      });
    }

    res.json(rating);
  } catch (error) {
    console.error('Error fetching rating details:', error);
    res.status(500).json({ message: 'Failed to fetch rating details' });
  }
};

/**
 * Update an existing rating
 */
export const updateRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { value, comment } = req.validatedData;

    // Create update object with only provided fields
    const updateData = {};
    if (value !== undefined) updateData.value = value;
    if (comment !== undefined) updateData.comment = comment;

    // Update rating
    const updatedRating = await prisma.rating.update({
      where: { id },
      data: updateData
    });

    res.json({
      message: 'Rating updated successfully',
      rating: updatedRating
    });
  } catch (error) {
    console.error('Error updating rating:', error);
    res.status(500).json({ message: 'Failed to update rating' });
  }
};

/**
 * Delete a rating
 */
export const deleteRating = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete rating
    await prisma.rating.delete({
      where: { id }
    });

    res.json({ message: 'Rating deleted successfully' });
  } catch (error) {
    console.error('Error deleting rating:', error);
    res.status(500).json({ message: 'Failed to delete rating' });
  }
};
