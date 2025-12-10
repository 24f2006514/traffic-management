let _alerts = [];
let _latest = null;

exports.saveAlert = function(payload) {
  const entry = Object.assign({}, payload, { id: _alerts.length + 1, ts: Date.now() });
  _alerts.push(entry);
  _latest = entry;
  return entry;
};

exports.getAlerts = function() {
  return _alerts.slice();
};

exports.getLatest = function() {
  return _latest;
};
