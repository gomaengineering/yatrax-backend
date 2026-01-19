// controllers/admin/adminStatsController.js
import User from "../../models/userModel.js";
import Guide from "../../models/guideModel.js";
import Trail from "../../models/trailModel.js";

// GET DASHBOARD STATISTICS
export const getDashboardStats = async (req, res) => {
  try {
    // Get counts
    const totalUsers = await User.countDocuments();
    const totalGuides = await Guide.countDocuments();
    const totalTrails = await Trail.countDocuments();

    // Get active counts
    const activeUsers = await User.countDocuments({ subscription: "premium" });
    const activeGuides = await Guide.countDocuments({ role: "guide" });
    const activeTrails = await Trail.countDocuments({ isActive: true });

    // Get users by role
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get users by subscription
    const usersBySubscription = await User.aggregate([
      {
        $group: {
          _id: "$subscription",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get trails by difficulty
    const trailsByDifficulty = await Trail.aggregate([
      {
        $group: {
          _id: "$difficulty",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    const recentGuides = await Guide.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    const recentTrails = await Trail.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Get guides by experience level (grouped)
    const guidesByExperience = await Guide.aggregate([
      {
        $bucket: {
          groupBy: "$experience",
          boundaries: [0, 1, 3, 5, 10, 20, 100],
          default: "20+",
          output: {
            count: { $sum: 1 },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        overview: {
          totalUsers,
          totalGuides,
          totalTrails,
          activeUsers,
          activeGuides,
          activeTrails,
        },
        recentActivity: {
          recentUsers,
          recentGuides,
          recentTrails,
          period: "last 30 days",
        },
        breakdowns: {
          usersByRole: usersByRole.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          usersBySubscription: usersBySubscription.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          trailsByDifficulty: trailsByDifficulty.reduce((acc, item) => {
            acc[item._id || "unknown"] = item.count;
            return acc;
          }, {}),
          guidesByExperience: guidesByExperience,
        },
      },
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

