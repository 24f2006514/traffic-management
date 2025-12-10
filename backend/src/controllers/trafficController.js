const store = require('../db/dataStore');

exports.getStatus = (req, res) => {
  const latest = store.getLatest() || {};
  res.json({ vehicles: latest.vehicles || 0, latest });
};
