import prisma from '../utils/prisma.js';

/**
 * Get dashboard statistics and information for store owner
 */
export const getOwnerDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get the owner's store
    const store = await prisma.store.findUnique({
      where: { ownerId: userId },
      select: {
        id: true,
        name: true,
        address: true,
        contactEmail: true,
        createdAt: true,
        ratings: {
          select: {
            id: true,
            value: true,
            createdAt: true,
            userId: true,
            user: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        }
      }
    });

    if (!store) {
      return res.status(404).json({ message: 'Store not found for this owner' });
    }

    // Calculate rating statistics
    const allRatings = await prisma.rating.findMany({
      where: { storeId: store.id },
      select: {
        value: true,
        createdAt: true
      }
    });

    // Calculate average rating
    const totalRatings = allRatings.length;
    const sumRatings = allRatings.reduce((sum, rating) => sum + rating.value, 0);
    const averageRating = totalRatings > 0 ? parseFloat((sumRatings / totalRatings).toFixed(1)) : 0;

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

    // Get rating trend (past 6 months)
    const today = new Date();
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(today.getMonth() - 6);

    // Group ratings by month
    const monthlyRatings = {};
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];

    allRatings.forEach(rating => {
      const date = new Date(rating.createdAt);
      if (date >= sixMonthsAgo) {
        const monthYear = `${months[date.getMonth()]} ${date.getFullYear()}`;
        if (!monthlyRatings[monthYear]) {
          monthlyRatings[monthYear] = {
            month: months[date.getMonth()],
            year: date.getFullYear(),
            total: 0,
            count: 0
          };
        }
        monthlyRatings[monthYear].total += rating.value;
        monthlyRatings[monthYear].count++;
      }
    });

    // Calculate monthly averages
    const ratingTrend = Object.values(monthlyRatings).map(item => ({
      month: item.month,
      year: item.year,
      average: parseFloat((item.total / item.count).toFixed(1)),
      count: item.count
    })).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return months.indexOf(a.month) - months.indexOf(b.month);
    });

    // Format response
    const response = {
      storeInfo: {
        id: store.id,
        name: store.name,
        address: store.address,
        contactEmail: store.contactEmail,
        createdAt: store.createdAt
      },
      ratingStats: {
        averageRating,
        totalRatings,
        distribution
      },
      recentActivity: {
        latestRatings: store.ratings.map(rating => ({
          id: rating.id,
          value: rating.value,
          createdAt: rating.createdAt,
          user: {
            id: rating.user.id,
            name: rating.user.name
          }
        })),
        ratingTrend
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching owner dashboard:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
};

/**
 * Get owner's store details
 */
export const getOwnerStore = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get the owner's store with comprehensive details
    const store = await prisma.store.findUnique({
      where: { ownerId: userId },
      include: {
        ratings: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!store) {
      return res.status(404).json({ message: 'Store not found for this owner' });
    }

    // Calculate rating statistics
    const totalRatings = store.ratings.length;
    const sumRatings = store.ratings.reduce((sum, rating) => sum + rating.value, 0);
    const averageRating = totalRatings > 0 ? parseFloat((sumRatings / totalRatings).toFixed(1)) : 0;

    // Format response
    const response = {
      id: store.id,
      name: store.name,
      address: store.address,
      contactEmail: store.contactEmail,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
      owner: store.owner,
      ratings: {
        count: totalRatings,
        average: averageRating
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching store details:', error);
    res.status(500).json({ message: 'Failed to fetch store details' });
  }
};

/**
 * Get ratings for owner's store with filtering, sorting and pagination
 */
export const getStoreRatings = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 10,
      sort = 'date_newest',
      minRating,
      maxRating,
      dateFrom,
      dateTo,
      search
    } = req.query;

    // Parse page and limit to integers
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Find the owner's store
    const store = await prisma.store.findUnique({
      where: { ownerId: userId },
      select: { id: true }
    });

    if (!store) {
      return res.status(404).json({ message: 'Store not found for this owner' });
    }

    // Build filter object
    const filter = {
      storeId: store.id
    };

    // Add rating range filter if provided
    if (minRating !== undefined) {
      filter.value = {
        ...filter.value,
        gte: parseInt(minRating, 10)
      };
    }

    if (maxRating !== undefined) {
      filter.value = {
        ...filter.value,
        lte: parseInt(maxRating, 10)
      };
    }

    // Add date range filter if provided
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      
      if (dateFrom) {
        filter.createdAt.gte = new Date(dateFrom);
      }
      
      if (dateTo) {
        filter.createdAt.lte = new Date(dateTo);
      }
    }

    // Determine sorting
    let orderBy = {};
    switch (sort) {
      case 'date_newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'date_oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'rating_highest':
        orderBy = { value: 'desc' };
        break;
      case 'rating_lowest':
        orderBy = { value: 'asc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    // If search is provided, add user name filter
    let userFilter = {};
    if (search) {
      userFilter = {
        name: {
          contains: search,
          mode: 'insensitive'
        }
      };
    }

    // Count total ratings matching the filter
    const totalCount = await prisma.rating.count({
      where: {
        ...filter,
        user: userFilter
      }
    });

    // Get ratings with pagination
    const ratings = await prisma.rating.findMany({
      where: {
        ...filter,
        user: userFilter
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy,
      skip,
      take: limitNum
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limitNum);

    // Calculate average rating
    const allRatings = await prisma.rating.findMany({
      where: { storeId: store.id },
      select: { value: true }
    });
    
    const sumRatings = allRatings.reduce((sum, rating) => sum + rating.value, 0);
    const averageRating = allRatings.length > 0 ? parseFloat((sumRatings / allRatings.length).toFixed(1)) : 0;

    // Format response
    const response = {
      totalCount,
      averageRating,
      page: pageNum,
      totalPages,
      ratings,
      filters: {
        applied: {
          minRating: minRating ? parseInt(minRating, 10) : undefined,
          maxRating: maxRating ? parseInt(maxRating, 10) : undefined,
          dateFrom: dateFrom ? new Date(dateFrom) : undefined,
          dateTo: dateTo ? new Date(dateTo) : undefined,
          search
        },
        availableSorts: [
          'date_newest',
          'date_oldest',
          'rating_highest',
          'rating_lowest'
        ]
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching store ratings:', error);
    res.status(500).json({ message: 'Failed to fetch ratings', error: error.message });
  }
};
