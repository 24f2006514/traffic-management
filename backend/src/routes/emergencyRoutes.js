const express = require('express');
const router = express.Router();
const emergencyRouteController = require('../controllers/emergencyRouteController');
const { authenticate } = require('../middleware/auth');

// All emergency route endpoints require authentication
router.use(authenticate);

router.post('/', emergencyRouteController.createEmergencyRoute);
router.get('/', emergencyRouteController.getEmergencyRoutes);
router.delete('/:id', emergencyRouteController.deleteEmergencyRoute);

module.exports = router;

