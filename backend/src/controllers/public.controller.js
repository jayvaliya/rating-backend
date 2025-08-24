import prisma from '../utils/prisma.js';

/**
 * List all available stores with filtering and pagination
 * This is the public version of the function that doesn't require authentication
 */
export const getPublicStores = async (req, res) => {
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
 * This is the public version of the function that doesn't require authentication
 */
export const getPublicStoreById = async (req, res) => {
  try {
    const { id } = req.params;

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
      // No userRating for public route
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching store details:', error);
    res.status(500).json({ message: 'Failed to fetch store details' });
  }
};
