// backend/src/state/trafficState.js
module.exports = {
  lanes: [
    { count: 0, green_time: 20 },
    { count: 0, green_time: 20 },
    { count: 0, green_time: 20 },
    { count: 0, green_time: 20 }
  ],
  currentGreen: 0,
  timeRemaining: 20,
  updatedAt: new Date().toISOString()
};
