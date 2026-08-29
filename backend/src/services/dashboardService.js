const repo = require('../repositories/dashboardRepository');

const getDashboardStats = async () => {
  const [apartmentCount, residentCount, occupancyCount, feedbackPending, feedbackResolved] =
    await repo.getStats();

  return {
    apartmentCount,
    residentCount,
    occupancyCount,
    feedback: {
      pending: feedbackPending,
      resolved: feedbackResolved,
    },
  };
};

module.exports = { getDashboardStats };
