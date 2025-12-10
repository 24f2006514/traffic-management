module.exports = function(payload) {
  if (!payload) return 'missing payload';
  if (!payload.incident) return 'missing incident';
  if (!payload.location) return 'missing location';
  return null;
};
