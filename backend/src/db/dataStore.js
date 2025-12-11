// db/dataStore.js
let _alerts = [];
let _latest = null;
let _emergencyRoutes = [];

exports.saveAlert = function (payload) {
  const entry = Object.assign({}, payload, { 
    id: _alerts.length + 1, 
    ts: Date.now() 
  });
  _alerts.push(entry);
  _latest = entry;
  return entry;
};

exports.getAlerts = function () {
  return _alerts.slice();
};

exports.getLatest = function () {
  return _latest;
};

// Emergency Routes
exports.saveEmergencyRoute = function (payload) {
  const entry = Object.assign({}, payload, { 
    id: _emergencyRoutes.length + 1, 
    ts: Date.now() 
  });
  _emergencyRoutes.push(entry);
  return entry;
};

exports.getEmergencyRoutes = function () {
  return _emergencyRoutes.slice();
};

exports.deleteEmergencyRoute = function (id) {
  const index = _emergencyRoutes.findIndex(r => r.id === id);
  if (index !== -1) {
    _emergencyRoutes.splice(index, 1);
    return true;
  }
  return false;
};