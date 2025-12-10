const validate = require('../utils/validatePayload');
const store = require('../db/dataStore');

exports.createAlert = (req, res) => {
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });

  const saved = store.saveAlert(req.body);

  const io = req.app.get('io');
  if (io) io.emit('alert', saved);

  return res.status(201).json(saved);
};
