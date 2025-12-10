const express = require('express');
const router = express.Router();
const trafficController = require('../controllers/trafficController');

router.get('/status', trafficController.getStatus);

module.exports = router;
