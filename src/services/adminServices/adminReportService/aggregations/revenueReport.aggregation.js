import { Driver } from "../../../../models/driver/driver.model.js";

export const getRevenueAggregation = async () => {
  return Driver.aggregate([
    {
      $group: {
        _id: null,

        totalRevenue: {
          $sum: "$earnings.totalEarnings",
        },

        totalDriverPayout: {
          $sum: "$earnings.totalDriverPayout",
        },

        totalPlatformFee: {
          $sum: "$earnings.totalPlatformFee",
        },
      },
    },
  ]);
};