// Redis/BullMQ ride timeout queue is temporarily disabled so the API server can
// run without Redis. Re-enable the BullMQ implementation when ride timeout jobs
// are needed again.

const disabledQueue = {
  add: async () => null,
  getDelayed: async () => [],
  clean: async () => null,
};

export const getRideTimeoutQueue = () => disabledQueue;

// Backwards compatibility for existing code that calls getRideTimeoutQueue.getDelayed().
getRideTimeoutQueue.getDelayed = disabledQueue.getDelayed;

export const addRideTimeoutJob = async (rideId, delay = 60000) => {
  console.log(
    "Ride timeout queue disabled; skipping timeout job",
    "\nRide ID:", rideId,
    "\nDelay:", delay / 1000, "seconds"
  );

  return null;
};

export const cleanupQueue = async () => null;
